import { useEffect } from 'react'
import { Code2, Moon, RefreshCw, Smartphone, X } from 'lucide-react'
import { DeviceSelect } from '@/components/DeviceSelect'
import { ScreenshotMenu } from '@/components/ScreenshotMenu'
import { getWebview, safeReload } from '@/lib/webviewRegistry'
import { relockPane } from '@/lib/webviewSize'
import type { Pane } from '@/store/appState'
import { useAppStore } from '@/store/useAppStore'

type PaneToolbarProps = {
  pane: Pane
  width: number
}

export function PaneToolbar({ pane, width }: PaneToolbarProps) {
  const {
    state,
    rotatePane,
    applyPreset,
    togglePaneDark,
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

  return (
    <div className="pane-icon-row" style={{ width }}>
      <div className="pane-icon-group">
        <button
          type="button"
          className="pane-icon-btn"
          title="Recargar"
          aria-label="Recargar"
          onClick={(event) => {
            event.stopPropagation()
            setFocusedPane(pane.id)
            const webview = getWebview(pane.id)
            if (!webview) {
              setStatusMessage('Panel no listo')
              return
            }
            safeReload(webview)
            window.setTimeout(() => relockPane(pane.id), 50)
            window.setTimeout(() => relockPane(pane.id), 300)
          }}
        >
          <RefreshCw size={18} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          className="pane-icon-btn"
          title="Cambiar orientación (vertical ↔ horizontal)"
          aria-label="Cambiar orientación"
          onClick={(event) => {
            event.stopPropagation()
            rotatePane(pane.id)
          }}
        >
          {/* Phone tilted 90° = portrait/landscape swap (not confused with reload). */}
          <Smartphone
            size={18}
            strokeWidth={1.75}
            className="pane-orient-icon"
          />
        </button>
        <ScreenshotMenu variant="pane" paneId={pane.id} />
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
          title="Herramientas de desarrollo"
          aria-label="Herramientas de desarrollo"
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
    </div>
  )
}
