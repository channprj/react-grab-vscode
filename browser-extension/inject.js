/**
 * Injected script that runs in the page context
 * This has access to React DevTools, page variables, and react-grab API
 */

(function() {
  'use strict';

  // State for react-grab API instance
  let reactGrabApi = null;

  // Function to get React component information from an element
  function getReactComponentInfo(element) {
    // Try different React internal property names (they vary by React version)
    const reactInternalKeys = [
      '__reactFiber$',
      '__reactInternalInstance$',
      '_reactInternalFiber',
      '_reactInternalInstance',
      '_reactInternalComponent',
      '__reactInternalInstance',
      '__reactFiber',
    ];

    // Check for keys that start with the prefix (React adds random suffixes)
    for (const key of Object.keys(element)) {
      for (const prefix of reactInternalKeys) {
        if (key.startsWith(prefix)) {
          const fiber = element[key];
          return extractFiberInfo(fiber);
        }
      }
    }

    // Fallback to exact key matches
    for (const key of reactInternalKeys) {
      if (element[key]) {
        const fiber = element[key];
        return extractFiberInfo(fiber);
      }
    }

    return null;
  }

  // Extract component info from React fiber
  function extractFiberInfo(fiber) {
    if (!fiber) return null;

    // Try to get component name
    let componentName = 'Unknown';
    let filePath = null;

    if (fiber.elementType) {
      if (typeof fiber.elementType === 'function') {
        componentName = fiber.elementType.displayName ||
                      fiber.elementType.name ||
                      'Anonymous';

        // Try to get source file from _debugSource
        if (fiber._debugSource) {
          filePath = fiber._debugSource.fileName;
        }
      } else if (typeof fiber.elementType === 'string') {
        componentName = fiber.elementType;
      }
    } else if (fiber._currentElement && fiber._currentElement.type) {
      const type = fiber._currentElement.type;
      componentName = type.displayName || type.name || 'Anonymous';
    }

    // Walk up the fiber tree to find the nearest component
    let currentFiber = fiber;
    while (currentFiber && componentName === 'Unknown') {
      if (currentFiber.type && typeof currentFiber.type === 'function') {
        componentName = currentFiber.type.displayName ||
                       currentFiber.type.name ||
                       'Anonymous';
        if (currentFiber._debugSource) {
          filePath = currentFiber._debugSource.fileName;
        }
        break;
      }
      currentFiber = currentFiber.return;
    }

    // Try to get props
    let props = {};
    if (fiber.memoizedProps) {
      props = sanitizeProps(fiber.memoizedProps);
    } else if (fiber._currentElement && fiber._currentElement.props) {
      props = sanitizeProps(fiber._currentElement.props);
    }

    return {
      componentName,
      props,
      filePath,
      fiber
    };
  }

  // Sanitize props for display (remove functions, circular refs, etc.)
  function sanitizeProps(props) {
    if (!props || typeof props !== 'object') return {};

    const sanitized = {};
    const seen = new WeakSet();

    function sanitizeValue(value, depth = 0) {
      if (depth > 3) return '[nested]';

      if (value === null || value === undefined) {
        return value;
      }

      if (typeof value === 'function') {
        return `[Function: ${value.name || 'anonymous'}]`;
      }

      if (typeof value === 'symbol') {
        return value.toString();
      }

      if (value instanceof Element || value instanceof Node) {
        return '[DOM Element]';
      }

      if (typeof value === 'object') {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);

        if (Array.isArray(value)) {
          return value.slice(0, 5).map(v => sanitizeValue(v, depth + 1));
        }

        // Check if it's a React element
        if (value.$$typeof) {
          return '[React Element]';
        }

        const result = {};
        const keys = Object.keys(value).slice(0, 10);
        for (const key of keys) {
          if (!key.startsWith('_')) {
            result[key] = sanitizeValue(value[key], depth + 1);
          }
        }
        return result;
      }

      return value;
    }

    for (const [key, value] of Object.entries(props)) {
      if (!key.startsWith('_') && key !== 'children') {
        sanitized[key] = sanitizeValue(value);
      }
    }

    return sanitized;
  }

  // Function to get element path (like DevTools shows)
  function getElementPath(element) {
    const path = [];
    let current = element;

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();

      if (current.id) {
        selector += `#${current.id}`;
      } else if (current.className && typeof current.className === 'string') {
        const classes = current.className.split(' ').filter(c => c).slice(0, 2);
        if (classes.length > 0) {
          selector += '.' + classes.join('.');
        }
      }

      path.unshift(selector);
      current = current.parentElement;
    }

    return path.join(' > ');
  }

  // Generate JSX representation of the element
  function generateJSXRepresentation(element, reactInfo) {
    if (!element) return '';

    const componentName = reactInfo?.componentName || element.tagName.toLowerCase();
    const props = reactInfo?.props || {};

    let jsx = `<${componentName}`;

    // Add props
    for (const [key, value] of Object.entries(props)) {
      if (typeof value === 'string') {
        jsx += ` ${key}="${value}"`;
      } else if (typeof value === 'boolean' && value) {
        jsx += ` ${key}`;
      } else if (typeof value === 'number') {
        jsx += ` ${key}={${value}}`;
      } else if (typeof value === 'function' || (typeof value === 'string' && value.startsWith('[Function'))) {
        jsx += ` ${key}={...}`;
      } else {
        jsx += ` ${key}={${JSON.stringify(value)}}`;
      }
    }

    // Check for children
    const hasChildren = element.children.length > 0 || element.textContent?.trim();

    if (hasChildren) {
      jsx += '>';
      if (element.children.length === 0 && element.textContent?.trim()) {
        jsx += element.textContent.trim().substring(0, 50);
        if (element.textContent.trim().length > 50) jsx += '...';
      } else {
        jsx += '...';
      }
      jsx += `</${componentName}>`;
    } else {
      jsx += ' />';
    }

    return jsx;
  }

  // Generate markdown context for the component
  function generateMarkdownContext(element, reactInfo) {
    const componentName = reactInfo?.componentName || 'Unknown';
    const props = reactInfo?.props || {};
    const filePath = reactInfo?.filePath;
    const elementPath = getElementPath(element);
    const jsx = generateJSXRepresentation(element, reactInfo);

    let markdown = `## ${componentName}\n\n`;

    if (filePath) {
      markdown += `**Source:** \`${filePath}\`\n\n`;
    }

    markdown += `**Element Path:** \`${elementPath}\`\n\n`;

    markdown += `### JSX\n\`\`\`jsx\n${jsx}\n\`\`\`\n\n`;

    if (Object.keys(props).length > 0) {
      markdown += `### Props\n\`\`\`json\n${JSON.stringify(props, null, 2)}\n\`\`\`\n\n`;
    }

    // Add element info
    markdown += `### Element Info\n`;
    markdown += `- **Tag:** \`${element.tagName.toLowerCase()}\`\n`;
    if (element.id) {
      markdown += `- **ID:** \`${element.id}\`\n`;
    }
    if (element.className && typeof element.className === 'string') {
      markdown += `- **Classes:** \`${element.className}\`\n`;
    }

    // Add computed styles
    const styles = window.getComputedStyle(element);
    markdown += `- **Dimensions:** ${element.offsetWidth}x${element.offsetHeight}px\n`;
    markdown += `- **Display:** \`${styles.display}\`\n`;
    markdown += `- **Position:** \`${styles.position}\`\n`;

    return markdown;
  }

  // Extract complete context from an element
  function extractElementContext(element) {
    const reactInfo = getReactComponentInfo(element);

    return {
      componentName: reactInfo?.componentName || 'Unknown',
      props: reactInfo?.props || {},
      filePath: reactInfo?.filePath || null,
      markdown: generateMarkdownContext(element, reactInfo),
      jsx: generateJSXRepresentation(element, reactInfo),
      tagName: element.tagName.toLowerCase(),
      className: element.className || '',
      id: element.id || '',
      path: getElementPath(element)
    };
  }

  // Check if React is loaded on the page
  function detectReact() {
    // Check for React DevTools hook
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      return true;
    }

    // Check for React fiber in any DOM element
    const rootElement = document.getElementById('root') || document.getElementById('app') || document.body.firstElementChild;
    if (rootElement) {
      for (const key of Object.keys(rootElement)) {
        if (key.startsWith('__reactFiber') || key.startsWith('__reactInternalInstance') || key.startsWith('_reactRootContainer')) {
          return true;
        }
      }
    }

    // Check for React on window
    if (window.React || window.__REACT_DEVTOOLS_COMPONENT_FILTERS__) {
      return true;
    }

    return false;
  }

  // Check if react-grab is loaded on the page (any version/method)
  function detectReactGrab() {
    // Check various ways react-grab might be exposed
    const possibleGlobals = [
      'ReactGrab',
      'reactGrab',
      '__REACT_GRAB__',
      '__REACT_GRAB_GLOBAL__',
      'grab',
    ];

    for (const name of possibleGlobals) {
      if (window[name]) {
        console.log(`[React Grab Bridge] Found react-grab via window.${name}:`, window[name]);
        return { found: true, name, obj: window[name] };
      }
    }

    // Check if react-grab script is loaded by looking for its characteristic elements
    const scripts = document.querySelectorAll('script[src*="react-grab"]');
    if (scripts.length > 0) {
      console.log('[React Grab Bridge] Found react-grab script tag');
      return { found: true, name: 'script-tag', obj: null };
    }

    // Check for react-grab's characteristic DOM elements or styles
    // react-grab adds overlay elements with specific attributes
    const grabOverlay = document.querySelector('[data-react-grab]') ||
                        document.querySelector('[data-react-grab-overlay]') ||
                        document.querySelector('.react-grab-overlay');
    if (grabOverlay) {
      console.log('[React Grab Bridge] Found react-grab overlay element');
      return { found: true, name: 'overlay-element', obj: null };
    }

    // Check if react-grab has patched copy behavior (check for specific event listeners)
    // This is heuristic - react-grab listens for Option/Alt + hover and Cmd/Ctrl + C
    // We can't directly detect this, but we can assume it's loaded if React is present
    // and there are signs of react-grab activity

    return { found: false, name: null, obj: null };
  }

  // Check if this is a React app (prerequisite for react-grab)
  function isReactApp() {
    return detectReact();
  }

  // Setup react-grab callbacks if react-grab is available
  function setupReactGrabCallbacks() {
    const detection = detectReactGrab();

    if (!detection.found) {
      return false;
    }

    // Check various ways react-grab might expose its init function
    const initFunctions = [
      detection.obj?.init,
      window.ReactGrab?.init,
      window.reactGrab?.init,
      window.__REACT_GRAB__?.init,
      window.__REACT_GRAB_GLOBAL__?.init,
    ].filter(Boolean);

    const reactGrabInit = initFunctions[0];

    if (reactGrabInit && typeof reactGrabInit === 'function') {
      try {
        reactGrabApi = reactGrabInit({
          onElementSelect: (element) => {
            console.log('[React Grab Bridge] Element selected via react-grab API');
            const context = extractElementContext(element);

            // Send to content script via postMessage
            window.postMessage({
              type: 'react-grab-element-selected',
              context: context
            }, '*');
          },
          onCopySuccess: (elements, content) => {
            console.log('[React Grab Bridge] Copy success via react-grab API');
            window.postMessage({
              type: 'react-grab-copy-success',
              content: content
            }, '*');
          },
          onStateChange: (state) => {
            console.log('[React Grab Bridge] State change:', state);
            window.postMessage({
              type: 'react-grab-state-change',
              isActive: state?.isActive || false
            }, '*');
          }
        });

        // Store API reference for external access
        window.__reactGrabBridgeApi = reactGrabApi;

        console.log('[React Grab Bridge] Successfully initialized react-grab callbacks');

        // Notify content script that react-grab is ready with full API
        window.postMessage({
          type: 'react-grab-ready',
          hasApi: true,
          hasInitApi: true
        }, '*');

        return true;
      } catch (error) {
        console.error('[React Grab Bridge] Failed to initialize react-grab callbacks:', error);
      }
    }

    // react-grab is loaded but doesn't expose init() - it's using auto-init mode
    // In this mode, react-grab automatically copies to clipboard on selection
    // We'll detect this via clipboard monitoring in content-script.js
    console.log('[React Grab Bridge] react-grab detected but init() not available - using clipboard fallback');

    window.postMessage({
      type: 'react-grab-ready',
      hasApi: true,
      hasInitApi: false,
      detectionMethod: detection.name
    }, '*');

    return true; // Return true because react-grab IS loaded, just not with programmatic API
  }

  // Try to setup react-grab callbacks
  function trySetupReactGrab() {
    if (setupReactGrabCallbacks()) {
      return;
    }

    // If react-grab is not immediately available, wait for it
    let attempts = 0;
    const maxAttempts = 20;
    const checkInterval = setInterval(() => {
      attempts++;
      if (setupReactGrabCallbacks() || attempts >= maxAttempts) {
        clearInterval(checkInterval);

        if (attempts >= maxAttempts) {
          const hasReact = isReactApp();
          console.log('[React Grab Bridge] react-grab not found after waiting, will use fallback mode');
          console.log('[React Grab Bridge] React detected:', hasReact);

          window.postMessage({
            type: 'react-grab-ready',
            hasApi: false,
            hasReact: hasReact,
            message: hasReact
              ? 'React app detected. If react-grab is installed, use Option/Alt + hover and Cmd/Ctrl + C to copy components.'
              : 'No React app detected on this page.'
          }, '*');
        }
      }
    }, 500);
  }

  // Listen for requests from content script
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;

    switch (event.data.type) {
      case 'react-grab-get-info':
        // Legacy: Direct element info request
        handleGetInfoRequest(event.data);
        break;

      case 'react-grab-activate':
        // Activate react-grab selection mode
        if (reactGrabApi && typeof reactGrabApi.activate === 'function') {
          reactGrabApi.activate();
          console.log('[React Grab Bridge] Activated react-grab');
        } else {
          console.warn('[React Grab Bridge] Cannot activate - react-grab API not available');
          window.postMessage({
            type: 'react-grab-activation-failed',
            reason: 'API not available'
          }, '*');
        }
        break;

      case 'react-grab-check-api':
        // Check if react-grab API is available
        const checkDetection = detectReactGrab();
        window.postMessage({
          type: 'react-grab-api-status',
          hasApi: !!reactGrabApi || checkDetection.found,
          hasInitApi: !!reactGrabApi,
          apiMethods: reactGrabApi ? Object.keys(reactGrabApi) : [],
          detectionMethod: checkDetection.name,
          detectedObject: checkDetection.obj ? Object.keys(checkDetection.obj) : []
        }, '*');

        // Also send react-grab-ready if we found it
        if (checkDetection.found && !reactGrabApi) {
          // Try to setup callbacks one more time
          setupReactGrabCallbacks();
        }
        break;
    }
  });

  // Handle legacy get info request
  function handleGetInfoRequest(data) {
    const element = data.element;
    if (!element) return;

    const context = extractElementContext(element);

    // Send info back to content script
    window.dispatchEvent(new CustomEvent('react-grab-info-response', {
      detail: context
    }));
  }

  // Initialize
  console.log('[React Grab Bridge] Injected script loaded');

  // Try to setup react-grab callbacks
  trySetupReactGrab();

  // Also listen for the custom event (legacy support)
  window.addEventListener('react-grab-get-info', (event) => {
    const element = event.detail?.element;
    if (!element) return;

    const context = extractElementContext(element);

    window.dispatchEvent(new CustomEvent('react-grab-info-response', {
      detail: context
    }));
  });
})();
