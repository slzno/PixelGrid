import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import {
  CameraIcon,
  CodeIcon,
  EyedropperIcon,
  ImageIcon,
  PanesIcon,
  RulerIcon,
} from './icons/ToolIcons'
import { capturePaneScreenshot } from '../lib/screenshot'
import { getEyedropperScript } from '../lib/toolsScripts'
import { getWebview, safeExecuteJavaScript } from '../lib/webviewRegistry'
import type { Pane, PaneTool } from '../store/appState'
import { useAppStore } from '../store/useAppStore'

type PaneToolsProps = {
  pane: Pane
}

export function PaneTools({ pane }: PaneToolsProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const {
    state,
    togglePaneTool,
    setPaneOverlay,
    setPaneOverlayOpacity,
    setPaneColor,
    setPaneTool,
    removePane,
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
      const result = await capturePaneScreenshot(pane.id)
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

  return (
    <div className="pane-tools-wrap">
      <div className="pane-tools tools-bar" role="toolbar" aria-label="Device tools">
        <button
          type="button"
          className={`tool-btn${isActive('ruler') ? ' active' : ''}`}
          title="Measure"
          aria-label="Measure"
          aria-pressed={isActive('ruler')}
          onClick={(event) => {
            event.stopPropagation()
            togglePaneTool(pane.id, 'ruler')
          }}
        >
          <RulerIcon size={16} />
        </button>

        <button
          type="button"
          className="tool-btn"
          title="Screenshot this device"
          aria-label="Screenshot"
          onClick={(event) => {
            event.stopPropagation()
            void onScreenshot()
          }}
        >
          <CameraIcon size={16} />
        </button>

        <button
          type="button"
          className={`tool-btn${isActive('overlay') ? ' active' : ''}`}
          title="Image overlay"
          aria-label="Image overlay"
          aria-pressed={isActive('overlay')}
          onClick={(event) => {
            event.stopPropagation()
            if (pane.activeTool === 'overlay') {
              togglePaneTool(pane.id, 'overlay')
              return
            }
            if (!pane.overlayImage) {
              fileRef.current?.click()
              return
            }
            togglePaneTool(pane.id, 'overlay')
          }}
        >
          <ImageIcon size={16} />
        </button>

        <button
          type="button"
          className={`tool-btn${isActive('eyedropper') ? ' active' : ''}`}
          title="Color picker"
          aria-label="Color picker"
          aria-pressed={isActive('eyedropper')}
          onClick={(event) => {
            event.stopPropagation()
            void onEyedropper()
          }}
        >
          <EyedropperIcon size={16} />
        </button>

        <button
          type="button"
          className={`tool-btn has-dot${isActive('sync') ? ' active' : ''}${
            state.syncEnabled ? ' dot-on' : ''
          }`}
          title="Sync settings"
          aria-label="Sync settings"
          aria-pressed={isActive('sync')}
          onClick={(event) => {
            event.stopPropagation()
            togglePaneTool(pane.id, 'sync')
          }}
        >
          <PanesIcon size={16} />
        </button>

        <button
          type="button"
          className={`tool-btn${isActive('inspect') ? ' active' : ''}`}
          title="Inspect elements"
          aria-label="Inspect"
          aria-pressed={isActive('inspect')}
          onClick={(event) => {
            event.stopPropagation()
            togglePaneTool(pane.id, 'inspect')
          }}
        >
          <CodeIcon size={16} />
        </button>

        <button
          type="button"
          className="tool-btn"
          title="Close pane"
          aria-label="Close pane"
          disabled={state.panes.length <= 1}
          onClick={(event) => {
            event.stopPropagation()
            removePane(pane.id)
          }}
        >
          <X size={15} strokeWidth={1.75} />
        </button>
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
          {pane.pickedColor && (
            <div className="color-swatch-row">
              <span
                className="color-swatch"
                style={{ background: pane.pickedColor }}
              />
              <code>{pane.pickedColor}</code>
            </div>
          )}
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

      {pane.pickedColor && pane.activeTool !== 'overlay' && (
        <div className="pane-color-chip" title="Last picked color">
          <span style={{ background: pane.pickedColor }} />
          {pane.pickedColor}
        </div>
      )}
    </div>
  )
}
