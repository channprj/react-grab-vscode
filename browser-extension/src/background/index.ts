/**
 * React Grab Bridge - Background Service Worker
 */

// Track extension state
let extensionState = {
  status: 'disconnected' as 'connected' | 'disconnected' | 'error',
}

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === 'getStatus') {
    sendResponse({ status: extensionState.status })
  } else if (request.type === 'updateStatus') {
    extensionState.status = request.status
    // Update badge
    updateBadge(request.status)
  }
  return true
})

// Update extension badge based on connection status
function updateBadge(status: 'connected' | 'disconnected' | 'error') {
  if (status === 'connected') {
    chrome.action.setBadgeText({ text: '●' })
    chrome.action.setBadgeBackgroundColor({ color: '#22c55e' })
  } else if (status === 'error') {
    chrome.action.setBadgeText({ text: '!' })
    chrome.action.setBadgeBackgroundColor({ color: '#eab308' })
  } else {
    chrome.action.setBadgeText({ text: '' })
  }
}

// Initialize badge
updateBadge('disconnected')

console.log('[React Grab Bridge] Background service worker started')
