/**
 * Content script for React Grab to VSCode/AI Bridge
 * Integrates with react-grab library to capture React components
 * and send them to GitHub Copilot or Claude Code
 *
 * How it works:
 * 1. react-grab is initialized on the page (via CDN or npm)
 * 2. When user selects an element with react-grab, we receive the event
 * 3. Show a dialog with editable component context
 * 4. User can send to Copilot or Claude Code
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
const REACT_GRAB_CDN = 'https://unpkg.com/react-grab/dist/index.global.js';

// Extension state
let extensionEnabled = true;
const currentHost = window.location.hostname;

// react-grab state
let hasReactGrabApi = false;
let reactGrabInjected = false;

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
 * Inject the inject.js script into the page context
 */
function injectScript() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('inject.js');
  script.onload = () => {
    console.log('[React Grab Bridge] Inject script loaded');
    script.remove();
  };
  (document.head || document.documentElement).appendChild(script);
}

/**
 * Check if react-grab is available on the page
 * Uses postMessage to communicate with inject.js in page context
 */
function checkReactGrabAvailability() {
  if (reactGrabInjected) return;

  // Ask inject.js to check for react-grab (avoids CSP inline script issues)
  window.postMessage({ type: 'react-grab-check-api' }, '*');
}

/**
 * Load react-grab from CDN
 */
function loadReactGrabFromCDN() {
  if (reactGrabInjected) return;
  reactGrabInjected = true;

  console.log('[React Grab Bridge] Loading react-grab from CDN...');

  const script = document.createElement('script');
  script.src = REACT_GRAB_CDN;
  script.crossOrigin = 'anonymous';
  script.onload = () => {
    console.log('[React Grab Bridge] react-grab loaded from CDN');
    showNotification('react-grab loaded! Use Option/Alt + Click to select elements', 'info');

    // Re-check for API after loading
    setTimeout(() => {
      window.postMessage({ type: 'react-grab-check-api' }, '*');
    }, 500);
  };
  script.onerror = () => {
    console.error('[React Grab Bridge] Failed to load react-grab from CDN');
    showNotification('Failed to load react-grab. Please install it in your app.', 'error');
    reactGrabInjected = false;
  };
  document.head.appendChild(script);
}

/**
 * Listen for react-grab events from the page
 */
function setupReactGrabListeners() {
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;

    switch (event.data.type) {
      case 'react-grab-element-selected':
        // Element selected via react-grab API
        console.log('[React Grab Bridge] Received element selection:', event.data.context);
        if (event.data.context) {
          showComponentDialog(event.data.context);
        }
        break;

      case 'react-grab-copy-success':
        // Copy success from react-grab
        console.log('[React Grab Bridge] react-grab copy success:', event.data.content);
        // Parse the content and show dialog
        if (event.data.content) {
          const context = parseReactGrabContent(event.data.content);
          if (context) {
            showComponentDialog(context);
          }
        }
        break;

      case 'react-grab-ready':
        // react-grab API is ready
        hasReactGrabApi = event.data.hasApi;
        const hasInitApi = event.data.hasInitApi;
        const hasReact = event.data.hasReact;
        console.log('[React Grab Bridge] react-grab ready:', {
          hasApi: hasReactGrabApi,
          hasInitApi: hasInitApi,
          hasReact: hasReact,
          detectionMethod: event.data.detectionMethod,
          message: event.data.message
        });

        if (hasReactGrabApi) {
          if (hasInitApi) {
            showNotification('react-grab connected! Select an element to capture.', 'success');
          } else {
            // react-grab is loaded but using auto-init mode (clipboard-based)
            showNotification('react-grab detected! Use Option/Alt + hover, then Cmd/Ctrl + C to copy.', 'info');
          }
        } else if (hasReact) {
          // React app found but react-grab not detected
          // This might mean react-grab is loaded via npm but not exposing globals
          // Show helpful message and rely on clipboard fallback
          showReactAppDetectedPrompt();
        } else {
          // No React detected
          showNotification('No React app detected on this page.', 'info');
        }
        break;

      case 'react-grab-check-result':
        // Result of checking if react-grab is loaded (legacy)
        hasReactGrabApi = event.data.hasReactGrab;
        console.log('[React Grab Bridge] react-grab check result:', event.data);
        if (!event.data.hasReactGrab) {
          showLoadReactGrabPrompt();
        }
        break;

      case 'react-grab-state-change':
        // react-grab activation state changed
        console.log('[React Grab Bridge] react-grab state:', event.data.isActive);
        if (event.data.isActive) {
          showNotification('Select an element to capture', 'info');
        }
        break;

      case 'react-grab-activation-failed':
        // Failed to activate react-grab
        console.error('[React Grab Bridge] react-grab activation failed:', event.data.reason);
        showLoadReactGrabPrompt();
        break;

      case 'react-grab-api-status':
        // API status check response
        hasReactGrabApi = event.data.hasApi;
        console.log('[React Grab Bridge] API status:', event.data);

        if (event.data.hasApi && !event.data.hasInitApi) {
          // react-grab is loaded but doesn't have init API - show notification
          console.log('[React Grab Bridge] react-grab using clipboard mode (no init API)');
        }
        break;
    }
  });
}

