import { useEffect, useRef, useState } from 'react'
import {
  Camera,
  Code2,
  Layers,
  MonitorSmartphone,
  Moon,
  RotateCw,
} from 'lucide-react'
import { DEVICE_PRESETS } from '../data/devicePresets'
import { capturePaneScreenshot } from '../lib/screenshot'
import type { Pane } from '../store/appState'
import { useAppStore } from '../store/useAppStore'

type PaneToolbarProps = {
  pane: Pane
  width: number
  /** Wide panes hide this row until hover (Polypane behavior). */
  hoverOnly?: boolean
}

export function PaneToolbar({ pane, width, hoverOnly = false }: PaneToolbarProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const selectRef = useRef<HTMLSelectElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
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
    <div
      className={`pane-icon-row${hoverOnly ? ' hover-only' : ''}`}
      style={{ width }}
    >
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

      <div className="pane-icon-group device-picker">
        <button
          type="button"
          className={`pane-icon-btn${menuOpen ? ' active' : ''}`}
          title="Selector de dispositivo"
          aria-label="Selector de dispositivo"
          onClick={(event) => {
            event.stopPropagation()
            setMenuOpen((open) => !open)
            selectRef.current?.focus()
          }}
        >
          <MonitorSmartphone size={18} strokeWidth={1.75} />
        </button>
        <select
          ref={selectRef}
          className="pane-device-native"
          value={pane.presetId ?? 'freeform'}
          aria-label="Dispositivo"
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => {
            applyPreset(pane.id, event.target.value)
            setMenuOpen(false)
          }}
        >
          {DEVICE_PRESETS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} ({item.width}×{item.height})
            </option>
          ))}
        </select>
      </div>

      <span className="pane-icon-sep" aria-hidden />

      <div className="pane-icon-group">
        <button
          type="button"
          className={`pane-icon-btn${
            pane.activeTool === 'inspect' ? ' active' : ''
          }`}
          title="Ver código"
          aria-label="Ver código"
          onClick={(event) => {
            event.stopPropagation()
            togglePaneTool(pane.id, 'inspect')
            setSidePanel(true)
          }}
        >
          <Code2 size={18} strokeWidth={1.75} />
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
