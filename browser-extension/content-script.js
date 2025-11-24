/**
 * Content script for React Grab to VSCode/AI Bridge
 * Works WITH react-grab library (must be installed in the React app)
 *
 * How it works:
 * 1. react-grab is triggered with Option/Alt + C in the React app
 * 2. User clicks an element, react-grab copies JSX to clipboard
 * 3. This extension detects the clipboard change and shows a dialog
 */

// WebSocket connection to VSCode Extension
let ws = null;
let isConnected = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 1000;

// Configuration
const WS_PORT = 9765;
const WS_URL = `ws://localhost:${WS_PORT}`;

// Extension state
let extensionEnabled = true;
const currentHost = window.location.hostname;

// Store last clipboard content to detect changes
let lastClipboardContent = '';
let isMonitoringClipboard = false;

// Initialize WebSocket connection
function connectWebSocket() {
  if (!extensionEnabled) return;

  try {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('[React Grab Bridge] Connected to VSCode Extension');
      isConnected = true;
      reconnectAttempts = 0;
      showStatusIndicator('connected');
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handleServerMessage(message);
    };

    ws.onclose = () => {
      console.log('[React Grab Bridge] Disconnected from VSCode Extension');
      isConnected = false;
      showStatusIndicator('disconnected');
      attemptReconnect();
    };

    ws.onerror = (error) => {
      console.error('[React Grab Bridge] WebSocket error:', error);
      showStatusIndicator('error');
    };

  } catch (error) {
    console.error('[React Grab Bridge] Failed to connect:', error);
    attemptReconnect();
  }
}

