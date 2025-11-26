/**
 * React Grab Bridge - Content Script
 *
 * Activates when Option (Alt) key is held:
 * - Shows crosshair cursor
 * - Highlights React components on hover
 * - Click to select and open prompt modal
 * - Send to Copilot or Claude Code
 */

import ReactDOM from 'react-dom/client'
import { ComponentDialog } from './components/ComponentDialog'
import type { ComponentContext, Workspace } from './types'

// Configuration
const WS_PORTS = [9765, 9766, 9767, 9768, 9769]
const KEY_HOLD_DURATION = 150

// State
const connections = new Map<number, { ws: WebSocket; workspace: Workspace | null; isConnected: boolean }>()
let isGrabMode = false
let keyDownTime: number | null = null
let keyHoldTimer: ReturnType<typeof setTimeout> | null = null
let currentContext: ComponentContext | null = null
let mouseX = 0
let mouseY = 0
let requestId = 0
const pendingRequests = new Map<number, string>()
let extensionEnabled = true
const currentHost = window.location.hostname

// DOM Elements
let overlay: HTMLDivElement | null = null
let label: HTMLDivElement | null = null
let crosshairH: HTMLDivElement | null = null
let crosshairV: HTMLDivElement | null = null
let dialogRoot: ReactDOM.Root | null = null
let dialogContainer: HTMLDivElement | null = null

// Initialize
function init() {
  console.log('[React Grab Bridge] Initializing...')

  injectScript()

  checkHostSettings().then((enabled) => {
    if (enabled) {
      setupKeyListeners()
      setupMouseListeners()
      setupMessageListeners()
      startConnectionPolling()
      createOverlayElements()
      createDialogContainer()

      console.log('[React Grab Bridge] Ready. Hold Option (Alt) to activate.')
    }
  })
}

// Inject page-context script
function injectScript() {
  const script = document.createElement('script')
  script.src = chrome.runtime.getURL('inject.js')
  script.onload = () => script.remove()
  ;(document.head || document.documentElement).appendChild(script)
}

// WebSocket Connection
function connectToAllPorts() {
  if (!extensionEnabled) return
  WS_PORTS.forEach((port) => connectToPort(port))
}

function connectToPort(port: number) {
  if (connections.has(port)) {
    const conn = connections.get(port)
    if (conn?.ws?.readyState === WebSocket.OPEN) return
  }

  try {
    const ws = new WebSocket(`ws://localhost:${port}`)

    ws.onopen = () => {
      console.log(`[React Grab Bridge] Connected to VSCode on port ${port}`)
      connections.set(port, { ws, workspace: null, isConnected: true })
      updateConnectionStatus()
    }

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      handleServerMessage(port, message)
    }

    ws.onclose = () => {
      console.log(`[React Grab Bridge] Disconnected from port ${port}`)
      connections.delete(port)
      updateConnectionStatus()
    }

    ws.onerror = () => {
      connections.delete(port)
    }
  } catch {
    // Silent fail
  }
}

function updateConnectionStatus() {
  const connectedCount = getConnectedWorkspaces().length
  if (connectedCount > 0) {
    console.log(`[React Grab Bridge] Connected to ${connectedCount} VSCode instance(s)`)
  }
}

function getConnectedWorkspaces(): Workspace[] {
  const workspaces: Workspace[] = []
  connections.forEach((conn, port) => {
    if (conn.isConnected && conn.ws?.readyState === WebSocket.OPEN) {
      workspaces.push({
        port,
        name: conn.workspace?.name || `VSCode (port ${port})`,
        path: conn.workspace?.path || '',
      })
    }
  })
  return workspaces
}

function sendToVSCode(type: string, data: Record<string, unknown>, targetPort: number | null = null): boolean | 'multiple' {
  const workspaces = getConnectedWorkspaces()

  if (workspaces.length === 0) {
    showNotification('Not connected to VSCode', 'error')
    return false
  }

  if (targetPort) {
    const conn = connections.get(targetPort)
    if (conn?.ws?.readyState === WebSocket.OPEN) {
      conn.ws.send(JSON.stringify({ type, ...data, timestamp: Date.now() }))
      return true
    }
    return false
  }

  if (workspaces.length === 1) {
    const conn = connections.get(workspaces[0].port)
    conn?.ws.send(JSON.stringify({ type, ...data, timestamp: Date.now() }))
    return true
  }

  return 'multiple'
}

