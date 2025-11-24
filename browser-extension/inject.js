/**
 * Injected script that runs in the page context
 * This has access to React DevTools and page variables
 */

(function() {
  'use strict';

  // Function to get React component information from an element
  function getReactComponentInfo(element) {
    // Try different React internal property names (they vary by React version)
    const reactInternalKeys = [
      '_reactInternalFiber',
      '_reactInternalInstance',
      '_reactInternalComponent',
      '__reactInternalInstance',
      '__reactFiber',
    ];

    for (const key of reactInternalKeys) {
      if (element[key]) {
        const fiber = element[key];

        // Try to get component name
        let componentName = 'Unknown';
        if (fiber.elementType) {
          if (typeof fiber.elementType === 'function') {
            componentName = fiber.elementType.displayName ||
                          fiber.elementType.name ||
                          'Anonymous';
          } else if (typeof fiber.elementType === 'string') {
            componentName = fiber.elementType;
          }
        } else if (fiber._currentElement && fiber._currentElement.type) {
          const type = fiber._currentElement.type;
          componentName = type.displayName || type.name || 'Anonymous';
        }

        // Try to get props
        let props = {};
        if (fiber.memoizedProps) {
          props = fiber.memoizedProps;
        } else if (fiber._currentElement && fiber._currentElement.props) {
          props = fiber._currentElement.props;
        }

        return {
          componentName,
          props,
          fiber
        };
      }
    }

    return null;
  }

  // Function to get element path (like DevTools shows)
  function getElementPath(element) {
    const path = [];
    let current = element;

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();

      if (current.id) {
        selector += `#${current.id}`;
      } else if (current.className) {
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

  // Listen for requests from content script
  window.addEventListener('react-grab-get-info', (event) => {
    const element = event.detail.element;

    if (!element) {
      return;
    }

    const reactInfo = getReactComponentInfo(element);
    const elementPath = getElementPath(element);

    const elementInfo = {
      tagName: element.tagName.toLowerCase(),
      className: element.className || '',
      id: element.id || '',
      path: elementPath,
      componentName: reactInfo?.componentName || 'Unknown',
      props: reactInfo?.props || {},
      // Add some useful computed styles
      styles: {
        position: window.getComputedStyle(element).position,
        display: window.getComputedStyle(element).display,
        width: element.offsetWidth,
        height: element.offsetHeight
      }
    };

    // Send info back to content script
    window.dispatchEvent(new CustomEvent('react-grab-info-response', {
      detail: elementInfo
    }));
  });

  console.log('[React Grab Bridge] Injected script loaded');
})();