// Reconnect logic
function attemptReconnect() {
  if (!extensionEnabled) return;

  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    reconnectAttempts++;
    console.log(`[React Grab Bridge] Reconnecting... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
    setTimeout(connectWebSocket, RECONNECT_DELAY * reconnectAttempts);
  } else {
    console.error('[React Grab Bridge] Max reconnection attempts reached');
    showNotification('Failed to connect to VSCode Extension', 'error');
  }
}

// Send message to VSCode Extension
function sendToVSCode(type, data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type,
      ...data,
      timestamp: Date.now()
    }));
  } else {
    showNotification('Not connected to VSCode Extension', 'error');
  }
}

// Handle messages from VSCode Extension
function handleServerMessage(message) {
  switch (message.type) {
    case 'success':
      showNotification('Prompt sent to AI assistant successfully', 'success');
      break;
    case 'error':
      showNotification(message.message || 'Error occurred', 'error');
      break;
    case 'status':
      console.log('[React Grab Bridge] Status:', message.message);
      break;
  }
}

/**
 * Monitor clipboard for react-grab output
 * react-grab copies JSX to clipboard when an element is selected
 */
async function checkClipboard() {
  if (!extensionEnabled || !isMonitoringClipboard) return;

  try {
    const text = await navigator.clipboard.readText();

    // Check if this is new content and looks like JSX from react-grab
    if (text && text !== lastClipboardContent && looksLikeJSX(text)) {
      console.log('[React Grab Bridge] Detected react-grab clipboard content');
      lastClipboardContent = text;

      // Parse the JSX to get component info
      const componentInfo = parseJSXContent(text);

      // Stop monitoring temporarily
      stopClipboardMonitoring();

      // Show dialog with the component info
      showComponentDialog(componentInfo);
    }
  } catch (err) {
    // Clipboard access might be denied or fail
    // This is normal when clipboard doesn't have text
  }
}

/**
 * Check if text looks like JSX (from react-grab)
 */
function looksLikeJSX(text) {
  // react-grab outputs JSX format like: <Component prop="value" />
  return text.includes('<') && (text.includes('/>') || text.includes('</'));
}

/**
 * Parse JSX content from react-grab
 */
function parseJSXContent(jsx) {
  const info = {
    jsx: jsx,
    componentName: 'Unknown',
    props: {},
    children: null
  };

  try {
    // Extract component name
    const componentMatch = jsx.match(/<([A-Z]\w*)/);
    if (componentMatch) {
      info.componentName = componentMatch[1];
    }

    // Extract props (basic parsing)
    const propsRegex = /(\w+)=(?:{([^}]+)}|"([^"]+)"|'([^']+)')/g;
    let match;
    while ((match = propsRegex.exec(jsx)) !== null) {
      const propName = match[1];
      const propValue = match[2] || match[3] || match[4];
      info.props[propName] = propValue;
    }

    // Check if it has children
    const childrenMatch = jsx.match(/>([^<]+)</);
    if (childrenMatch) {
      info.children = childrenMatch[1].trim();
    }

  } catch (error) {
    console.error('[React Grab Bridge] Error parsing JSX:', error);
  }

  return info;
}

/**
 * Start monitoring clipboard (when react-grab might be active)
 */
function startClipboardMonitoring() {
  if (isMonitoringClipboard) return;

  console.log('[React Grab Bridge] Starting clipboard monitoring for react-grab');
  isMonitoringClipboard = true;

  // Check clipboard every 500ms
  clipboardInterval = setInterval(checkClipboard, 500);

  // Show indicator that we're listening for react-grab
  showReactGrabListening();
}

/**
 * Stop monitoring clipboard
 */
let clipboardInterval;
function stopClipboardMonitoring() {
  if (!isMonitoringClipboard) return;

  console.log('[React Grab Bridge] Stopping clipboard monitoring');
  isMonitoringClipboard = false;

  if (clipboardInterval) {
    clearInterval(clipboardInterval);
    clipboardInterval = null;
  }

  hideReactGrabListening();
}

/**
 * Show indicator that we're listening for react-grab
 */
function showReactGrabListening() {
  let indicator = document.getElementById('react-grab-listening');

  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'react-grab-listening';
    indicator.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 20px;
      border-radius: 24px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 13px;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 2147483646;
      cursor: pointer;
      animation: pulse 2s ease-in-out infinite;
    `;
    indicator.innerHTML = '👂 Listening for react-grab (Alt+C)';

    // Add pulse animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 0.9; }
        50% { transform: scale(1.05); opacity: 1; }
      }
    `;
    if (!document.getElementById('react-grab-pulse')) {
      style.id = 'react-grab-pulse';
      document.head.appendChild(style);
    }

    // Click to stop listening
    indicator.onclick = () => {
      stopClipboardMonitoring();
    };
  }

  document.body.appendChild(indicator);
}

/**
 * Hide listening indicator
 */
function hideReactGrabListening() {
  const indicator = document.getElementById('react-grab-listening');
  if (indicator) {
    indicator.remove();
  }
}

/**
 * Show component dialog with copy and send options
 */
function showComponentDialog(componentInfo) {
  // Remove existing dialog if any
  const existingDialog = document.getElementById('react-grab-dialog');
  if (existingDialog) {
    existingDialog.remove();
  }

  // Create dialog
  const dialog = document.createElement('div');
  dialog.id = 'react-grab-dialog';
  dialog.className = 'react-grab-dialog';

  let selectedAI = 'copilot';

  // Format component info for display
  const componentDisplay = `
    Component: ${componentInfo.componentName}
    Props: ${JSON.stringify(componentInfo.props, null, 2)}
    JSX: ${componentInfo.jsx.substring(0, 100)}${componentInfo.jsx.length > 100 ? '...' : ''}
  `.trim();

  dialog.innerHTML = `
    <div class="react-grab-dialog-content">
      <div class="react-grab-dialog-header">
        <h3>React Component Captured</h3>
        <button class="react-grab-dialog-close" id="react-grab-close">&times;</button>
      </div>

      <div class="react-grab-dialog-body">
        <div class="react-grab-element-info">
          <strong>Component:</strong> <code>${componentInfo.componentName}</code>
          ${Object.keys(componentInfo.props).length > 0 ?
            `<div style="margin-top: 8px;">
              <strong>Props:</strong>
              <pre style="background: #f4f4f4; padding: 8px; border-radius: 4px; margin: 4px 0; font-size: 12px;">${JSON.stringify(componentInfo.props, null, 2)}</pre>
            </div>` : ''}
        </div>

        <div class="react-grab-actions">
          <button id="react-grab-copy-info" class="react-grab-btn react-grab-btn-secondary">
            📋 Copy Component Info
          </button>
          <button id="react-grab-copy-jsx" class="react-grab-btn react-grab-btn-secondary">
            📋 Copy JSX
          </button>
        </div>

        <div class="react-grab-ai-section">
          <hr style="margin: 16px 0; border: none; border-top: 1px solid #e5e5e5;">

          <div class="react-grab-ai-selection">
            <div class="react-grab-ai-option copilot selected" data-ai="copilot">
              <div class="icon">🤖</div>
              <div class="name">GitHub Copilot</div>
            </div>
            <div class="react-grab-ai-option claude" data-ai="claude">
              <div class="icon">🧠</div>
              <div class="name">Claude Code</div>
            </div>
          </div>

          <textarea
            id="react-grab-prompt"
            class="react-grab-prompt-input"
            placeholder="Ask about this component..."
            rows="4"
          ></textarea>

          <div class="react-grab-dialog-actions">
            <button id="react-grab-cancel" class="react-grab-btn react-grab-btn-secondary">Cancel</button>
            <button id="react-grab-send" class="react-grab-btn react-grab-btn-primary">Send to Copilot</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(dialog);

  // Handle copy component info button
  document.getElementById('react-grab-copy-info').onclick = async () => {
    const info = `Component: ${componentInfo.componentName}
Props: ${JSON.stringify(componentInfo.props, null, 2)}
JSX: ${componentInfo.jsx}`;

    try {
      await navigator.clipboard.writeText(info);
      showNotification('Component info copied to clipboard', 'success');
    } catch (err) {
      showNotification('Failed to copy to clipboard', 'error');
    }
  };

  // Handle copy JSX button
  document.getElementById('react-grab-copy-jsx').onclick = async () => {
    try {
      await navigator.clipboard.writeText(componentInfo.jsx);
      showNotification('JSX copied to clipboard', 'success');
    } catch (err) {
      showNotification('Failed to copy to clipboard', 'error');
    }
  };

  // Handle AI selection
  const aiOptions = dialog.querySelectorAll('.react-grab-ai-option');
  const sendButton = document.getElementById('react-grab-send');
  const textarea = document.getElementById('react-grab-prompt');

  aiOptions.forEach(option => {
    option.addEventListener('click', () => {
      aiOptions.forEach(opt => opt.classList.remove('selected'));
      option.classList.add('selected');
      selectedAI = option.dataset.ai;
      sendButton.textContent = selectedAI === 'copilot' ? 'Send to Copilot' : 'Send to Claude';
    });
  });

  // Focus on textarea
  textarea.focus();

  // Handle close button
  document.getElementById('react-grab-close').onclick = () => {
    dialog.remove();
    // Resume monitoring
    startClipboardMonitoring();
  };

  // Handle cancel button
  document.getElementById('react-grab-cancel').onclick = () => {
    dialog.remove();
    // Resume monitoring
    startClipboardMonitoring();
  };

  // Handle send button
  document.getElementById('react-grab-send').onclick = () => {
    const prompt = textarea.value.trim();
    if (prompt) {
      sendToVSCode('prompt', {
        prompt: prompt,
        elementInfo: {
          componentName: componentInfo.componentName,
          jsx: componentInfo.jsx,
          props: componentInfo.props
        },
        target: selectedAI
      });
      dialog.remove();
      // Resume monitoring
      startClipboardMonitoring();
    } else {
      textarea.classList.add('error');
      setTimeout(() => textarea.classList.remove('error'), 500);
    }
  };

  // Handle Enter key (Ctrl/Cmd + Enter to send)
  textarea.onkeydown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      document.getElementById('react-grab-send').click();
    }
  };

  // Handle Escape key
  document.onkeydown = (e) => {
    if (e.key === 'Escape') {
      dialog.remove();
      // Resume monitoring
      startClipboardMonitoring();
    }
  };
}

