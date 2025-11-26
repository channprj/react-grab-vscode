/**
 * React Grab Bridge - Content Script
 *
 * Activates when Option (Alt) key is held:
 * - Shows crosshair cursor
 * - Highlights React components on hover
 * - Click to select and open prompt modal
 * - Send to Copilot or Claude Code
 */

(function() {
  'use strict';

  // ============================================
  // Configuration
  // ============================================
  const WS_PORT = 9765;
  const WS_URL = `ws://localhost:${WS_PORT}`;
  const KEY_HOLD_DURATION = 150; // ms to hold key before activation

  // ============================================
  // State
  // ============================================
  let ws = null;
  let isConnected = false;
  let reconnectAttempts = 0;
  const MAX_RECONNECT_ATTEMPTS = 5;

  let isGrabMode = false;
  let keyDownTime = null;
  let keyHoldTimer = null;
  let currentElement = null;
  let currentContext = null;
  let mouseX = 0;
  let mouseY = 0;
  let requestId = 0;
  const pendingRequests = new Map();

  // Extension state
  let extensionEnabled = true;
  const currentHost = window.location.hostname;

  // ============================================
  // DOM Elements
  // ============================================
  let overlay = null;
  let label = null;
  let crosshairH = null;
  let crosshairV = null;

  // ============================================
  // Initialization
  // ============================================
  function init() {
    console.log('[React Grab Bridge] Initializing...');

    // Inject the page-context script
    injectScript();

    // Check host settings
    checkHostSettings().then(enabled => {
      if (enabled) {
        // Setup event listeners
        setupKeyListeners();
        setupMouseListeners();
        setupMessageListeners();

        // Connect to VSCode
        connectWebSocket();

        // Create overlay elements
        createOverlayElements();

        console.log('[React Grab Bridge] Ready. Hold Option (Alt) to activate.');
      }
    });
  }

  // ============================================
  // Script Injection
  // ============================================
  function injectScript() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('inject.js');
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
  }

  // ============================================
  // WebSocket Connection
  // ============================================
  function connectWebSocket() {
    if (!extensionEnabled) return;

    try {
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log('[React Grab Bridge] Connected to VSCode');
        isConnected = true;
        reconnectAttempts = 0;
        showNotification('Connected to VSCode', 'success');
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleServerMessage(message);
      };

      ws.onclose = () => {
        console.log('[React Grab Bridge] Disconnected from VSCode');
        isConnected = false;
        attemptReconnect();
      };

      ws.onerror = (error) => {
        console.error('[React Grab Bridge] WebSocket error:', error);
      };

    } catch (error) {
      console.error('[React Grab Bridge] Failed to connect:', error);
      attemptReconnect();
    }
  }

  function attemptReconnect() {
    if (!extensionEnabled || reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return;

    reconnectAttempts++;
    setTimeout(connectWebSocket, 1000 * reconnectAttempts);
  }

  function sendToVSCode(type, data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, ...data, timestamp: Date.now() }));
    } else {
      showNotification('Not connected to VSCode', 'error');
    }
  }

  function handleServerMessage(message) {
    switch (message.type) {
      case 'success':
        showNotification('Prompt sent successfully!', 'success');
        break;
      case 'error':
        showNotification(message.message || 'Error occurred', 'error');
        break;
    }
  }

  // ============================================
  // Overlay Elements
  // ============================================
  function createOverlayElements() {
    // Create horizontal crosshair line
    crosshairH = document.createElement('div');
    crosshairH.className = 'react-grab-crosshair-h';
    crosshairH.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 2147483645;
      left: 0;
      right: 0;
      height: 1px;
      background: rgba(139, 92, 246, 0.5);
      display: none;
    `;
    document.body.appendChild(crosshairH);

    // Create vertical crosshair line
    crosshairV = document.createElement('div');
    crosshairV.className = 'react-grab-crosshair-v';
    crosshairV.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 2147483645;
      top: 0;
      bottom: 0;
      width: 1px;
      background: rgba(139, 92, 246, 0.5);
      display: none;
    `;
    document.body.appendChild(crosshairV);

    // Create highlight overlay
    overlay = document.createElement('div');
    overlay.className = 'react-grab-bridge-overlay';
    overlay.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 2147483646;
      border: 1px dashed rgba(139, 92, 246, 0.7);
      background: rgba(139, 92, 246, 0.06);
      border-radius: 2px;
      display: none;
      transition: all 0.05s ease-out;
    `;
    document.body.appendChild(overlay);

    // Create component label
    label = document.createElement('div');
    label.className = 'react-grab-bridge-label';
    label.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 2147483647;
      background: rgba(139, 92, 246, 0.9);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-family: -apple-system, BlinkMacSystemFont, 'SF Mono', Monaco, monospace;
      font-size: 12px;
      font-weight: 500;
      display: none;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    `;
    document.body.appendChild(label);
  }

  function showOverlay(rect, context) {
    if (!overlay || !label) return;

    const componentName = context?.componentName || 'Unknown';

    overlay.style.top = `${rect.top}px`;
    overlay.style.left = `${rect.left}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    overlay.style.display = 'block';

    // Build detailed label content
    let labelContent = `<span class="react-grab-label-name">${escapeHtml(componentName)}</span>`;

    // Add source file if available
    if (context?.source?.fileName) {
      const shortPath = context.source.fileName.replace(/^.*[\/\\]/, '');
      labelContent += `<span class="react-grab-label-file">${escapeHtml(shortPath)}</span>`;
    }

    // Add size info
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    labelContent += `<span class="react-grab-label-size">${width}×${height}</span>`;

    label.innerHTML = labelContent;

    // Position label above element, or below if not enough space
    let labelTop = rect.top - 28;
    if (labelTop < 4) {
      labelTop = rect.bottom + 4;
    }

    let labelLeft = rect.left;
    // Keep label in viewport
    if (labelLeft + 250 > window.innerWidth) {
      labelLeft = window.innerWidth - 250;
    }
    if (labelLeft < 4) {
      labelLeft = 4;
    }

    label.style.top = `${labelTop}px`;
    label.style.left = `${labelLeft}px`;
    label.style.display = 'block';
  }

  function hideOverlay() {
    if (overlay) overlay.style.display = 'none';
    if (label) label.style.display = 'none';
  }

  // ============================================
  // Key Event Handlers
  // ============================================
  function setupKeyListeners() {
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('keyup', handleKeyUp, true);
    window.addEventListener('blur', deactivateGrabMode);
  }

  function handleKeyDown(event) {
    // Check for Alt (Option) key
    if (event.key === 'Alt' && !isGrabMode) {
      if (!keyDownTime) {
        keyDownTime = Date.now();
        keyHoldTimer = setTimeout(() => {
          activateGrabMode();
        }, KEY_HOLD_DURATION);
      }
    }

    // Escape to deactivate
    if (event.key === 'Escape' && isGrabMode) {
      deactivateGrabMode();
      event.preventDefault();
      event.stopPropagation();
    }
  }

  function handleKeyUp(event) {
    if (event.key === 'Alt') {
      if (keyHoldTimer) {
        clearTimeout(keyHoldTimer);
        keyHoldTimer = null;
      }
      keyDownTime = null;

      if (isGrabMode) {
        deactivateGrabMode();
      }
    }
  }

  // ============================================
  // Grab Mode
  // ============================================
  function activateGrabMode() {
    if (isGrabMode) return;

    isGrabMode = true;
    document.body.style.cursor = 'crosshair';
    document.documentElement.style.cursor = 'crosshair';

    // Add grab-mode class for styling
    document.body.classList.add('react-grab-bridge-active');

    // Show crosshair lines
    if (crosshairH) {
      crosshairH.style.display = 'block';
      crosshairH.style.top = `${mouseY}px`;
    }
    if (crosshairV) {
      crosshairV.style.display = 'block';
      crosshairV.style.left = `${mouseX}px`;
    }

    // Update overlay at current mouse position
    updateHoverElement();

    console.log('[React Grab Bridge] Grab mode activated');
  }

  function deactivateGrabMode() {
    if (!isGrabMode) return;

    isGrabMode = false;
    document.body.style.cursor = '';
    document.documentElement.style.cursor = '';
    document.body.classList.remove('react-grab-bridge-active');

    hideOverlay();
    hideCrosshair();
    currentElement = null;
    currentContext = null;

    if (keyHoldTimer) {
      clearTimeout(keyHoldTimer);
      keyHoldTimer = null;
    }
    keyDownTime = null;

    console.log('[React Grab Bridge] Grab mode deactivated');
  }

  function hideCrosshair() {
    if (crosshairH) crosshairH.style.display = 'none';
    if (crosshairV) crosshairV.style.display = 'none';
  }

  // ============================================
  // Mouse Event Handlers
  // ============================================
  function setupMouseListeners() {
    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('click', handleClick, true);
  }

  function handleMouseMove(event) {
    mouseX = event.clientX;
    mouseY = event.clientY;

    if (isGrabMode) {
      // Update crosshair position
      if (crosshairH) crosshairH.style.top = `${mouseY}px`;
      if (crosshairV) crosshairV.style.left = `${mouseX}px`;

      updateHoverElement();
    }
  }

  function handleClick(event) {
    if (!isGrabMode) return;

    // Prevent default click behavior
    event.preventDefault();
    event.stopPropagation();

    if (currentContext) {
      // Save context before deactivating (deactivateGrabMode sets currentContext = null)
      const context = currentContext;
      deactivateGrabMode();
      showComponentDialog(context);
    }
  }

  function updateHoverElement() {
    if (!isGrabMode) return;

    const id = ++requestId;
    pendingRequests.set(id, 'hover');

    window.postMessage({
      type: 'GRAB_GET_ELEMENT_AT_POINT',
      x: mouseX,
      y: mouseY,
      requestId: id
    }, '*');
  }

  // ============================================
  // Message Handlers (from inject.js)
  // ============================================
  function setupMessageListeners() {
    window.addEventListener('message', (event) => {
      if (event.source !== window) return;

      switch (event.data.type) {
        case 'GRAB_ELEMENT_FOUND': {
          const { requestId: id, context, rect } = event.data;
          if (pendingRequests.get(id) === 'hover') {
            pendingRequests.delete(id);
            currentContext = context;
            if (context && rect) {
              showOverlay(rect, context);
            }
          }
          break;
        }

        case 'GRAB_ELEMENT_NOT_FOUND': {
          const { requestId: id } = event.data;
          if (pendingRequests.get(id) === 'hover') {
            pendingRequests.delete(id);
            hideOverlay();
            currentContext = null;
          }
          break;
        }

        case 'GRAB_REACT_CHECK_RESULT': {
          if (!event.data.hasReact) {
            console.log('[React Grab Bridge] No React detected on this page');
          }
          break;
        }
      }
    });
  }

  // ============================================
  // Component Dialog
  // ============================================
  function showComponentDialog(context) {
    // Remove existing dialog
    const existing = document.getElementById('react-grab-dialog');
    if (existing) existing.remove();

    const dialog = document.createElement('div');
    dialog.id = 'react-grab-dialog';
    dialog.className = 'react-grab-dialog';

    const markdown = context.markdown || generateMarkdown(context);

    dialog.innerHTML = `
      <div class="react-grab-dialog-content">
        <div class="react-grab-dialog-header">
          <div class="react-grab-dialog-title">
            <span class="react-grab-component-icon">⚛️</span>
            <h3>${escapeHtml(context.componentName)}</h3>
            ${context.source?.fileName ? `<span class="react-grab-file-badge">${escapeHtml(context.source.fileName.replace(/^.*[\/\\]/, ''))}</span>` : ''}
          </div>
          <button class="react-grab-dialog-close" id="react-grab-close">&times;</button>
        </div>

        <div class="react-grab-dialog-body">
          <div class="react-grab-context-section">
            <label>Component Context:</label>
            <textarea
              id="react-grab-context"
              class="react-grab-context-editor"
              spellcheck="false"
            >${escapeHtml(markdown)}</textarea>
          </div>

          <div class="react-grab-prompt-section">
            <label>Your prompt:</label>
            <textarea
              id="react-grab-prompt"
              class="react-grab-prompt-input"
              placeholder="What would you like to do with this component? (e.g., Add dark mode, Fix styling, Explain the code...)"
              rows="3"
            ></textarea>
          </div>

          <div class="react-grab-ai-buttons">
            <button id="react-grab-send-copilot" class="react-grab-btn react-grab-btn-copilot">
              <span class="btn-icon">🤖</span>
              Send to Copilot
            </button>
            <button id="react-grab-send-claude" class="react-grab-btn react-grab-btn-claude">
              <span class="btn-icon">🧠</span>
              Send to Claude
            </button>
          </div>

          <div class="react-grab-dialog-footer">
            <button id="react-grab-copy" class="react-grab-btn react-grab-btn-secondary">
              📋 Copy Context
            </button>
            <button id="react-grab-cancel" class="react-grab-btn react-grab-btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    // Focus prompt input
    const promptInput = document.getElementById('react-grab-prompt');
    promptInput.focus();

    // Event handlers
    document.getElementById('react-grab-close').onclick = () => dialog.remove();
    document.getElementById('react-grab-cancel').onclick = () => dialog.remove();

    document.getElementById('react-grab-copy').onclick = async () => {
      const contextText = document.getElementById('react-grab-context').value;
      try {
        await navigator.clipboard.writeText(contextText);
        showNotification('Copied to clipboard!', 'success');
      } catch (err) {
        showNotification('Failed to copy', 'error');
      }
    };

    document.getElementById('react-grab-send-copilot').onclick = () => {
      sendToAI('copilot', context);
      dialog.remove();
    };

    document.getElementById('react-grab-send-claude').onclick = () => {
      sendToAI('claude', context);
      dialog.remove();
    };

    // Keyboard shortcuts
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        dialog.remove();
        document.removeEventListener('keydown', handleKeyDown);
      }
      // Cmd/Ctrl + Enter to send
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (e.shiftKey) {
          document.getElementById('react-grab-send-claude').click();
        } else {
          document.getElementById('react-grab-send-copilot').click();
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

  function sendToAI(target, context) {
    const promptText = document.getElementById('react-grab-prompt').value.trim();
    const contextText = document.getElementById('react-grab-context').value;

    const finalPrompt = promptText || 'Analyze this React component:';

    sendToVSCode('prompt', {
      prompt: finalPrompt,
      target: target,
      elementInfo: {
        componentName: context.componentName,
        jsx: context.jsx,
        props: context.props,
        filePath: context.source?.fileName || null,
        tagName: context.element?.tagName || '',
        className: context.element?.className || '',
        id: context.element?.id || '',
        markdownContext: contextText
      }
    });
  }

  function generateMarkdown(context) {
    let md = `## ${context.componentName}\n\n`;

    if (context.source?.fileName) {
      md += `**Source:** \`${context.source.fileName}\`\n\n`;
    }

    if (context.jsx) {
      md += `### JSX\n\`\`\`jsx\n${context.jsx}\n\`\`\`\n\n`;
    }

    if (context.props && Object.keys(context.props).length > 0) {
      md += `### Props\n\`\`\`json\n${JSON.stringify(context.props, null, 2)}\n\`\`\`\n`;
    }

    return md;
  }

  // ============================================
  // Utilities
  // ============================================
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existing = document.querySelectorAll('.react-grab-notification');
    existing.forEach(n => n.remove());

    const notification = document.createElement('div');
    notification.className = `react-grab-notification react-grab-notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 300);
    }, 2500);
  }

  // ============================================
  // Host Settings
  // ============================================
  async function checkHostSettings() {
    try {
      const settings = await chrome.storage.sync.get(['disabledHosts']);
      const disabledHosts = settings.disabledHosts || [];
      if (disabledHosts.includes(currentHost)) {
        extensionEnabled = false;
        return false;
      }
      return true;
    } catch (error) {
      return true;
    }
  }

  // ============================================
  // Chrome Extension Message Handlers
  // ============================================
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'checkConnection') {
      sendResponse({ connected: isConnected, enabled: extensionEnabled });
    } else if (request.type === 'toggleExtension') {
      extensionEnabled = request.enabled;
      if (!extensionEnabled && ws) {
        ws.close();
      } else if (extensionEnabled && !ws) {
        connectWebSocket();
      }
    }
    return true;
  });

  // ============================================
  // Cleanup
  // ============================================
  window.addEventListener('beforeunload', () => {
    if (ws) ws.close();
  });

  // ============================================
  // Start
  // ============================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