/**
 * Parse content from react-grab clipboard output
 */
function parseReactGrabContent(content) {
  if (!content || typeof content !== 'string') return null;

  try {
    // react-grab outputs markdown format
    const context = {
      markdown: content,
      componentName: 'Unknown',
      props: {},
      jsx: '',
      filePath: null,
      tagName: '',
      className: '',
      id: ''
    };

    // Try to extract component name from markdown heading
    const componentMatch = content.match(/^##\s+(\w+)/m);
    if (componentMatch) {
      context.componentName = componentMatch[1];
    }

    // Try to extract component name from JSX tag if no heading found
    if (context.componentName === 'Unknown') {
      const jsxComponentMatch = content.match(/<([A-Z][a-zA-Z0-9]*)/);
      if (jsxComponentMatch) {
        context.componentName = jsxComponentMatch[1];
      }
    }

    // Try to extract JSX from code block
    const jsxMatch = content.match(/```jsx\n([\s\S]*?)\n```/);
    if (jsxMatch) {
      context.jsx = jsxMatch[1];
    } else {
      // If no code block, try to find JSX directly
      const directJsxMatch = content.match(/<[A-Z][^]*?(?:\/>|<\/[A-Z][a-zA-Z0-9]*>)/);
      if (directJsxMatch) {
        context.jsx = directJsxMatch[0];
      }
    }

    // Try to extract source file
    const sourceMatch = content.match(/\*\*Source:\*\*\s*`([^`]+)`/);
    if (sourceMatch) {
      context.filePath = sourceMatch[1];
    } else {
      // Alternative format: Source: path/to/file.tsx
      const altSourceMatch = content.match(/Source:\s*([^\n]+)/);
      if (altSourceMatch) {
        context.filePath = altSourceMatch[1].replace(/`/g, '').trim();
      }
    }

    // Try to extract props from JSON block
    const propsMatch = content.match(/```json\n([\s\S]*?)\n```/);
    if (propsMatch) {
      try {
        context.props = JSON.parse(propsMatch[1]);
      } catch (e) {
        // Ignore JSON parse errors
      }
    }

    // Try to extract props from Props: section
    if (Object.keys(context.props).length === 0) {
      const propsSection = content.match(/Props?:[\s\n]*([\s\S]*?)(?=\n##|\n\*\*|$)/i);
      if (propsSection) {
        // Try to parse as JSON-like object
        const propsText = propsSection[1].trim();
        if (propsText.startsWith('{')) {
          try {
            context.props = JSON.parse(propsText);
          } catch (e) {
            // Store as raw text
            context.props = { _raw: propsText };
          }
        }
      }
    }

    // Extract element info
    const tagMatch = content.match(/Tag:\s*`?(\w+)`?/i);
    if (tagMatch) {
      context.tagName = tagMatch[1];
    }

    const idMatch = content.match(/ID:\s*`?([^`\n]+)`?/i);
    if (idMatch) {
      context.id = idMatch[1];
    }

    const classMatch = content.match(/Class(?:es)?:\s*`?([^`\n]+)`?/i);
    if (classMatch) {
      context.className = classMatch[1];
    }

    return context;
  } catch (error) {
    console.error('[React Grab Bridge] Error parsing react-grab content:', error);
    return null;
  }
}

/**
 * Show prompt when React app is detected but react-grab is not explicitly found
 * This happens when react-grab is loaded via npm import (no globals)
 */
