/**
 * Content script that integrates with react-grab
 * Captures element selection and shows input dialog
 */

// WebSocket connection to VSCode Extension
let ws = null;
let isConnected = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 1000;

// Configuration
const WS_PORT = 8765;
const WS_URL = `ws://localhost:${WS_PORT}`;

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
      showNotification('Prompt sent to Copilot successfully', 'success');
      break;
    case 'error':
      showNotification(message.message || 'Error occurred', 'error');
      break;
    case 'status':
      console.log('[React Grab Bridge] Status:', message.message);
      break;
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
          <code>${elementInfo.tagName}${elementInfo.className ? '.' + elementInfo.className.split(' ')[0] : ''}</code>
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

// Listen for react-grab element selection
// This is triggered when user selects an element with Cmd+Click
function interceptReactGrabSelection() {
  // Inject script to access React DevTools
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('inject.js');
  script.onload = function() {
    this.remove();
  };
  (document.head || document.documentElement).appendChild(script);

  // Listen for custom event from injected script
  window.addEventListener('react-grab-element-selected', (event) => {
    const elementInfo = event.detail;
    console.log('[React Grab Bridge] Element selected:', elementInfo);

    // Show the prompt dialog
    showPromptDialog(elementInfo);
  });
}

// Override default react-grab behavior
document.addEventListener('keydown', (e) => {
  // Check if user is holding Cmd/Ctrl
  if (e.metaKey || e.ctrlKey) {
    // Add click listener
    const clickHandler = (event) => {
      // Check if react-grab would handle this
      if (event.target && event.target.nodeType === Node.ELEMENT_NODE) {
        event.preventDefault();
        event.stopPropagation();

        // Get element information
        const element = event.target;
        const elementInfo = {
          tagName: element.tagName.toLowerCase(),
          className: element.className,
          id: element.id,
          // Try to get React component name from React DevTools
          componentName: element._reactInternalFiber?.elementType?.name ||
                        element._reactInternalInstance?._currentElement?.type?.name ||
                        'Unknown'
        };

        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('react-grab-element-selected', {
          detail: elementInfo
        }));

        // Remove this handler
        document.removeEventListener('click', clickHandler, true);
      }
    };

    // Add click listener with capture to intercept before react-grab
    document.addEventListener('click', clickHandler, true);

    // Remove handler if key is released
    const keyupHandler = (e) => {
      if (!e.metaKey && !e.ctrlKey) {
        document.removeEventListener('click', clickHandler, true);
        document.removeEventListener('keyup', keyupHandler);
      }
    };
    document.addEventListener('keyup', keyupHandler);
  }
});

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    connectWebSocket();
    interceptReactGrabSelection();
  });
} else {
  connectWebSocket();
  interceptReactGrabSelection();
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  if (ws) {
    ws.close();
  }
});