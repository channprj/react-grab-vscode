/**
 * Content script that integrates with react-grab
 * Works with react-grab's crosshair mode for element selection
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

// State for react-grab mode
let isReactGrabActive = false;
let hoveredElement = null;

// Extension enabled state
let extensionEnabled = true;
const currentHost = window.location.hostname;

// Initialize WebSocket connection
function connectWebSocket() {
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
  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    reconnectAttempts++;
    console.log(`[React Grab Bridge] Reconnecting... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
    setTimeout(connectWebSocket, RECONNECT_DELAY * reconnectAttempts);
  } else {
    console.error('[React Grab Bridge] Max reconnection attempts reached');
    showNotification('Failed to connect to VSCode Extension. Please ensure it is running.', 'error');
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

// Activate crosshair mode for element selection
function activateCrosshairMode() {
  console.log('[React Grab Bridge] Activating crosshair mode');
  isReactGrabActive = true;

  // Add crosshair cursor to body
  document.body.classList.add('react-grab-crosshair-mode');

  // Add event listeners for element selection
  document.addEventListener('mouseover', handleMouseOver, true);
  document.addEventListener('mouseout', handleMouseOut, true);
  document.addEventListener('click', handleElementSelection, true);
  document.addEventListener('keydown', handleEscapeKey, true);

  // Show indicator
  showCrosshairIndicator();
}

// Deactivate crosshair mode
function deactivateCrosshairMode() {
  console.log('[React Grab Bridge] Deactivating crosshair mode');
  isReactGrabActive = false;

  // Remove crosshair cursor
  document.body.classList.remove('react-grab-crosshair-mode');

  // Remove highlight from any element
  if (hoveredElement) {
    hoveredElement.classList.remove('react-grab-highlight');
    hoveredElement = null;
  }

  // Remove event listeners
  document.removeEventListener('mouseover', handleMouseOver, true);
  document.removeEventListener('mouseout', handleMouseOut, true);
  document.removeEventListener('click', handleElementSelection, true);
  document.removeEventListener('keydown', handleEscapeKey, true);

  // Hide indicator
  hideCrosshairIndicator();
}

// Handle mouse over elements in crosshair mode
function handleMouseOver(event) {
  if (!isReactGrabActive) return;

  event.stopPropagation();

  // Remove highlight from previous element
  if (hoveredElement && hoveredElement !== event.target) {
    hoveredElement.classList.remove('react-grab-highlight');
  }

  // Highlight new element
  hoveredElement = event.target;
  hoveredElement.classList.add('react-grab-highlight');
}

// Handle mouse out elements in crosshair mode
function handleMouseOut(event) {
  if (!isReactGrabActive) return;

  event.stopPropagation();

  // Remove highlight
  if (event.target.classList) {
    event.target.classList.remove('react-grab-highlight');
  }
}

// Handle element selection in crosshair mode
function handleElementSelection(event) {
  if (!isReactGrabActive) return;

  event.preventDefault();
  event.stopPropagation();

  const element = event.target;

  // Get element information
  const elementInfo = getElementInfo(element);
  console.log('[React Grab Bridge] Element selected:', elementInfo);

  // Deactivate crosshair mode
  deactivateCrosshairMode();

  // Show the prompt dialog
  showPromptDialog(elementInfo);
}

// Handle escape key to exit crosshair mode
function handleEscapeKey(event) {
  if (event.key === 'Escape' && isReactGrabActive) {
    event.preventDefault();
    deactivateCrosshairMode();
  }
}

// Get detailed element information
function getElementInfo(element) {
  // Get React component information
  const reactInfo = getReactComponentInfo(element);

  // Get element path
  const path = getElementPath(element);

  // Get computed styles
  const styles = window.getComputedStyle(element);

  return {
    tagName: element.tagName.toLowerCase(),
    className: element.className || '',
    id: element.id || '',
    path: path,
    componentName: reactInfo?.componentName || 'Unknown',
    props: reactInfo?.props || {},
    innerText: element.innerText?.substring(0, 100) || '',
    attributes: Array.from(element.attributes || []).reduce((acc, attr) => {
      acc[attr.name] = attr.value;
      return acc;
    }, {}),
    styles: {
      display: styles.display,
      position: styles.position,
      width: element.offsetWidth,
      height: element.offsetHeight
    }
  };
}

// Get React component information
function getReactComponentInfo(element) {
  // Try various React internal properties
  const props = [
    '_reactInternalFiber',
    '_reactInternalInstance',
    '_reactInternalComponent',
    '__reactInternalInstance',
    '__reactFiber',
    '_reactRootContainer'
  ];

  for (const prop of props) {
    if (element[prop]) {
      const fiber = element[prop];

      // Navigate to the component fiber
      let componentFiber = fiber;
      while (componentFiber && !componentFiber.elementType) {
        componentFiber = componentFiber.return;
      }

      if (componentFiber && componentFiber.elementType) {
        const elementType = componentFiber.elementType;

        return {
          componentName: elementType.displayName || elementType.name || 'Component',
          props: componentFiber.memoizedProps || {}
        };
      }
    }
  }

  return null;
}

// Get element path
function getElementPath(element) {
  const path = [];
  let current = element;

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();

    if (current.id) {
      selector += `#${current.id}`;
    } else if (current.className && typeof current.className === 'string') {
      const classes = current.className.split(' ').filter(c => c && !c.includes('react-grab')).slice(0, 2);
      if (classes.length > 0) {
        selector += '.' + classes.join('.');
      }
    }

    path.unshift(selector);
    current = current.parentElement;
  }

  return path.join(' > ');
}

// Show crosshair mode indicator
function showCrosshairIndicator() {
  let indicator = document.getElementById('react-grab-crosshair-indicator');

  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'react-grab-crosshair-indicator';
    indicator.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #0969da 0%, #8b5cf6 100%);
      color: white;
      padding: 12px 24px;
      border-radius: 24px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 14px;
      font-weight: 600;
      z-index: 2147483647;
      box-shadow: 0 6px 20px rgba(0,0,0,0.25);
      cursor: crosshair;
      user-select: none;
      animation: slideDown 0.3s ease;
    `;
    indicator.innerHTML = '🎯 Crosshair Mode Active - Click any element (ESC to cancel)';

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideDown {
        from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
      }
    `;
    if (!document.getElementById('react-grab-animations')) {
      style.id = 'react-grab-animations';
      document.head.appendChild(style);
    }
  }

  document.body.appendChild(indicator);
}

// Hide crosshair mode indicator
function hideCrosshairIndicator() {
  const indicator = document.getElementById('react-grab-crosshair-indicator');
  if (indicator) {
    indicator.remove();
  }
}

// Create and show the prompt dialog
function showPromptDialog(elementInfo) {
  // Remove existing dialog if any
  const existingDialog = document.getElementById('react-grab-dialog');
  if (existingDialog) {
    existingDialog.remove();
  }

  // Create dialog container
  const dialog = document.createElement('div');
  dialog.id = 'react-grab-dialog';
  dialog.className = 'react-grab-dialog';

  let selectedAI = 'copilot'; // Default to Copilot

  // Create dialog content
  dialog.innerHTML = `
    <div class="react-grab-dialog-content">
      <div class="react-grab-dialog-header">
        <h3>Send to AI Assistant</h3>
        <button class="react-grab-dialog-close" id="react-grab-close">&times;</button>
      </div>
      <div class="react-grab-dialog-body">
        <div class="react-grab-element-info">
          <strong>Selected Element:</strong>
          <code>${elementInfo.componentName !== 'Unknown' ? elementInfo.componentName : elementInfo.tagName}${elementInfo.className ? '.' + elementInfo.className.split(' ')[0] : ''}</code>
          ${elementInfo.path ? `<div style="font-size: 12px; color: #999; margin-top: 4px;">${elementInfo.path}</div>` : ''}
        </div>

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
  `;

  document.body.appendChild(dialog);

  // Handle AI selection
  const aiOptions = dialog.querySelectorAll('.react-grab-ai-option');
  const sendButton = document.getElementById('react-grab-send');
  const textarea = document.getElementById('react-grab-prompt');

  aiOptions.forEach(option => {
    option.addEventListener('click', () => {
      // Remove selected class from all options
      aiOptions.forEach(opt => opt.classList.remove('selected'));
      // Add selected class to clicked option
      option.classList.add('selected');
      // Update selected AI
      selectedAI = option.dataset.ai;
      // Update send button text
      sendButton.textContent = selectedAI === 'copilot' ? 'Send to Copilot' : 'Send to Claude';
      // Update placeholder
      textarea.placeholder = selectedAI === 'copilot' ?
        'Ask Copilot about this component...' :
        'Ask Claude about this component...';
    });
  });

  // Focus on textarea
  textarea.focus();

  // Handle close button
  document.getElementById('react-grab-close').onclick = () => {
    dialog.remove();
  };

  // Handle cancel button
  document.getElementById('react-grab-cancel').onclick = () => {
    dialog.remove();
  };

  // Handle send button
  document.getElementById('react-grab-send').onclick = () => {
    const prompt = textarea.value.trim();
    if (prompt) {
      sendToVSCode('prompt', {
        prompt: prompt,
        elementInfo: elementInfo,
        target: selectedAI // Include which AI to use
      });
      dialog.remove();
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
      setTimeout(() => indicator.style.display = 'none', 3000);
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

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Only work if extension is enabled
  if (!extensionEnabled) return;

  // Cmd/Ctrl + Shift + G to activate crosshair mode
  if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'g') {
    e.preventDefault();

    if (!isReactGrabActive) {
      activateCrosshairMode();
    } else {
      deactivateCrosshairMode();
    }
  }

  // Support react-grab's default shortcut (Option/Alt + C)
  if (e.altKey && e.key.toLowerCase() === 'c') {
    if (!isReactGrabActive) {
      console.log('[React Grab Bridge] Detected react-grab shortcut');
      activateCrosshairMode();
    }
  }
});

// Listen for events from react-grab-integration.js
window.addEventListener('react-grab-element-captured', (event) => {
  const elementInfo = event.detail;
  console.log('[React Grab Bridge] Element captured from react-grab:', elementInfo);

  // Show the prompt dialog
  showPromptDialog(elementInfo);
});

// Check for messages from popup
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
    if (isReactGrabActive) {
      deactivateCrosshairMode();
    }
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
    // Default to enabled if there's an error
    extensionEnabled = true;
    return true;
  }
}

// Initialize on page load
async function initialize() {
  // Check if extension is enabled for this host
  const enabled = await checkHostSettings();

  if (enabled) {
    connectWebSocket();
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
  if (ws) {
    ws.close();
  }
});