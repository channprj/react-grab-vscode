/**
 * Background service worker for the Chrome Extension
 */

// Store connection status
let connectionStatus = 'disconnected';
let hostStatuses = {}; // Track status per host

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'getStatus') {
    sendResponse({ status: connectionStatus });
  } else if (request.type === 'updateStatus') {
    connectionStatus = request.status;
    // Update badge to show connection status
    updateBadge(connectionStatus);
  } else if (request.type === 'hostStatus' && sender.tab) {
    // Store status for specific host
    const url = new URL(sender.tab.url);
    hostStatuses[url.hostname] = request.enabled;
    updateBadgeForTab(sender.tab.id, request.enabled);
  }
  return true;
});

// Update extension badge based on connection status
function updateBadge(status) {
  switch (status) {
    case 'connected':
      chrome.action.setBadgeText({ text: '✓' });
      chrome.action.setBadgeBackgroundColor({ color: '#2da44e' });
      break;
    case 'disconnected':
      chrome.action.setBadgeText({ text: '✗' });
      chrome.action.setBadgeBackgroundColor({ color: '#d1242f' });
      break;
    case 'error':
      chrome.action.setBadgeText({ text: '!' });
      chrome.action.setBadgeBackgroundColor({ color: '#fb8500' });
      break;
    default:
      chrome.action.setBadgeText({ text: '' });
  }
}

// Update badge for specific tab
function updateBadgeForTab(tabId, enabled) {
  if (enabled) {
    chrome.action.setBadgeText({ text: '✓', tabId: tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#2da44e', tabId: tabId });
  } else {
    chrome.action.setBadgeText({ text: 'OFF', tabId: tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#6c757d', tabId: tabId });
  }
}

// Check and update badge when tab is activated
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (tab.url) {
    try {
      const url = new URL(tab.url);
      const hostname = url.hostname;

      // Check if extension is enabled for this host
      const settings = await chrome.storage.sync.get(['disabledHosts']);
      const disabledHosts = settings.disabledHosts || [];

      if (disabledHosts.includes(hostname)) {
        updateBadgeForTab(activeInfo.tabId, false);
      } else {
        // Check actual connection status from content script
        chrome.tabs.sendMessage(activeInfo.tabId, { type: 'checkConnection' }, (response) => {
          if (chrome.runtime.lastError) {
            // Content script not loaded
            updateBadge('disconnected');
          } else if (response) {
            updateBadgeForTab(activeInfo.tabId, response.enabled !== false);
          }
        });
      }
    } catch (e) {
      // Invalid URL
      updateBadge('disconnected');
    }
  }
});

// Initialize badge
updateBadge('disconnected');

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('React Grab to Copilot Bridge installed');
});