function showReactAppDetectedPrompt() {
  // Don't show if already showing or react-grab is loaded
  if (document.getElementById('react-grab-load-prompt') || hasReactGrabApi) return;

  const prompt = document.createElement('div');
  prompt.id = 'react-grab-load-prompt';
  prompt.className = 'react-grab-load-prompt react-grab-info-prompt';
  prompt.innerHTML = `
    <div class="react-grab-load-prompt-content">
      <p><strong>React app detected!</strong></p>
      <p class="react-grab-prompt-hint">
        If react-grab is installed, use:<br>
        <code>Option/Alt + hover</code> to highlight, then <code>Cmd/Ctrl + C</code> to copy
      </p>
      <div class="react-grab-load-prompt-actions">
        <button id="react-grab-load-cdn" class="react-grab-btn react-grab-btn-primary">
          Load react-grab
        </button>
        <button id="react-grab-load-dismiss" class="react-grab-btn react-grab-btn-secondary">
          Got it
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(prompt);

  document.getElementById('react-grab-load-cdn').onclick = () => {
    loadReactGrabFromCDN();
    prompt.remove();
  };

  document.getElementById('react-grab-load-dismiss').onclick = () => {
    prompt.remove();
  };

  // Auto-dismiss after 8 seconds
  setTimeout(() => {
    if (prompt.parentNode) {
      prompt.remove();
    }
  }, 8000);
}

/**
 * Show prompt to load react-grab from CDN (when no React or react-grab is found)
 */
function showLoadReactGrabPrompt() {
  // Don't show if already showing or react-grab is loaded
  if (document.getElementById('react-grab-load-prompt') || hasReactGrabApi) return;

  const prompt = document.createElement('div');
  prompt.id = 'react-grab-load-prompt';
  prompt.className = 'react-grab-load-prompt';
  prompt.innerHTML = `
    <div class="react-grab-load-prompt-content">
      <p>react-grab not detected on this page.</p>
      <div class="react-grab-load-prompt-actions">
        <button id="react-grab-load-cdn" class="react-grab-btn react-grab-btn-primary">
          Load from CDN
        </button>
        <button id="react-grab-load-dismiss" class="react-grab-btn react-grab-btn-secondary">
          Dismiss
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(prompt);

  document.getElementById('react-grab-load-cdn').onclick = () => {
    loadReactGrabFromCDN();
    prompt.remove();
  };

  document.getElementById('react-grab-load-dismiss').onclick = () => {
    prompt.remove();
  };

  // Auto-dismiss after 10 seconds
  setTimeout(() => {
    if (prompt.parentNode) {
      prompt.remove();
    }
  }, 10000);
}

/**
 * Show component dialog with editable context and AI options
 */