function handleServerMessage(port: number, message: { type: string; workspace?: Workspace; message?: string }) {
  switch (message.type) {
    case 'status':
      if (message.workspace) {
        const conn = connections.get(port)
        if (conn) {
          conn.workspace = message.workspace
          console.log(`[React Grab Bridge] Workspace "${message.workspace.name}" connected on port ${port}`)
        }
      }
      break
    case 'success':
      showNotification('Prompt sent successfully!', 'success')
      break
    case 'error':
      showNotification(message.message || 'Error occurred', 'error')
      break
  }
}

function startConnectionPolling() {
  connectToAllPorts()
  setInterval(() => {
    connectToAllPorts()
  }, 5000)
}

// Overlay Elements
function createOverlayElements() {
  crosshairH = document.createElement('div')
  crosshairH.className = 'react-grab-crosshair-h'
  Object.assign(crosshairH.style, {
    position: 'fixed',
    pointerEvents: 'none',
    zIndex: '2147483645',
    left: '0',
    right: '0',
    height: '1px',
    background: 'rgba(139, 92, 246, 0.5)',
    display: 'none',
  })
  document.body.appendChild(crosshairH)

  crosshairV = document.createElement('div')
  crosshairV.className = 'react-grab-crosshair-v'
  Object.assign(crosshairV.style, {
    position: 'fixed',
    pointerEvents: 'none',
    zIndex: '2147483645',
    top: '0',
    bottom: '0',
    width: '1px',
    background: 'rgba(139, 92, 246, 0.5)',
    display: 'none',
  })
  document.body.appendChild(crosshairV)

  overlay = document.createElement('div')
  overlay.className = 'react-grab-bridge-overlay'
  Object.assign(overlay.style, {
    position: 'fixed',
    pointerEvents: 'none',
    zIndex: '2147483646',
    border: '1px dashed rgba(139, 92, 246, 0.7)',
    background: 'rgba(139, 92, 246, 0.06)',
    borderRadius: '2px',
    display: 'none',
    transition: 'all 0.05s ease-out',
  })
  document.body.appendChild(overlay)

  label = document.createElement('div')
  label.className = 'react-grab-bridge-label'
  Object.assign(label.style, {
    position: 'fixed',
    pointerEvents: 'none',
    zIndex: '2147483647',
    background: 'rgba(139, 92, 246, 0.9)',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '4px',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Mono', Monaco, monospace",
    fontSize: '12px',
    fontWeight: '500',
    display: 'none',
    whiteSpace: 'nowrap',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
  })
  document.body.appendChild(label)
}

function createDialogContainer() {
  dialogContainer = document.createElement('div')
  dialogContainer.id = 'react-grab-dialog-root'
  document.body.appendChild(dialogContainer)
  dialogRoot = ReactDOM.createRoot(dialogContainer)
}

function showOverlay(rect: DOMRect, context: ComponentContext) {
  if (!overlay || !label) return

  const componentName = context?.componentName || 'Unknown'

  overlay.style.top = `${rect.top}px`
  overlay.style.left = `${rect.left}px`
  overlay.style.width = `${rect.width}px`
  overlay.style.height = `${rect.height}px`
  overlay.style.display = 'block'

  const shortPath = context?.source?.fileName?.replace(/^.*[/\\]/, '') || ''
  const width = Math.round(rect.width)
  const height = Math.round(rect.height)

  label.innerHTML = `
    <span style="font-weight: 600; color: white;">${escapeHtml(componentName)}</span>
    ${shortPath ? `<span style="font-size: 10px; opacity: 0.75; margin-left: 8px;">${escapeHtml(shortPath)}</span>` : ''}
    <span style="font-size: 10px; opacity: 0.6; margin-left: auto;">${width}×${height}</span>
  `

  let labelTop = rect.top - 28
  if (labelTop < 4) labelTop = rect.bottom + 4

  let labelLeft = rect.left
  if (labelLeft + 250 > window.innerWidth) labelLeft = window.innerWidth - 250
  if (labelLeft < 4) labelLeft = 4

  label.style.top = `${labelTop}px`
  label.style.left = `${labelLeft}px`
  label.style.display = 'flex'
  label.style.alignItems = 'center'
  label.style.gap = '8px'
}

