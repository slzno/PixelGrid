import { useEffect, useRef, useState } from 'react'
import { MoreHorizontal, RotateCw, X } from 'lucide-react'
import {
  CameraIcon,
  CodeIcon,
  EyedropperIcon,
  ImageIcon,
  PanesIcon,
  RulerIcon,
} from './icons/ToolIcons'
import {
  capturePaneScreenshot,
  getStoredScreenshotQuality,
} from '../lib/screenshot'
import { getEyedropperScript } from '../lib/toolsScripts'
import { getWebview, safeExecuteJavaScript } from '../lib/webviewRegistry'
import type { Pane, PaneTool } from '../store/appState'
import { useAppStore } from '../store/useAppStore'

type PaneToolsProps = {
  pane: Pane
  /** When true, tuck secondary tools into a "…" menu (narrow devices). */
  compactTools?: boolean
}

type ToolDef = {
  id: Exclude<PaneTool, 'none'> | 'screenshot' | 'rotate' | 'close'
  label: string
  primary?: boolean
}

const TOOLS: ToolDef[] = [
  { id: 'ruler', label: 'Measure', primary: true },
  { id: 'screenshot', label: 'Screenshot', primary: true },
  { id: 'overlay', label: 'Overlay' },
  { id: 'eyedropper', label: 'Eyedropper' },
  { id: 'sync', label: 'Sync', primary: true },
  { id: 'inspect', label: 'Inspect', primary: true },
  { id: 'rotate', label: 'Rotate' },
  { id: 'close', label: 'Close', primary: true },
]