// Show status indicator
function showStatusIndicator(status) {
  let indicator = document.getElementById('react-grab-status');

  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'react-grab-status';
    indicator.className = 'react-grab-status';
    document.body.appendChild(indicator);
  }

  indicator.className = `react-grab-status react-grab-status-${status}`;

  switch (status) {
    case 'connected':
      indicator.textContent = '🟢 Connected to VSCode';
      setTimeout(() => {
        if (indicator) indicator.style.display = 'none';
      }, 3000);
      break;
    case 'disconnected':
      indicator.textContent = '🔴 Disconnected from VSCode';
      indicator.style.display = 'block';
      break;
    case 'error':
      indicator.textContent = '⚠️ Connection Error';
      indicator.style.display = 'block';
      break;
  }
}

// Show notification
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `react-grab-notification react-grab-notification-${type}`;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

/**
 * Trigger react-grab activation
 */
function activateReactGrab() {
  console.log('[React Grab Bridge] Attempting to activate react-grab...');

  // Method 1: Dispatch the actual Alt+C keyboard event that react-grab listens to
  const event = new KeyboardEvent('keydown', {
    key: 'c',
    code: 'KeyC',
    altKey: true,
    bubbles: true,
    cancelable: true,
    composed: true
  });

  // Dispatch to document
  document.dispatchEvent(event);

  // Also dispatch to window and body
  window.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'c',
    code: 'KeyC',
    altKey: true,
    bubbles: true,
    cancelable: true,
    composed: true
  }));

  document.body.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'c',
    code: 'KeyC',
    altKey: true,
    bubbles: true,
    cancelable: true,
    composed: true
  }));

  // Method 2: Try to access react-grab functions directly (as fallback)
  const script = document.createElement('script');
  script.textContent = `
    (function() {
      // Try different ways to activate react-grab

      // Check for ReactGrab global
      if (window.ReactGrab) {
        console.log('[React Grab] Found ReactGrab global');
        if (typeof window.ReactGrab.grab === 'function') {
          window.ReactGrab.grab();
          console.log('[React Grab] Called ReactGrab.grab()');
        } else if (typeof window.ReactGrab.activate === 'function') {
          window.ReactGrab.activate();
          console.log('[React Grab] Called ReactGrab.activate()');
        }
      }

      // Check for grab function directly on window
      if (typeof window.grab === 'function') {
        window.grab();
        console.log('[React Grab] Called window.grab()');
      }

      // Try to trigger via React DevTools if available
      if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        console.log('[React Grab] React DevTools detected');
      }

      // Check if react-grab added any data attributes
      const grabEnabled = document.querySelector('[data-grab-enabled], [data-react-grab-active]');
      if (grabEnabled) {
        console.log('[React Grab] Found grab-enabled elements');
      }
    })();
  `;
  document.documentElement.appendChild(script);
  script.remove();

  // Method 3: Try to trigger via custom event
  const customEvent = new CustomEvent('react-grab-activate', {
    detail: { activate: true },
    bubbles: true
  });
  document.dispatchEvent(customEvent);
}

