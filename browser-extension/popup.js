/**
 * Popup script for the extension popup window
 */

// Check connection status when popup opens
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  chrome.tabs.sendMessage(tabs[0].id, { type: 'checkConnection' }, (response) => {
    if (response && response.connected) {
      updateStatus('connected');
    } else {
      updateStatus('disconnected');
    }
  });
});

// Get status from background script
chrome.runtime.sendMessage({ type: 'getStatus' }, (response) => {
  if (response && response.status) {
    updateStatus(response.status);
  }
});

function updateStatus(status) {
  const statusElement = document.getElementById('status');
  const statusText = document.getElementById('status-text');

  statusElement.className = `status ${status}`;

  switch (status) {
    case 'connected':
      statusText.textContent = 'Connected to VSCode';
      statusElement.innerHTML = '<span class="status-icon">🟢</span>' +
                               '<span id="status-text">Connected to VSCode</span>';
      break;
    case 'disconnected':
      statusText.textContent = 'Disconnected from VSCode';
      statusElement.innerHTML = '<span class="status-icon">🔴</span>' +
                               '<span id="status-text">Disconnected from VSCode</span>';
      break;
    case 'error':
      statusText.textContent = 'Connection Error';
      statusElement.innerHTML = '<span class="status-icon">⚠️</span>' +
                               '<span id="status-text">Connection Error</span>';
      break;
  }
}