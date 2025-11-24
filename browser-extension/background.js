/**
 * Background service worker for the Chrome Extension
 */

// Store connection status
let connectionStatus = 'disconnected';

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'getStatus') {
    sendResponse({ status: connectionStatus });
  } else if (request.type === 'updateStatus') {
    connectionStatus = request.status;
    // Update badge to show connection status
    updateBadge(connectionStatus);
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

// Initialize badge
updateBadge('disconnected');

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('React Grab to Copilot Bridge installed');
});