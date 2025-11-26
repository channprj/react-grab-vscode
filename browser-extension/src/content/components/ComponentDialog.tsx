import { useState, useEffect, useCallback } from 'react'
import type { ComponentContext, Workspace } from '../types'

interface ComponentDialogProps {
  context: ComponentContext
  workspaces: Workspace[]
  onClose: () => void
  onSendToAI: (target: 'copilot' | 'claude', prompt: string, markdownContext: string, targetPort: number | null) => void
  onCopy: (text: string) => void
}

function generateMarkdown(context: ComponentContext): string {
  let md = `## ${context.componentName}\n\n`

  if (context.source?.fileName) {
    md += `**Source:** \`${context.source.fileName}\`\n\n`
  }

  if (context.jsx) {
    md += `### JSX\n\`\`\`jsx\n${context.jsx}\n\`\`\`\n\n`
  }

  if (context.props && Object.keys(context.props).length > 0) {
    md += `### Props\n\`\`\`json\n${JSON.stringify(context.props, null, 2)}\n\`\`\`\n`
  }

  return md
}

export function ComponentDialog({ context, workspaces, onClose, onSendToAI, onCopy }: ComponentDialogProps) {
  const [prompt, setPrompt] = useState('')
  const [markdownContext, setMarkdownContext] = useState(() => context.markdown || generateMarkdown(context))
  const [selectedPort, setSelectedPort] = useState<number | null>(workspaces[0]?.port || null)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        if (e.shiftKey) {
          onSendToAI('claude', prompt, markdownContext, selectedPort)
        } else {
          onSendToAI('copilot', prompt, markdownContext, selectedPort)
        }
      }
    },
    [onClose, onSendToAI, prompt, markdownContext, selectedPort]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const shortFileName = context.source?.fileName?.replace(/^.*[/\\]/, '') || ''

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        zIndex: 2147483647,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        animation: 'fadeIn 0.15s ease',
      }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>

      <div
        style={{
          background: 'hsl(0 0% 100%)',
          borderRadius: '12px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '85vh',
          overflowY: 'auto',
          animation: 'slideUp 0.2s ease',
        }}
        className="dark:bg-[hsl(222.2,84%,4.9%)]"
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid hsl(240 5.9% 90%)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            background: 'white',
            borderRadius: '12px 12px 0 0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: '20px', flexShrink: 0 }}>⚛️</span>
            <h3
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 600,
                color: 'hsl(262.1 83.3% 57.8%)',
                fontFamily: "'SF Mono', Monaco, 'Inconsolata', 'Fira Code', monospace",
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {context.componentName}
            </h3>
            {shortFileName && (
              <span
                style={{
                  fontSize: '11px',
                  background: 'hsl(240 4.8% 95.9%)',
                  color: 'hsl(240 3.8% 46.1%)',
                  padding: '3px 8px',
                  borderRadius: '10px',
                  fontFamily: "'SF Mono', Monaco, monospace",
                  flexShrink: 0,
                }}
              >
                {shortFileName}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              color: '#999',
              cursor: 'pointer',
              padding: 0,
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              flexShrink: 0,
              marginLeft: '12px',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#f5f5f5'
              e.currentTarget.style.color = '#333'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'none'
              e.currentTarget.style.color = '#999'
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px' }}>
          {/* Workspace Selector */}
          {workspaces.length > 1 ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                background: 'hsl(217 91% 95%)',
                borderRadius: '8px',
                border: '1px solid hsl(217 91% 85%)',
                marginBottom: '16px',
              }}
            >
              <label style={{ fontSize: '13px', color: '#555' }}>Send to workspace:</label>
              <select
                value={selectedPort || ''}
                onChange={(e) => setSelectedPort(parseInt(e.target.value, 10))}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  border: '1px solid hsl(240 5.9% 90%)',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontFamily: "'SF Mono', Monaco, monospace",
                  background: 'white',
                  cursor: 'pointer',
                }}
              >
                {workspaces.map((ws) => (
                  <option key={ws.port} value={ws.port}>
                    {ws.name}
                  </option>
                ))}
              </select>
            </div>
          ) : workspaces.length === 1 ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                background: 'hsl(217 91% 95%)',
                borderRadius: '8px',
                border: '1px solid hsl(217 91% 85%)',
                marginBottom: '16px',
              }}
            >
              <label style={{ fontSize: '13px', color: '#555' }}>Workspace:</label>
              <span
                style={{
                  fontFamily: "'SF Mono', Monaco, monospace",
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'hsl(262.1 83.3% 57.8%)',
                }}
              >
                {workspaces[0].name}
              </span>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                background: 'hsl(48 96% 89%)',
                borderRadius: '8px',
                border: '1px solid hsl(45 93% 58%)',
                marginBottom: '16px',
                color: 'hsl(32 95% 44%)',
              }}
            >
              <span>⚠️ No VSCode connected</span>
            </div>
          )}

          {/* Context Editor */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#666', marginBottom: '8px' }}>
              Component Context:
            </label>
            <textarea
              value={markdownContext}
              onChange={(e) => setMarkdownContext(e.target.value)}
              spellCheck={false}
              style={{
                width: '100%',
                minHeight: '180px',
                maxHeight: '300px',
                padding: '12px',
                border: '1px solid hsl(240 5.9% 90%)',
                borderRadius: '8px',
                fontFamily: "'SF Mono', Monaco, 'Inconsolata', 'Fira Code', monospace",
                fontSize: '12px',
                lineHeight: 1.5,
                resize: 'vertical',
                background: 'hsl(240 4.8% 95.9%)',
                color: '#333',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Prompt Input */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#666', marginBottom: '8px' }}>
              Your prompt:
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="What would you like to do with this component? (e.g., Add dark mode, Fix styling, Explain the code...)"
              rows={3}
              autoFocus
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '12px',
                border: '1px solid hsl(240 5.9% 90%)',
                borderRadius: '8px',
                fontFamily: 'inherit',
                fontSize: '14px',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* AI Buttons */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <button
              onClick={() => onSendToAI('copilot', prompt, markdownContext, selectedPort)}
              disabled={workspaces.length === 0}
              style={{
                flex: 1,
                padding: '14px 20px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: workspaces.length === 0 ? 'not-allowed' : 'pointer',
                border: 'none',
                background: 'linear-gradient(135deg, #0969da 0%, #0550b3 100%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                opacity: workspaces.length === 0 ? 0.5 : 1,
                transition: 'all 0.15s ease',
              }}
              onMouseOver={(e) => {
                if (workspaces.length > 0) {
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(9, 105, 218, 0.4)'
                }
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = ''
                e.currentTarget.style.boxShadow = ''
              }}
            >
              <span>🤖</span>
              Send to Copilot
            </button>
            <button
              onClick={() => onSendToAI('claude', prompt, markdownContext, selectedPort)}
              disabled={workspaces.length === 0}
              style={{
                flex: 1,
                padding: '14px 20px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: workspaces.length === 0 ? 'not-allowed' : 'pointer',
                border: 'none',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                opacity: workspaces.length === 0 ? 0.5 : 1,
                transition: 'all 0.15s ease',
              }}
              onMouseOver={(e) => {
                if (workspaces.length > 0) {
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.4)'
                }
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = ''
                e.currentTarget.style.boxShadow = ''
              }}
            >
              <span>🧠</span>
              Send to Claude
            </button>
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px',
              paddingTop: '12px',
              borderTop: '1px solid hsl(240 5.9% 90%)',
            }}
          >
            <button
              onClick={() => onCopy(markdownContext)}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                border: '1px solid hsl(240 5.9% 90%)',
                background: 'hsl(240 4.8% 95.9%)',
                color: '#24292f',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              📋 Copy Context
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                border: '1px solid hsl(240 5.9% 90%)',
                background: 'hsl(240 4.8% 95.9%)',
                color: '#24292f',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
