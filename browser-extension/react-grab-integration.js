/**
 * React Grab Integration Module
 * Integrates with the actual react-grab library installed in React apps
 */

(function() {
  'use strict';

  console.log('[React Grab Bridge] Integration module loaded');

  // Check if react-grab is available
  let reactGrabAvailable = false;
  let reactGrabActivated = false;

  // Configuration for react-grab activation
  const ACTIVATION_KEY = 'c'; // Default is 'c' with Option/Alt
  const ACTIVATION_MODIFIER = 'altKey'; // Default modifier for react-grab

  /**
   * Check if react-grab is installed in the current React app
   */
  function checkReactGrab() {
    // Check for react-grab indicators
    // react-grab might expose certain globals or data attributes
    const hasReactGrab = !!(
      window.__REACT_GRAB__ ||
      document.querySelector('[data-react-grab]') ||
      document.querySelector('[data-grab-active]') ||
      // Check if the app has react-grab styles
      Array.from(document.styleSheets).some(sheet => {
        try {
          return Array.from(sheet.cssRules || []).some(rule =>
            rule.selectorText && rule.selectorText.includes('grab-cursor')
          );
        } catch (e) {
          return false;
        }
      })
    );

    reactGrabAvailable = hasReactGrab;

    if (hasReactGrab) {
      console.log('[React Grab Bridge] react-grab detected in the application');
    }

    return hasReactGrab;
  }

  /**
   * Activate react-grab's cursor mode
   */
  function activateReactGrab() {
    // Trigger react-grab's activation shortcut (Option/Alt + C)
    const event = new KeyboardEvent('keydown', {
      key: ACTIVATION_KEY,
      code: `Key${ACTIVATION_KEY.toUpperCase()}`,
      altKey: true,
      bubbles: true,
      cancelable: true
    });

    document.dispatchEvent(event);
    reactGrabActivated = true;

    console.log('[React Grab Bridge] Triggered react-grab activation');

    // Show visual indicator
    showReactGrabIndicator();
  }

  /**
   * Deactivate react-grab's cursor mode
   */
  function deactivateReactGrab() {
    // Send ESC to deactivate
    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
      code: 'Escape',
      bubbles: true,
      cancelable: true
    });

    document.dispatchEvent(event);
    reactGrabActivated = false;

    console.log('[React Grab Bridge] Deactivated react-grab');
    hideReactGrabIndicator();
  }

  /**
   * Show indicator that react-grab is active
   */
  function showReactGrabIndicator() {
    let indicator = document.getElementById('react-grab-indicator');

    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'react-grab-indicator';
      indicator.style.cssText = `
        position: fixed;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 13px;
        font-weight: 600;
        z-index: 2147483647;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        animation: slideDown 0.3s ease;
        cursor: pointer;
      `;
      indicator.innerHTML = '🎯 React Grab Mode Active - Click any element';

      // Add animation
      const style = document.createElement('style');
      style.textContent = `
        @keyframes slideDown {
          from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);

      indicator.onclick = deactivateReactGrab;
    }

    document.body.appendChild(indicator);
  }

  /**
   * Hide the react-grab indicator
   */
  function hideReactGrabIndicator() {
    const indicator = document.getElementById('react-grab-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  /**
   * Monitor clipboard for react-grab data
   * react-grab copies component info to clipboard when element is selected
   */
  async function monitorClipboard() {
    if (!navigator.clipboard) {
      console.warn('[React Grab Bridge] Clipboard API not available');
      return;
    }

    try {
      const text = await navigator.clipboard.readText();

      // Check if clipboard contains react-grab data
      // react-grab typically copies component JSX or component info
      if (text && (text.includes('<') || text.includes('Component'))) {
        console.log('[React Grab Bridge] Detected react-grab clipboard data:', text);

        // Parse the component info
        const elementInfo = parseReactGrabData(text);

        // Trigger our dialog with the element info
        window.dispatchEvent(new CustomEvent('react-grab-element-captured', {
          detail: {
            ...elementInfo,
            clipboardData: text
          }
        }));

        // Deactivate react-grab after selection
        deactivateReactGrab();
      }
    } catch (err) {
      // Clipboard read might fail due to permissions
      console.debug('[React Grab Bridge] Clipboard read failed:', err);
    }
  }

  /**
   * Parse react-grab clipboard data to extract component info
   */
  function parseReactGrabData(text) {
    const info = {
      componentName: 'Unknown',
      jsx: text,
      props: {}
    };

    // Try to extract component name from JSX
    const componentMatch = text.match(/<(\w+)/);
    if (componentMatch) {
      info.componentName = componentMatch[1];
    }

    // Try to extract props
    const propsMatch = text.matchAll(/(\w+)=["'{]([^"'}]+)["'}]/g);
    for (const match of propsMatch) {
      info.props[match[1]] = match[2];
    }

    return info;
  }

  /**
   * Override the default keyboard handler to work with react-grab
   */
  function setupKeyboardHandler() {
    document.addEventListener('keydown', (e) => {
      // Our custom shortcut: Cmd/Ctrl + Shift + G
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'g') {
        e.preventDefault();

        if (!reactGrabAvailable) {
          // If react-grab is not available, show instruction
          showReactGrabInstruction();
        } else if (!reactGrabActivated) {
          // Activate react-grab
          activateReactGrab();

          // Start monitoring for selections
          startSelectionMonitoring();
        } else {
          // Deactivate if already active
          deactivateReactGrab();
        }
      }

      // Also support the default react-grab shortcut (Option/Alt + C)
      if (e.altKey && e.key === 'c' && !reactGrabActivated) {
        console.log('[React Grab Bridge] Detected react-grab activation shortcut');
        reactGrabActivated = true;

        // Start monitoring for selections
        startSelectionMonitoring();

        // Show our indicator
        setTimeout(() => showReactGrabIndicator(), 100);
      }

      // Detect ESC to deactivate
      if (e.key === 'Escape' && reactGrabActivated) {
        reactGrabActivated = false;
        hideReactGrabIndicator();
        stopSelectionMonitoring();
      }
    });
  }

  /**
   * Start monitoring for element selections
   */
  let monitoringInterval;
  function startSelectionMonitoring() {
    console.log('[React Grab Bridge] Starting selection monitoring');

    // Monitor clipboard changes
    monitoringInterval = setInterval(monitorClipboard, 500);

    // Also monitor clicks
    document.addEventListener('click', handleElementClick, true);
  }

  /**
   * Stop monitoring for selections
   */
  function stopSelectionMonitoring() {
    console.log('[React Grab Bridge] Stopping selection monitoring');

    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      monitoringInterval = null;
    }

    document.removeEventListener('click', handleElementClick, true);
  }

  /**
   * Handle element clicks when react-grab is active
   */
  function handleElementClick(event) {
    if (!reactGrabActivated) return;

    // Let react-grab handle the click first
    setTimeout(async () => {
      // Check clipboard for react-grab data
      await monitorClipboard();

      // If no clipboard data, fall back to our own detection
      const element = event.target;
      if (element) {
        const elementInfo = {
          tagName: element.tagName.toLowerCase(),
          className: element.className,
          id: element.id,
          componentName: getReactComponentName(element),
          path: getElementPath(element)
        };

        console.log('[React Grab Bridge] Element clicked:', elementInfo);

        // Trigger our dialog
        window.dispatchEvent(new CustomEvent('react-grab-element-captured', {
          detail: elementInfo
        }));

        // Deactivate after selection
        deactivateReactGrab();
      }
    }, 100);
  }

  /**
   * Get React component name from element
   */
  function getReactComponentName(element) {
    // Try various React internal properties
    const props = [
      '_reactInternalFiber',
      '_reactInternalInstance',
      '_reactInternalComponent',
      '__reactInternalInstance',
      '__reactFiber'
    ];

    for (const prop of props) {
      if (element[prop]) {
        const fiber = element[prop];
        if (fiber.elementType) {
          if (typeof fiber.elementType === 'function') {
            return fiber.elementType.displayName || fiber.elementType.name || 'Component';
          } else if (typeof fiber.elementType === 'string') {
            return fiber.elementType;
          }
        }
      }
    }

    return 'Unknown';
  }

  /**
   * Get element path for better identification
   */
  function getElementPath(element) {
    const path = [];
    let current = element;

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      if (current.id) {
        selector += `#${current.id}`;
      } else if (current.className) {
        selector += '.' + current.className.split(' ').join('.');
      }
      path.unshift(selector);
      current = current.parentElement;
    }

    return path.join(' > ');
  }

  /**
   * Show instruction for installing react-grab
   */
  function showReactGrabInstruction() {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      z-index: 2147483647;
      max-width: 500px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    `;

    modal.innerHTML = `
      <h3 style="margin-top: 0; color: #333;">react-grab Not Detected</h3>
      <p style="color: #666; line-height: 1.5;">
        To use the visual element selection feature, your React app needs to have
        <strong>react-grab</strong> installed.
      </p>
      <pre style="background: #f4f4f4; padding: 12px; border-radius: 6px; overflow-x: auto;">
npm install react-grab
# or
yarn add react-grab</pre>
      <p style="color: #666; margin-bottom: 0;">
        Then wrap your app with the Grab component or use the useGrab hook.
        <a href="https://github.com/aidenybai/react-grab" target="_blank"
           style="color: #0969da;">Learn more →</a>
      </p>
      <button onclick="this.parentElement.remove()"
              style="margin-top: 16px; padding: 8px 16px; background: #0969da;
                     color: white; border: none; border-radius: 6px; cursor: pointer;">
        Close
      </button>
    `;

    document.body.appendChild(modal);
  }

  /**
   * Initialize the integration
   */
  function initialize() {
    // Check for react-grab periodically
    checkReactGrab();
    setInterval(checkReactGrab, 2000);

    // Setup keyboard handlers
    setupKeyboardHandler();

    // Listen for our custom event from content-script
    window.addEventListener('activate-react-grab', () => {
      if (reactGrabAvailable && !reactGrabActivated) {
        activateReactGrab();
        startSelectionMonitoring();
      }
    });

    console.log('[React Grab Bridge] Integration initialized');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

})();