function hideOverlay() {
  if (overlay) overlay.style.display = 'none'
  if (label) label.style.display = 'none'
}

// Key Event Handlers
function setupKeyListeners() {
  document.addEventListener('keydown', handleKeyDown, true)
  document.addEventListener('keyup', handleKeyUp, true)
  window.addEventListener('blur', deactivateGrabMode)
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Alt' && !isGrabMode) {
    if (!keyDownTime) {
      keyDownTime = Date.now()
      keyHoldTimer = setTimeout(() => {
        activateGrabMode()
      }, KEY_HOLD_DURATION)
    }
  }

  if (event.key === 'Escape' && isGrabMode) {
    deactivateGrabMode()
    event.preventDefault()
    event.stopPropagation()
  }
}

function handleKeyUp(event: KeyboardEvent) {
  if (event.key === 'Alt') {
    if (keyHoldTimer) {
      clearTimeout(keyHoldTimer)
      keyHoldTimer = null
    }
    keyDownTime = null

    if (isGrabMode) {
      deactivateGrabMode()
    }

    hideOverlay()
  }
}

// Grab Mode
function activateGrabMode() {
  if (isGrabMode) return

  isGrabMode = true
  document.body.style.cursor = 'crosshair'
  document.documentElement.style.cursor = 'crosshair'
  document.body.classList.add('react-grab-bridge-active')

  if (crosshairH) {
    crosshairH.style.display = 'block'
    crosshairH.style.top = `${mouseY}px`
  }
  if (crosshairV) {
    crosshairV.style.display = 'block'
    crosshairV.style.left = `${mouseX}px`
  }

  updateHoverElement()

  console.log('[React Grab Bridge] Grab mode activated')
}

function deactivateGrabMode() {
  if (!isGrabMode) return

  isGrabMode = false
  document.body.style.cursor = ''
  document.documentElement.style.cursor = ''
  document.body.classList.remove('react-grab-bridge-active')

  hideOverlay()
  hideCrosshair()
  currentContext = null
  pendingRequests.clear()

  if (keyHoldTimer) {
    clearTimeout(keyHoldTimer)
    keyHoldTimer = null
  }
  keyDownTime = null

  console.log('[React Grab Bridge] Grab mode deactivated')
}

function hideCrosshair() {
  if (crosshairH) crosshairH.style.display = 'none'
  if (crosshairV) crosshairV.style.display = 'none'
}

// Mouse Event Handlers
function setupMouseListeners() {
  document.addEventListener('mousemove', handleMouseMove, true)
  document.addEventListener('click', handleClick, true)
}

function handleMouseMove(event: MouseEvent) {
  mouseX = event.clientX
  mouseY = event.clientY

  if (isGrabMode) {
    if (crosshairH) crosshairH.style.top = `${mouseY}px`
    if (crosshairV) crosshairV.style.left = `${mouseX}px`
    updateHoverElement()
  }
}

function handleClick(event: MouseEvent) {
  if (!isGrabMode) return

  event.preventDefault()
  event.stopPropagation()

  if (currentContext) {
    const context = currentContext
    deactivateGrabMode()
    showComponentDialog(context)
  }
}

function updateHoverElement() {
  if (!isGrabMode) return

  const id = ++requestId
  pendingRequests.set(id, 'hover')

  window.postMessage(
    {
      type: 'GRAB_GET_ELEMENT_AT_POINT',
      x: mouseX,
      y: mouseY,
      requestId: id,
    },
    '*'
  )
}