function showComponentDialog(context) {
  // Remove existing dialog if any
  const existingDialog = document.getElementById('react-grab-dialog');
  if (existingDialog) {
    existingDialog.remove();
  }

  // Create dialog
  const dialog = document.createElement('div');
  dialog.id = 'react-grab-dialog';
  dialog.className = 'react-grab-dialog';

  // Format initial markdown context
  const initialMarkdown = context.markdown || generateDefaultMarkdown(context);

  dialog.innerHTML = `
    <div class="react-grab-dialog-content">
      <div class="react-grab-dialog-header">
        <h3>React Component Captured</h3>
        <button class="react-grab-dialog-close" id="react-grab-close">&times;</button>
      </div>

      <div class="react-grab-dialog-body">
        <!-- Component summary -->
        <div class="react-grab-component-summary">
          <span class="component-name">${escapeHtml(context.componentName || 'Unknown')}</span>
          ${context.filePath ? `<span class="file-path">${escapeHtml(context.filePath)}</span>` : ''}
        </div>

        <!-- Editable markdown context -->
        <div class="react-grab-context-section">
          <label for="react-grab-context">Component Context (editable):</label>
          <textarea
            id="react-grab-context"
            class="react-grab-context-editor"
            spellcheck="false"
          >${escapeHtml(initialMarkdown)}</textarea>
        </div>

        <!-- Additional prompt -->
        <div class="react-grab-additional-prompt">
          <label for="react-grab-prompt">Additional instructions (optional):</label>
          <textarea
            id="react-grab-prompt"
            class="react-grab-prompt-input"
            placeholder="e.g., Add dark mode support, Fix the styling, Explain how this component works..."
            rows="2"
          ></textarea>
        </div>

        <!-- Copy button -->
        <div class="react-grab-copy-actions">
          <button id="react-grab-copy-context" class="react-grab-btn react-grab-btn-secondary">
            Copy Context
          </button>
        </div>

        <!-- Separate AI buttons -->
        <div class="react-grab-ai-buttons">
          <button id="react-grab-send-copilot" class="react-grab-btn react-grab-btn-copilot">
            <span class="btn-icon">🤖</span>
            <span>Send to Copilot</span>
          </button>
          <button id="react-grab-send-claude" class="react-grab-btn react-grab-btn-claude">
            <span class="btn-icon">🧠</span>
            <span>Send to Claude</span>
          </button>
        </div>

        <!-- Cancel -->
        <div class="react-grab-dialog-footer">
          <button id="react-grab-cancel" class="react-grab-btn react-grab-btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(dialog);

  // Get elements
  const contextTextarea = document.getElementById('react-grab-context');
  const promptTextarea = document.getElementById('react-grab-prompt');
  const closeBtn = document.getElementById('react-grab-close');
  const cancelBtn = document.getElementById('react-grab-cancel');
  const copyContextBtn = document.getElementById('react-grab-copy-context');
  const sendCopilotBtn = document.getElementById('react-grab-send-copilot');
  const sendClaudeBtn = document.getElementById('react-grab-send-claude');

  // Focus on prompt textarea
  promptTextarea.focus();

  // Handle copy context
  copyContextBtn.onclick = async () => {
    const contextValue = contextTextarea.value;
    try {
      await navigator.clipboard.writeText(contextValue);
      showNotification('Context copied to clipboard', 'success');
    } catch (err) {
      showNotification('Failed to copy to clipboard', 'error');
    }
  };

  // Handle send to Copilot
  sendCopilotBtn.onclick = () => {
    sendToAI('copilot', contextTextarea.value, promptTextarea.value, context);
    dialog.remove();
  };

  // Handle send to Claude
  sendClaudeBtn.onclick = () => {
    sendToAI('claude', contextTextarea.value, promptTextarea.value, context);
    dialog.remove();
  };

  // Handle close
  closeBtn.onclick = () => {
    dialog.remove();
  };

  // Handle cancel
  cancelBtn.onclick = () => {
    dialog.remove();
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e) => {
    // Escape to close
    if (e.key === 'Escape') {
      dialog.remove();
      document.removeEventListener('keydown', handleKeyDown);
    }

    // Cmd/Ctrl + Enter to send to Copilot (default)
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (e.shiftKey) {
        // Cmd/Ctrl + Shift + Enter for Claude
        sendClaudeBtn.click();
      } else {
        // Cmd/Ctrl + Enter for Copilot
        sendCopilotBtn.click();
      }
      document.removeEventListener('keydown', handleKeyDown);
    }
  };

  document.addEventListener('keydown', handleKeyDown);

  // Click outside to close
  dialog.onclick = (e) => {
    if (e.target === dialog) {
      dialog.remove();
      document.removeEventListener('keydown', handleKeyDown);
    }
  };
}

/**
 * Send context and prompt to AI assistant
 */
function sendToAI(target, contextValue, additionalPrompt, originalContext) {
  // Build the final prompt
  let finalPrompt = '';

  if (additionalPrompt.trim()) {
    finalPrompt = additionalPrompt.trim();
  } else {
    finalPrompt = 'Analyze this React component:';
  }

  // Send to VSCode
  sendToVSCode('prompt', {
    prompt: finalPrompt,
    target: target,
    elementInfo: {
      componentName: originalContext.componentName,
      jsx: originalContext.jsx,
      props: originalContext.props,
      filePath: originalContext.filePath,
      path: originalContext.path,
      tagName: originalContext.tagName,
      className: originalContext.className,
      id: originalContext.id,
      markdownContext: contextValue
    }
  });
}

/**
 * Generate default markdown if not provided
 */
function generateDefaultMarkdown(context) {
  let markdown = `## ${context.componentName || 'Unknown'}\n\n`;

  if (context.filePath) {
    markdown += `**Source:** \`${context.filePath}\`\n\n`;
  }

  if (context.path) {
    markdown += `**Element Path:** \`${context.path}\`\n\n`;
  }

  if (context.jsx) {
    markdown += `### JSX\n\`\`\`jsx\n${context.jsx}\n\`\`\`\n\n`;
  }

  if (context.props && Object.keys(context.props).length > 0) {
    markdown += `### Props\n\`\`\`json\n${JSON.stringify(context.props, null, 2)}\n\`\`\`\n\n`;
  }

  if (context.tagName) {
    markdown += `### Element Info\n`;
    markdown += `- **Tag:** \`${context.tagName}\`\n`;
    if (context.id) {
      markdown += `- **ID:** \`${context.id}\`\n`;
    }
    if (context.className) {
      markdown += `- **Classes:** \`${context.className}\`\n`;
    }
  }

  return markdown;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Setup clipboard listener to detect react-grab copy events
 * react-grab copies component info to clipboard when element is selected
 */
function setupClipboardListener() {
  // Listen for copy events
  document.addEventListener('copy', handleCopyEvent);

  // Also periodically check clipboard for react-grab content
  // This is a fallback for when copy event is not triggered
  let lastClipboardContent = '';

  async function checkClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text !== lastClipboardContent) {
        // Check if it looks like react-grab markdown output
        if (isReactGrabContent(text)) {
          lastClipboardContent = text;
          console.log('[React Grab Bridge] Detected react-grab content in clipboard');
          const context = parseReactGrabContent(text);
          if (context) {
            showComponentDialog(context);
          }
        }
      }
    } catch (err) {
      // Clipboard access might be denied - this is normal
    }
  }

  // Check clipboard when window gains focus (user might have copied in react-grab)
  window.addEventListener('focus', () => {
    setTimeout(checkClipboard, 100);
  });
}

