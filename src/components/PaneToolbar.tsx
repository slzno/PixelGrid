import { useEffect, useRef } from 'react'
import { Camera, Code2, Layers, Moon, RotateCw, X } from 'lucide-react'
import { DeviceSelect } from '@/components/DeviceSelect'
import { capturePaneScreenshot } from '@/lib/screenshot'
import type { Pane } from '@/store/appState'
import { useAppStore } from '@/store/useAppStore'

type PaneToolbarProps = {
  pane: Pane
  width: number
}

export function PaneToolbar({ pane, width }: PaneToolbarProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const {
    state,
    rotatePane,
    applyPreset,
    togglePaneTool,
    togglePaneDark,
    setPaneOverlay,
    setPaneTool,
    setFocusedPane,
    setStatusMessage,
    setSidePanel,
    removePane,
  } = useAppStore()

  useEffect(() => {
    if (!state.statusMessage) return
    const timer = window.setTimeout(() => setStatusMessage(null), 3200)
    return () => window.clearTimeout(timer)
  }, [state.statusMessage, setStatusMessage])

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
        togglePaneTool(pane.id, 'overlay')
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="pane-icon-row" style={{ width }}>
      <div className="pane-icon-group">
        <button
          type="button"
          className="pane-icon-btn"
          title="Rotar"
          aria-label="Rotar"
          onClick={(event) => {
            event.stopPropagation()
            rotatePane(pane.id)
          }}
        >
          <RotateCw size={18} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          className="pane-icon-btn"
          title="Captura"
          aria-label="Captura"
          onClick={(event) => {
            event.stopPropagation()
            void onScreenshot()
          }}
        >
          <Camera size={18} strokeWidth={1.75} />
        </button>
      </div>

      <span className="pane-icon-sep" aria-hidden />

      <div className="pane-icon-group">
        <button
          type="button"
          className={`pane-icon-btn${pane.darkMode ? ' active' : ''}`}
          title="Emular modo oscuro"
          aria-label="Emular modo oscuro"
          onClick={(event) => {
            event.stopPropagation()
            togglePaneDark(pane.id)
          }}
        >
          <Moon size={18} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          className={`pane-icon-btn${
            pane.activeTool === 'overlay' ? ' active' : ''
          }`}
          title="Overlays"
          aria-label="Overlays"
          onClick={(event) => {
            event.stopPropagation()
            if (pane.activeTool === 'overlay') {
              setPaneTool(pane.id, 'none')
            } else if (!pane.overlayImage) {
              fileRef.current?.click()
            } else {
              togglePaneTool(pane.id, 'overlay')
            }
          }}
        >
          <Layers size={18} strokeWidth={1.75} />
        </button>
      </div>

      <span className="pane-icon-sep" aria-hidden />

      <div
        className="pane-icon-group device-picker"
        onClick={(event) => event.stopPropagation()}
      >
        <DeviceSelect
          compact
          value={pane.presetId ?? 'freeform'}
          onValueChange={(presetId) => applyPreset(pane.id, presetId)}
          className="pane-icon-btn"
        />
      </div>

      <span className="pane-icon-sep" aria-hidden />

      <div className="pane-icon-group">
        <button
          type="button"
          className={`pane-icon-btn${
            state.sidePanelOpen && state.focusedPaneId === pane.id
              ? ' active'
              : ''
          }`}
          title="Developer Tools"
          aria-label="Developer Tools"
          onClick={(event) => {
            event.stopPropagation()
            if (state.sidePanelOpen && state.focusedPaneId === pane.id) {
              setSidePanel(false)
              return
            }
            setFocusedPane(pane.id)
            setSidePanel(true)
          }}
        >
          <Code2 size={18} strokeWidth={1.75} />
        </button>
      </div>

      <span className="pane-icon-sep" aria-hidden />

      <div className="pane-icon-group">
        <button
          type="button"
          className="pane-icon-btn pane-icon-remove"
          title="Quitar panel"
          aria-label="Quitar panel"
          disabled={state.panes.length <= 1}
          onClick={(event) => {
            event.stopPropagation()
            removePane(pane.id)
          }}
        >
          <X size={18} strokeWidth={1.75} />
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
    </div>
  )
}