// Message Handlers
function setupMessageListeners() {
  window.addEventListener('message', (event) => {
    if (event.source !== window) return

    switch (event.data.type) {
      case 'GRAB_ELEMENT_FOUND': {
        const { requestId: id, context, rect } = event.data
        if (pendingRequests.get(id) === 'hover') {
          pendingRequests.delete(id)
          if (isGrabMode && context && rect) {
            currentContext = context
            showOverlay(rect, context)
          }
        }
        break
      }

      case 'GRAB_ELEMENT_NOT_FOUND': {
        const { requestId: id } = event.data
        if (pendingRequests.get(id) === 'hover') {
          pendingRequests.delete(id)
          hideOverlay()
          currentContext = null
        }
        break
      }

      case 'GRAB_REACT_CHECK_RESULT': {
        if (!event.data.hasReact) {
          console.log('[React Grab Bridge] No React detected on this page')
        }
        break
      }
    }
  })
}

// Component Dialog
function showComponentDialog(context: ComponentContext) {
  hideOverlay()

  if (!dialogRoot) return

  const workspaces = getConnectedWorkspaces()

  const handleClose = () => {
    dialogRoot?.render(null)
  }

  const handleSendToAI = (target: 'copilot' | 'claude', prompt: string, markdownContext: string, targetPort: number | null) => {
    const finalPrompt = prompt || 'Analyze this React component:'

    const result = sendToVSCode(
      'prompt',
      {
        prompt: finalPrompt,
        target,
        elementInfo: {
          componentName: context.componentName,
          jsx: context.jsx,
          props: context.props,
          filePath: context.source?.fileName || null,
          tagName: context.element?.tagName || '',
          className: context.element?.className || '',
          id: context.element?.id || '',
          markdownContext,
        },
      },
      targetPort
    )

    if (result === false) {
      showNotification('Failed to send to VSCode', 'error')
    }

    handleClose()
  }

  dialogRoot.render(
    <ComponentDialog
      context={context}
      workspaces={workspaces}
      onClose={handleClose}
      onSendToAI={handleSendToAI}
      onCopy={async (text) => {
        try {
          await navigator.clipboard.writeText(text)
          showNotification('Copied to clipboard!', 'success')
        } catch {
          showNotification('Failed to copy', 'error')
        }
      }}
    />
  )
}

// Utilities
function escapeHtml(text: string): string {
  if (!text) return ''
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function showNotification(message: string, type: 'success' | 'error' | 'info' = 'info') {
  const existing = document.querySelectorAll('.react-grab-notification')
  existing.forEach((n) => n.remove())

  const notification = document.createElement('div')
  notification.className = `react-grab-notification react-grab-notification-${type}`
  Object.assign(notification.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    padding: '12px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    zIndex: '2147483647',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    animation: 'slideUpNotification 0.2s ease',
    background: type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6',
    color: 'white',
  })
  notification.textContent = message
  document.body.appendChild(notification)

  setTimeout(() => {
    notification.style.opacity = '0'
    notification.style.transform = 'translateY(10px)'
    notification.style.transition = 'all 0.3s ease'
    setTimeout(() => notification.remove(), 300)
  }, 2500)
}

// Host Settings
async function checkHostSettings(): Promise<boolean> {
  try {
    const settings = await chrome.storage.sync.get(['disabledHosts'])
    const disabledHosts: string[] = settings.disabledHosts || []
    if (disabledHosts.includes(currentHost)) {
      extensionEnabled = false
      return false
    }
    return true
  } catch {
    return true
  }
}

// Chrome Extension Message Handlers
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === 'checkConnection') {
    const workspaces = getConnectedWorkspaces()
    sendResponse({
      connected: workspaces.length > 0,
      enabled: extensionEnabled,
      workspaces,
    })
  } else if (request.type === 'toggleExtension') {
    extensionEnabled = request.enabled
    if (!extensionEnabled) {
      connections.forEach((conn) => {
        if (conn.ws) conn.ws.close()
      })
      connections.clear()
    } else {
      connectToAllPorts()
    }
  }
  return true
})

// Cleanup
window.addEventListener('beforeunload', () => {
  connections.forEach((conn) => {
    if (conn.ws) conn.ws.close()
  })
  connections.clear()
})

// Start
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