export function PaneTools({ pane, compactTools = false }: PaneToolsProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const {
    state,
    togglePaneTool,
    setPaneOverlay,
    setPaneOverlayOpacity,
    setPaneColor,
    setPaneTool,
    removePane,
    rotatePane,
    setStatusMessage,
    setFocusedPane,
    setSyncEnabled,
    setSyncScroll,
    setSyncClick,
  } = useAppStore()

  useEffect(() => {
    if (!state.statusMessage) return
    const timer = window.setTimeout(() => setStatusMessage(null), 3200)
    return () => window.clearTimeout(timer)
  }, [state.statusMessage, setStatusMessage])

  const isActive = (tool: Exclude<PaneTool, 'none'>) => pane.activeTool === tool

  const onScreenshot = async () => {
    setFocusedPane(pane.id)
    try {
      const result = await capturePaneScreenshot(pane.id, {
        width: pane.width,
        height: pane.height,
        quality: getStoredScreenshotQuality(),
      })
      if (result.canceled) {
        setStatusMessage('Screenshot canceled')
        return
      }
      if (!result.ok) {
        setStatusMessage(result.error || 'Screenshot failed')
        return
      }
      setStatusMessage(`Saved ${result.path}`)
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : 'Screenshot failed',
      )
    }
  }

  const onPickOverlay = (file: File | null) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPaneOverlay(pane.id, reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  const onEyedropper = async () => {
    setFocusedPane(pane.id)
    togglePaneTool(pane.id, 'eyedropper')
    const webview = getWebview(pane.id)
    if (!webview) {
      setStatusMessage('Device not ready')
      return
    }
    const color = await safeExecuteJavaScript(webview, getEyedropperScript())
    if (typeof color === 'string' && color) {
      setPaneColor(pane.id, color)
      setStatusMessage(`Color ${color}`)
      try {
        await navigator.clipboard.writeText(color)
      } catch {
        // clipboard may be unavailable
      }
    }
    setPaneTool(pane.id, 'none')
  }

  const runTool = (id: ToolDef['id']) => {
    setMenuOpen(false)
    switch (id) {
      case 'screenshot':
        void onScreenshot()
        break
      case 'rotate':
        rotatePane(pane.id)
        break
      case 'close':
        removePane(pane.id)
        break
      case 'overlay':
        if (pane.activeTool === 'overlay') {
          togglePaneTool(pane.id, 'overlay')
        } else if (!pane.overlayImage) {
          fileRef.current?.click()
        } else {
          togglePaneTool(pane.id, 'overlay')
        }
        break
      case 'eyedropper':
        void onEyedropper()
        break
      default:
        togglePaneTool(pane.id, id)
    }
  }

  const visible = compactTools
    ? TOOLS.filter((tool) => tool.primary)
    : TOOLS
  const overflow = compactTools
    ? TOOLS.filter((tool) => !tool.primary)
    : []

  const renderIcon = (id: ToolDef['id']) => {
    switch (id) {
      case 'ruler':
        return <RulerIcon size={15} />
      case 'screenshot':
        return <CameraIcon size={15} />
      case 'overlay':
        return <ImageIcon size={15} />
      case 'eyedropper':
        return <EyedropperIcon size={15} />
      case 'sync':
        return <PanesIcon size={15} />
      case 'inspect':
        return <CodeIcon size={15} />
      case 'rotate':
        return <RotateCw size={14} strokeWidth={1.75} />
      case 'close':
        return <X size={15} strokeWidth={1.75} />
      default:
        return null
    }
  }

  return (
    <div className="pane-tools-wrap">
      <div className="pane-tools" role="toolbar" aria-label="Device tools">
        {visible.map((tool) => (
          <button
            key={tool.id}
            type="button"
            className={`tool-btn${
              tool.id !== 'screenshot' &&
              tool.id !== 'rotate' &&
              tool.id !== 'close' &&
              isActive(tool.id)
                ? ' active'
                : ''
            }${tool.id === 'sync' && state.syncEnabled ? ' has-dot dot-on' : ''}`}
            title={tool.label}
            aria-label={tool.label}
            disabled={tool.id === 'close' && state.panes.length <= 1}
            onClick={(event) => {
              event.stopPropagation()
              runTool(tool.id)
            }}
          >
            {renderIcon(tool.id)}
          </button>
        ))}

        {overflow.length > 0 && (
          <div className="tools-more">
            <button
              type="button"
              className={`tool-btn${menuOpen ? ' active' : ''}`}
              title="More tools"
              aria-label="More tools"
              onClick={(event) => {
                event.stopPropagation()
                setMenuOpen((open) => !open)
              }}
            >
              <MoreHorizontal size={15} strokeWidth={1.75} />
            </button>
            {menuOpen && (
              <div className="tools-more-menu">
                {overflow.map((tool) => (
                  <button
                    key={tool.id}
                    type="button"
                    className="tools-more-item"
                    onClick={(event) => {
                      event.stopPropagation()
                      runTool(tool.id)
                    }}
                  >
                    {renderIcon(tool.id)}
                    <span>{tool.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          onPickOverlay(event.target.files?.[0] ?? null)
          event.target.value = ''
        }}
      />

      {pane.activeTool === 'overlay' && (
        <div className="tool-popover pane-tool-popover">
          <label>
            Opacity
            <input
              type="range"
              min={0.05}
              max={1}
              step={0.05}
              value={pane.overlayOpacity}
              onChange={(event) =>
                setPaneOverlayOpacity(pane.id, Number(event.target.value))
              }
            />
          </label>
          <button
            type="button"
            className="chip-btn"
            onClick={() => fileRef.current?.click()}
          >
            Replace image
          </button>
          <button
            type="button"
            className="chip-btn"
            onClick={() => {
              setPaneOverlay(pane.id, null)
              setPaneTool(pane.id, 'none')
            }}
          >
            Clear
          </button>
        </div>
      )}

      {pane.activeTool === 'sync' && (
        <div className="tool-popover pane-tool-popover sync-popover">
          <label className="check-row">
            <input
              type="checkbox"
              checked={state.syncEnabled}
              onChange={(event) => setSyncEnabled(event.target.checked)}
            />
            Sync enabled
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={state.syncScroll}
              disabled={!state.syncEnabled}
              onChange={(event) => setSyncScroll(event.target.checked)}
            />
            Sync scroll
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={state.syncClick}
              disabled={!state.syncEnabled}
              onChange={(event) => setSyncClick(event.target.checked)}
            />
            Sync clicks
          </label>
        </div>
      )}
    </div>
  )
}
