import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Atom, Monitor, Zap, Circle } from 'lucide-react'

interface Workspace {
  port: number
  name: string
  path: string
}

type ConnectionStatus = 'connected' | 'disconnected' | 'error'

export function App() {
  const [currentHost, setCurrentHost] = useState<string>('Loading...')
  const [isEnabled, setIsEnabled] = useState(true)
  const [isToggleDisabled, setIsToggleDisabled] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [currentTabId, setCurrentTabId] = useState<number | null>(null)

  useEffect(() => {
    initPopup()
  }, [])

  async function initPopup() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      const currentTab = tabs[0]

      if (currentTab?.id) {
        setCurrentTabId(currentTab.id)
      }

      if (currentTab?.url) {
        try {
          const url = new URL(currentTab.url)
          const host = url.hostname
          setCurrentHost(host)

          // Load saved settings
          await loadHostSettings(host)

          // Check connection status
          if (currentTab.id) {
            checkConnectionStatus(currentTab.id)
          }
        } catch {
          setCurrentHost('Invalid page')
          setIsToggleDisabled(true)
        }
      }
    } catch (error) {
      console.error('Failed to initialize popup:', error)
    }
  }

  async function loadHostSettings(host: string) {
    const settings = await chrome.storage.sync.get(['disabledHosts'])
    const disabledHosts: string[] = settings.disabledHosts || []

    const enabled = !disabledHosts.includes(host)
    setIsEnabled(enabled)
    setIsToggleDisabled(false)
  }

  async function handleToggle(checked: boolean) {
    setIsEnabled(checked)

    const settings = await chrome.storage.sync.get(['enabledHosts', 'disabledHosts'])
    let enabledHosts: string[] = settings.enabledHosts || []
    let disabledHosts: string[] = settings.disabledHosts || []

    if (checked) {
      disabledHosts = disabledHosts.filter((h) => h !== currentHost)
      if (!enabledHosts.includes(currentHost)) {
        enabledHosts.push(currentHost)
      }
    } else {
      if (!disabledHosts.includes(currentHost)) {
        disabledHosts.push(currentHost)
      }
      enabledHosts = enabledHosts.filter((h) => h !== currentHost)
    }

    await chrome.storage.sync.set({ enabledHosts, disabledHosts })

    // Notify content script
    if (currentTabId) {
      chrome.tabs.sendMessage(currentTabId, {
        type: 'toggleExtension',
        enabled: checked,
      })
    }
  }

  function checkConnectionStatus(tabId: number) {
    chrome.tabs.sendMessage(tabId, { type: 'checkConnection' }, (response) => {
      if (chrome.runtime.lastError) {
        setConnectionStatus('disconnected')
        return
      }

      if (response?.connected) {
        setConnectionStatus('connected')
        if (response.workspaces) {
          setWorkspaces(response.workspaces)
        }
      } else {
        setConnectionStatus('disconnected')
      }
    })
  }

  return (
    <div className="w-80 p-4 bg-background">
      <div className="flex items-center gap-2 mb-4">
        <Atom className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold">React Grab Bridge</h1>
      </div>

      {/* Site Toggle */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">{currentHost}</p>
              <p className="text-xs text-muted-foreground">
                {isEnabled ? 'Extension enabled' : 'Extension disabled'}
              </p>
            </div>
            <Switch
              checked={isEnabled}
              onCheckedChange={handleToggle}
              disabled={isToggleDisabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Connection Status */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Circle
              className={`h-3 w-3 fill-current ${
                connectionStatus === 'connected'
                  ? 'text-green-500'
                  : connectionStatus === 'error'
                  ? 'text-yellow-500'
                  : 'text-red-500'
              }`}
            />
            <div className="flex-1">
              <p className="text-sm font-medium">
                {connectionStatus === 'connected'
                  ? 'Connected to VSCode'
                  : connectionStatus === 'error'
                  ? 'Connection Error'
                  : 'Disconnected'}
              </p>
              {workspaces.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {workspaces.length} workspace{workspaces.length > 1 ? 's' : ''} connected
                </p>
              )}
            </div>
            {connectionStatus === 'connected' && (
              <Badge variant="success" className="text-xs">
                Active
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4" />
            How to use
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-start gap-2">
            <span className="text-primary font-medium">1.</span>
            <span>Start VSCode with the React Grab extension</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary font-medium">2.</span>
            <span>Open a React application in your browser</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary font-medium">3.</span>
            <span>
              Hold <Label className="inline text-xs bg-muted px-1.5 py-0.5 rounded">Option</Label> and click on any element
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary font-medium">4.</span>
            <span>Enter your prompt for Copilot or Claude</span>
          </div>
        </CardContent>
      </Card>

      {/* Port Info */}
      <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Monitor className="h-3 w-3" />
        <span>WebSocket Port: <code className="bg-muted px-1 rounded">9765-9769</code></span>
      </div>
    </div>
  )
}