/**
 * Listen for keyboard shortcuts
 */
document.addEventListener('keydown', (e) => {
  if (!extensionEnabled) return;

  // Option/Alt + C - Monitor for react-grab activation
  // Note: We don't preventDefault() here because react-grab needs to receive this event too
  if (e.altKey && e.key.toLowerCase() === 'c') {
    console.log('[React Grab Bridge] Detected Alt+C - Starting clipboard monitoring for react-grab');

    // Start monitoring clipboard for react-grab output
    // We delay slightly to give react-grab time to activate
    setTimeout(() => {
      startClipboardMonitoring();
    }, 100);

    // Show instruction
    showNotification('React-grab mode active. Click any element to capture it.', 'info');

    // Auto-stop after 30 seconds if nothing happens
    setTimeout(() => {
      if (isMonitoringClipboard) {
        stopClipboardMonitoring();
        showNotification('React-grab listening timeout', 'info');
      }
    }, 30000);
  }
}, true); // Use capture phase to detect the event early

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'checkConnection') {
    sendResponse({ connected: isConnected, enabled: extensionEnabled });
  } else if (request.type === 'toggleExtension') {
    extensionEnabled = request.enabled;
    handleExtensionToggle(request.enabled);
  }
  return true;
});

// Handle extension toggle
function handleExtensionToggle(enabled) {
  extensionEnabled = enabled;

  if (!enabled) {
    // Disable all features
    stopClipboardMonitoring();
    if (ws) {
      ws.close();
      ws = null;
    }
    showNotification('Extension disabled for this site', 'info');
  } else {
    // Re-enable features
    if (!ws) {
      connectWebSocket();
    }
    showNotification('Extension enabled for this site', 'success');
  }
}

