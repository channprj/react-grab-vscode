/**
 * Injected script that runs in the page context
 * Provides React component detection via fiber traversal
 * Similar to react-grab's approach
 */

(function() {
  'use strict';

  // React internal property prefixes (vary by React version)
  const FIBER_PREFIXES = [
    '__reactFiber$',
    '__reactInternalInstance$',
    '_reactRootContainer'
  ];

  // Components to exclude (internal/framework components)
  const EXCLUDED_COMPONENTS = [
    'Fragment',
    'Suspense',
    'StrictMode',
    'Profiler',
    'Provider',
    'Consumer',
    'Context',
    'Portal',
    'Boundary',
    'ErrorBoundary',
    'ForwardRef',
    'Memo',
    'Lazy',
  ];

  // Component name prefixes to exclude
  const EXCLUDED_PREFIXES = ['_', '$'];

  /**
   * Get React fiber from a DOM element
   */
  function getFiberFromElement(element) {
    if (!element) return null;

    for (const key of Object.keys(element)) {
      for (const prefix of FIBER_PREFIXES) {
        if (key.startsWith(prefix)) {
          return element[key];
        }
      }
    }
    return null;
  }

  /**
   * Check if a fiber is a valid user component (not internal)
   */
  function isValidComponent(fiber) {
    if (!fiber) return false;

    const type = fiber.type;
    if (!type) return false;

    // Must be a function component or class component
    if (typeof type !== 'function' && typeof type !== 'object') return false;

    const name = getComponentName(fiber);
    if (!name) return false;

    // Exclude internal components
    if (EXCLUDED_COMPONENTS.includes(name)) return false;

    // Exclude components starting with _ or $
    for (const prefix of EXCLUDED_PREFIXES) {
      if (name.startsWith(prefix)) return false;
    }

    // Must start with uppercase (React component convention)
    if (!/^[A-Z]/.test(name)) return false;

    return true;
  }

  /**
   * Get component name from fiber
   */
  function getComponentName(fiber) {
    if (!fiber) return null;

    const type = fiber.type;
    if (!type) return null;

    // Function or class component
    if (typeof type === 'function') {
      return type.displayName || type.name || null;
    }

    // ForwardRef, Memo, etc.
    if (typeof type === 'object') {
      if (type.displayName) return type.displayName;
      if (type.render?.displayName) return type.render.displayName;
      if (type.render?.name) return type.render.name;
      if (type.type?.displayName) return type.type.displayName;
      if (type.type?.name) return type.type.name;
    }

    return null;
  }

  /**
   * Traverse fiber tree upward to find component
   */
  function findComponentFiber(fiber, predicate) {
    let current = fiber;
    while (current) {
      if (predicate(current)) {
        return current;
      }
      current = current.return;
    }
    return null;
  }

  /**
   * Get source file info from fiber
   */
  function getSourceInfo(fiber) {
    if (!fiber) return null;

    // Try _debugSource (available in development mode)
    if (fiber._debugSource) {
      return {
        fileName: fiber._debugSource.fileName,
        lineNumber: fiber._debugSource.lineNumber,
        columnNumber: fiber._debugSource.columnNumber
      };
    }

    // Try walking up the tree
    let current = fiber;
    while (current) {
      if (current._debugSource) {
        return {
          fileName: current._debugSource.fileName,
          lineNumber: current._debugSource.lineNumber,
          columnNumber: current._debugSource.columnNumber
        };
      }
      current = current.return;
    }

    return null;
  }

  /**
   * Sanitize props for display
   */
  function sanitizeProps(props, maxDepth = 3) {
    if (!props || typeof props !== 'object') return {};

    const seen = new WeakSet();

    function sanitize(value, depth) {
      if (depth > maxDepth) return '[...]';
      if (value === null) return null;
      if (value === undefined) return undefined;

      if (typeof value === 'function') {
        return `ƒ ${value.name || 'anonymous'}()`;
      }

      if (typeof value === 'symbol') {
        return value.toString();
      }

      if (value instanceof Element || value instanceof Node) {
        return '[DOM]';
      }

      if (typeof value === 'object') {
        if (seen.has(value)) return '[Circular]';
        seen.add(value);

        // React element
        if (value.$$typeof) {
          const elementType = value.type;
          const typeName = typeof elementType === 'function'
            ? (elementType.displayName || elementType.name || 'Component')
            : (typeof elementType === 'string' ? elementType : 'Element');
          return `<${typeName} />`;
        }

        if (Array.isArray(value)) {
          if (value.length > 5) {
            return [...value.slice(0, 5).map(v => sanitize(v, depth + 1)), `...${value.length - 5} more`];
          }
          return value.map(v => sanitize(v, depth + 1));
        }

        const result = {};
        const keys = Object.keys(value).slice(0, 10);
        for (const key of keys) {
          if (!key.startsWith('_')) {
            try {
              result[key] = sanitize(value[key], depth + 1);
            } catch {
              result[key] = '[Error]';
            }
          }
        }
        if (Object.keys(value).length > 10) {
          result['...'] = `${Object.keys(value).length - 10} more`;
        }
        return result;
      }

      return value;
    }

    const result = {};
    for (const [key, value] of Object.entries(props)) {
      if (key !== 'children' && !key.startsWith('_')) {
        result[key] = sanitize(value, 0);
      }
    }
    return result;
  }

  /**
   * Get component info from an element
   */
  function getComponentInfo(element) {
    const fiber = getFiberFromElement(element);
    if (!fiber) return null;

    // Find the nearest valid component
    const componentFiber = findComponentFiber(fiber, isValidComponent);
    if (!componentFiber) return null;

    const name = getComponentName(componentFiber);
    if (!name) return null;

    const sourceInfo = getSourceInfo(componentFiber);
    const props = componentFiber.memoizedProps
      ? sanitizeProps(componentFiber.memoizedProps)
      : {};

    return {
      name,
      props,
      source: sourceInfo,
      fiber: componentFiber
    };
  }

  /**
   * Find all parent components of an element
   */
  function getComponentStack(element) {
    const fiber = getFiberFromElement(element);
    if (!fiber) return [];

    const stack = [];
    let current = fiber;

    while (current) {
      if (isValidComponent(current)) {
        const name = getComponentName(current);
        if (name && !stack.some(s => s.name === name)) {
          const sourceInfo = getSourceInfo(current);
          stack.push({
            name,
            source: sourceInfo
          });
        }
      }
      current = current.return;
    }

    return stack;
  }

  /**
   * Generate JSX representation
   */
  function generateJSX(element, componentInfo) {
    const tagName = componentInfo?.name || element.tagName.toLowerCase();
    const props = componentInfo?.props || {};

    let jsx = `<${tagName}`;

    for (const [key, value] of Object.entries(props)) {
      if (typeof value === 'string') {
        jsx += ` ${key}="${value}"`;
      } else if (typeof value === 'boolean' && value) {
        jsx += ` ${key}`;
      } else if (typeof value === 'number') {
        jsx += ` ${key}={${value}}`;
      } else if (typeof value === 'function' || (typeof value === 'string' && value.startsWith('ƒ '))) {
        jsx += ` ${key}={...}`;
      } else if (value !== null && value !== undefined) {
        const str = JSON.stringify(value);
        if (str.length < 50) {
          jsx += ` ${key}={${str}}`;
        } else {
          jsx += ` ${key}={...}`;
        }
      }
    }

    const textContent = element.textContent?.trim();
    const hasChildren = element.children.length > 0 || (textContent && textContent.length > 0);

    if (hasChildren) {
      jsx += '>';
      if (element.children.length === 0 && textContent) {
        const truncated = textContent.length > 50 ? textContent.slice(0, 50) + '...' : textContent;
        jsx += truncated;
      } else {
        jsx += '...';
      }
      jsx += `</${tagName}>`;
    } else {
      jsx += ' />';
    }

    return jsx;
  }

  /**
   * Generate markdown context
   */
  function generateMarkdown(element, componentInfo, componentStack) {
    const name = componentInfo?.name || 'Unknown';
    const props = componentInfo?.props || {};
    const source = componentInfo?.source;

    let md = `## ${name}\n\n`;

    if (source?.fileName) {
      const shortPath = source.fileName.replace(/^.*[\/\\]/, '');
      md += `**Source:** \`${shortPath}`;
      if (source.lineNumber) {
        md += `:${source.lineNumber}`;
      }
      md += '`\n\n';
    }

    const jsx = generateJSX(element, componentInfo);
    md += `### JSX\n\`\`\`jsx\n${jsx}\n\`\`\`\n\n`;

    if (Object.keys(props).length > 0) {
      md += `### Props\n\`\`\`json\n${JSON.stringify(props, null, 2)}\n\`\`\`\n\n`;
    }

    if (componentStack.length > 1) {
      md += `### Component Stack\n`;
      for (const comp of componentStack.slice(0, 5)) {
        md += `- ${comp.name}`;
        if (comp.source?.fileName) {
          const shortPath = comp.source.fileName.replace(/^.*[\/\\]/, '');
          md += ` (\`${shortPath}\`)`;
        }
        md += '\n';
      }
      md += '\n';
    }

    // Element info
    md += `### Element\n`;
    md += `- **Tag:** \`${element.tagName.toLowerCase()}\`\n`;
    if (element.id) {
      md += `- **ID:** \`${element.id}\`\n`;
    }
    if (element.className && typeof element.className === 'string' && element.className.trim()) {
      md += `- **Classes:** \`${element.className.trim()}\`\n`;
    }

    const rect = element.getBoundingClientRect();
    md += `- **Size:** ${Math.round(rect.width)}×${Math.round(rect.height)}px\n`;

    return md;
  }

  /**
   * Main function to get full component context
   */
  function getElementContext(element) {
    if (!element || !(element instanceof Element)) return null;

    const componentInfo = getComponentInfo(element);
    const componentStack = getComponentStack(element);

    const context = {
      componentName: componentInfo?.name || element.tagName.toLowerCase(),
      props: componentInfo?.props || {},
      source: componentInfo?.source || null,
      componentStack: componentStack,
      jsx: generateJSX(element, componentInfo),
      markdown: generateMarkdown(element, componentInfo, componentStack),
      element: {
        tagName: element.tagName.toLowerCase(),
        id: element.id || '',
        className: element.className || '',
        rect: element.getBoundingClientRect()
      }
    };

    return context;
  }

  /**
   * Check if element is interactive (visible, has pointer-events)
   */
  function isInteractiveElement(element) {
    if (!element || !(element instanceof Element)) return false;

    const style = window.getComputedStyle(element);

    // Check visibility
    if (style.display === 'none') return false;
    if (style.visibility === 'hidden') return false;
    if (style.opacity === '0') return false;
    if (style.pointerEvents === 'none') return false;

    // Check if element has size
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;

    return true;
  }

  /**
   * Find the best element at a point (with React component)
   */
  function findComponentElementAtPoint(x, y) {
    const elements = document.elementsFromPoint(x, y);

    for (const element of elements) {
      // Skip our overlay elements
      if (element.classList.contains('react-grab-bridge-overlay') ||
          element.classList.contains('react-grab-bridge-label') ||
          element.closest('.react-grab-dialog') ||
          element.closest('.react-grab-load-prompt') ||
          element.closest('#react-grab-dialog-root')) {
        continue;
      }

      if (!isInteractiveElement(element)) continue;

      // Check if this element has a React fiber
      const fiber = getFiberFromElement(element);
      if (fiber) {
        // Find the nearest valid component
        const componentFiber = findComponentFiber(fiber, isValidComponent);
        if (componentFiber) {
          return element;
        }
      }
    }

    // Fallback: return first interactive element
    for (const element of elements) {
      if (element.classList.contains('react-grab-bridge-overlay') ||
          element.classList.contains('react-grab-bridge-label') ||
          element.closest('.react-grab-dialog') ||
          element.closest('.react-grab-load-prompt') ||
          element.closest('#react-grab-dialog-root')) {
        continue;
      }
      if (isInteractiveElement(element)) {
        return element;
      }
    }

    return null;
  }

  // Listen for messages from content script
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;

    switch (event.data.type) {
      case 'GRAB_GET_ELEMENT_AT_POINT': {
        const { x, y, requestId } = event.data;
        const element = findComponentElementAtPoint(x, y);

        if (element) {
          const context = getElementContext(element);
          const rect = element.getBoundingClientRect();

          window.postMessage({
            type: 'GRAB_ELEMENT_FOUND',
            requestId,
            context,
            rect: {
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
              bottom: rect.bottom,
              right: rect.right
            }
          }, '*');
        } else {
          window.postMessage({
            type: 'GRAB_ELEMENT_NOT_FOUND',
            requestId
          }, '*');
        }
        break;
      }

      case 'GRAB_GET_CONTEXT': {
        const { x, y, requestId } = event.data;
        const element = findComponentElementAtPoint(x, y);

        if (element) {
          const context = getElementContext(element);
          window.postMessage({
            type: 'GRAB_CONTEXT_RESULT',
            requestId,
            context
          }, '*');
        } else {
          window.postMessage({
            type: 'GRAB_CONTEXT_RESULT',
            requestId,
            context: null
          }, '*');
        }
        break;
      }

      case 'GRAB_CHECK_REACT': {
        const hasReact = !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__ ||
                        !!document.querySelector('[data-reactroot]') ||
                        !!document.querySelector('#root, #app, #__next');

        // Also check for fiber on common root elements
        let hasFiber = false;
        const roots = document.querySelectorAll('#root, #app, #__next, [data-reactroot]');
        for (const root of roots) {
          if (getFiberFromElement(root) || getFiberFromElement(root.firstElementChild)) {
            hasFiber = true;
            break;
          }
        }

        window.postMessage({
          type: 'GRAB_REACT_CHECK_RESULT',
          hasReact: hasReact || hasFiber
        }, '*');
        break;
      }
    }
  });

  console.log('[React Grab Bridge] Inject script loaded');
})();
