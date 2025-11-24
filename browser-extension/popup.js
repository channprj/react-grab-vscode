/**
 * Popup script for the extension popup window
 */

let currentTab = null;
let currentHost = null;

// Initialize popup when opened
document.addEventListener('DOMContentLoaded', async () => {
  // Get current tab information
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tabs[0];

  if (currentTab && currentTab.url) {
    try {
      const url = new URL(currentTab.url);
      currentHost = url.hostname;

      // Update UI with current host
      document.getElementById('current-host').textContent = currentHost;

      // Load saved settings for this host
      await loadHostSettings();

      // Check connection status
      checkConnectionStatus();

    } catch (e) {
      // Invalid URL (like chrome:// pages)
      document.getElementById('current-host').textContent = 'Invalid page';
      document.getElementById('toggle-status').textContent = 'Cannot run on this page';
      document.getElementById('site-toggle').disabled = true;
    }
  }
});

// Load saved settings for the current host
async function loadHostSettings() {
  if (!currentHost) return;

  const settings = await chrome.storage.sync.get(['enabledHosts', 'disabledHosts']);
  const enabledHosts = settings.enabledHosts || [];
  const disabledHosts = settings.disabledHosts || [];

  const toggle = document.getElementById('site-toggle');
  const statusText = document.getElementById('toggle-status');

  // Check if host is explicitly disabled
  if (disabledHosts.includes(currentHost)) {
    toggle.checked = false;
    statusText.textContent = 'Extension disabled for this site';
    statusText.style.color = '#991b1b';
  } else {
    // Default to enabled if not explicitly disabled
    toggle.checked = true;
    statusText.textContent = 'Extension enabled for this site';
    statusText.style.color = '#065f46';
  }

  // Enable the toggle
  toggle.disabled = false;

  // Add event listener for toggle changes
  toggle.addEventListener('change', async (e) => {
    await saveHostSetting(e.target.checked);
  });
}

// Save host setting
async function saveHostSetting(enabled) {
  if (!currentHost) return;

  const settings = await chrome.storage.sync.get(['enabledHosts', 'disabledHosts']);
  let enabledHosts = settings.enabledHosts || [];
  let disabledHosts = settings.disabledHosts || [];

  const statusText = document.getElementById('toggle-status');

  if (enabled) {
    // Remove from disabled list
    disabledHosts = disabledHosts.filter(host => host !== currentHost);
    // Add to enabled list if not already there
    if (!enabledHosts.includes(currentHost)) {
      enabledHosts.push(currentHost);
    }

    statusText.textContent = 'Extension enabled for this site';
    statusText.style.color = '#065f46';

    // Notify content script to enable
    chrome.tabs.sendMessage(currentTab.id, {
      type: 'toggleExtension',
      enabled: true
    });

  } else {
    // Add to disabled list
    if (!disabledHosts.includes(currentHost)) {
      disabledHosts.push(currentHost);
    }
    // Remove from enabled list
    enabledHosts = enabledHosts.filter(host => host !== currentHost);

    statusText.textContent = 'Extension disabled for this site';
    statusText.style.color = '#991b1b';

    // Notify content script to disable
    chrome.tabs.sendMessage(currentTab.id, {
      type: 'toggleExtension',
      enabled: false
    });
  }

  // Save settings
  await chrome.storage.sync.set({
    enabledHosts: enabledHosts,
    disabledHosts: disabledHosts
  });

  console.log('Settings saved:', { enabledHosts, disabledHosts });
}

// Check connection status with VSCode
function checkConnectionStatus() {
  chrome.tabs.sendMessage(currentTab.id, { type: 'checkConnection' }, (response) => {
    if (chrome.runtime.lastError) {
      // Content script not loaded yet
      updateStatus('disconnected');
      return;
    }

    if (response && response.connected) {
      updateStatus('connected');
    } else {
      updateStatus('disconnected');
    }
  });
}

// Get status from background script
chrome.runtime.sendMessage({ type: 'getStatus' }, (response) => {
  if (response && response.status) {
    updateStatus(response.status);
  }
});

// Update connection status display
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

// Listen for status updates from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'statusUpdate') {
    updateStatus(request.status);
  }
});