// Check if extension is enabled for this host
async function checkHostSettings() {
  try {
    const settings = await chrome.storage.sync.get(['disabledHosts']);
    const disabledHosts = settings.disabledHosts || [];

    if (disabledHosts.includes(currentHost)) {
      extensionEnabled = false;
      console.log(`[React Grab Bridge] Extension disabled for ${currentHost}`);
      return false;
    }

    extensionEnabled = true;
    return true;
  } catch (error) {
    console.error('[React Grab Bridge] Error checking host settings:', error);
    extensionEnabled = true;
    return true;
  }
}

// Check if react-grab is available on the page
function checkReactGrabAvailability() {
  const script = document.createElement('script');
  script.textContent = `
    (function() {
      let hasReactGrab = false;

      // Check various ways react-grab might be exposed
      if (window.ReactGrab) {
        hasReactGrab = true;
        console.log('[React Grab Bridge] ✅ react-grab detected via window.ReactGrab');
      } else if (window.grab) {
        hasReactGrab = true;
        console.log('[React Grab Bridge] ✅ react-grab detected via window.grab');
      } else {
        // Check if React components are using react-grab
        const reactRoot = document.querySelector('#root');
        if (reactRoot && reactRoot._reactRootContainer) {
          console.log('[React Grab Bridge] React app detected, react-grab may be available internally');
          hasReactGrab = 'possible';
        }
      }

      // Send message to content script
      window.postMessage({
        type: 'react-grab-check',
        hasReactGrab: hasReactGrab
      }, '*');
    })();
  `;
  document.documentElement.appendChild(script);
  script.remove();
}

// Listen for react-grab availability check
window.addEventListener('message', (event) => {
  if (event.data.type === 'react-grab-check') {
    if (event.data.hasReactGrab === true) {
      console.log('[React Grab Bridge] react-grab is available on this page');
    } else if (event.data.hasReactGrab === 'possible') {
      console.log('[React Grab Bridge] React app detected, react-grab may be available');
    } else {
      console.log('[React Grab Bridge] react-grab not detected. Make sure to install it: npm install react-grab');
    }
  }
});

// Initialize
async function initialize() {
  console.log('[React Grab Bridge] Initializing...');

  // Check if extension is enabled for this host
  const enabled = await checkHostSettings();

  if (enabled) {
    connectWebSocket();

    // Check for react-grab availability
    setTimeout(checkReactGrabAvailability, 1000);

    // Show instructions
    console.log(`
╔══════════════════════════════════════════════════╗
║     React Grab to VSCode/AI Bridge Active       ║
╠══════════════════════════════════════════════════╣
║ 1. Make sure react-grab is installed in your    ║
║    React app: npm install react-grab            ║
║                                                  ║
║ 2. Press Alt+C (Option+C on Mac) to activate    ║
║    react-grab's crosshair mode                  ║
║                                                  ║
║ 3. Click any React component to capture it      ║
║                                                  ║
║ 4. Use the dialog to copy info or send to AI    ║
╚══════════════════════════════════════════════════╝
    `);
  } else {
    console.log('[React Grab Bridge] Extension disabled for this host');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  stopClipboardMonitoring();
  if (ws) {
    ws.close();
  }
});