/**
 * Handle copy event to detect react-grab output
 */
function handleCopyEvent(event) {
  // Small delay to let react-grab update the clipboard
  setTimeout(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && isReactGrabContent(text)) {
        console.log('[React Grab Bridge] Detected react-grab copy event');
        const context = parseReactGrabContent(text);
        if (context) {
          showComponentDialog(context);
        }
      }
    } catch (err) {
      // Clipboard access might be denied
    }
  }, 100);
}

/**
 * Check if text content looks like react-grab output
 */
function isReactGrabContent(text) {
  if (!text || typeof text !== 'string') return false;

  // react-grab outputs markdown with specific patterns
  // Check for common patterns in react-grab output
  const patterns = [
    /^##\s+\w+/m,                    // Markdown heading with component name
    /\*\*Source:\*\*/,               // Source file indicator
    /```jsx/,                        // JSX code block
    /```json/,                       // JSON code block (for props)
    /<[A-Z][a-zA-Z]*[\s/>]/,         // JSX component tag
  ];

  // Must match at least 2 patterns to be considered react-grab content
  let matchCount = 0;
  for (const pattern of patterns) {
    if (pattern.test(text)) {
      matchCount++;
      if (matchCount >= 2) return true;
    }
  }

  // Also check for JSX-like content
  if (text.includes('<') && (text.includes('/>') || text.includes('</'))) {
    // Check if it has component-like structure
    if (/^<[A-Z]/.test(text.trim()) || /\n<[A-Z]/.test(text)) {
      return true;
    }
  }

  return false;
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
      indicator.textContent = 'Connected to VSCode';
      indicator.style.display = 'block';
      setTimeout(() => {
        if (indicator) indicator.style.display = 'none';
      }, 3000);
      break;
    case 'disconnected':
      indicator.textContent = 'Disconnected from VSCode';
      indicator.style.display = 'block';
      break;
    case 'error':
      indicator.textContent = 'Connection Error';
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

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'checkConnection') {
    sendResponse({ connected: isConnected, enabled: extensionEnabled });
  } else if (request.type === 'toggleExtension') {
    extensionEnabled = request.enabled;
    handleExtensionToggle(request.enabled);
  } else if (request.type === 'activateReactGrab') {
    // Activate react-grab from popup
    window.postMessage({ type: 'react-grab-activate' }, '*');
    sendResponse({ success: true });
  }
  return true;
});

// Handle extension toggle
function handleExtensionToggle(enabled) {
  extensionEnabled = enabled;

  if (!enabled) {
    // Disable all features
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

// Initialize
async function initialize() {
  console.log('[React Grab Bridge] Initializing...');

  // Check if extension is enabled for this host
  const enabled = await checkHostSettings();

  if (enabled) {
    // Inject the inject.js script first
    injectScript();

    // Connect to VSCode
    connectWebSocket();

    // Setup listeners for react-grab events
    setupReactGrabListeners();

    // Check for react-grab after a short delay
    setTimeout(() => {
      checkReactGrabAvailability();
    }, 1000);

    // Also listen for clipboard copy events (fallback for react-grab)
    setupClipboardListener();

    // Show instructions
    console.log(`
╔══════════════════════════════════════════════════════╗
║     React Grab to VSCode/AI Bridge Active            ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║ react-grab will be automatically detected or loaded. ║
║                                                      ║
║ Use the react-grab shortcut (usually Option/Alt +   ║
║ Click) to select React components.                  ║
║                                                      ║
║ A dialog will appear to send the component to:       ║
║   - GitHub Copilot                                   ║
║   - Claude Code                                      ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
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
  if (ws) {
    ws.close();
  }
});
