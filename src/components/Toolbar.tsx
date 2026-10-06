import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Code2,
  Columns2,
  Focus,
  LayoutPanelLeft,
  Link2,
  Plus,
  Puzzle,
  RefreshCw,
  Rows2,
  Settings,
  User,
} from 'lucide-react'
import { ADD_PANE_PRESETS, getPresetById } from '../data/devicePresets'
import { forEachWebview, getAllWebviews } from '../lib/webviewRegistry'
import { formatZoomLabel } from '../lib/zoom'
import { capturePaneScreenshot } from '../lib/screenshot'
import type { LayoutMode } from '../store/appState'
import { useAppStore } from '../store/useAppStore'

const LAYOUTS: { id: LayoutMode; label: string; icon: typeof Columns2 }[] = [
  { id: 'horizontal', label: 'Horizontal', icon: Columns2 },
  { id: 'vertical', label: 'Vertical', icon: Rows2 },
  { id: 'focus', label: 'Focus', icon: Focus },
]

export function Toolbar() {
  const {
    state,
    setDraftUrl,
    navigate,
    setLayout,
    setZoomMode,
    setSyncEnabled,
    setSyncScroll,
    setSidePanel,
    addPane,
    setStatusMessage,
    setFocusedPane,
  } = useAppStore()

  const [addOpen, setAddOpen] = useState(false)
  const [layoutOpen, setLayoutOpen] = useState(false)
  const addRef = useRef<HTMLDivElement>(null)
  const layoutRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      const target = event.target as Node
      if (addRef.current && !addRef.current.contains(target)) setAddOpen(false)
      if (layoutRef.current && !layoutRef.current.contains(target)) {
        setLayoutOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const goBack = () => {
    forEachWebview((_id, webview) => {
      if (webview.canGoBack()) webview.goBack()
    })
  }

  const goForward = () => {
    forEachWebview((_id, webview) => {
      if (webview.canGoForward()) webview.goForward()
    })
  }

  const reload = () => {
    forEachWebview((_id, webview) => {
      webview.reload()
    })
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    navigate()
  }

  const onGlobalScreenshot = async () => {
    const paneId = state.focusedPaneId ?? state.panes[0]?.id
    if (!paneId) return
    setFocusedPane(paneId)
    try {
      const result = await capturePaneScreenshot(paneId)
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

  const canNav = getAllWebviews().length > 0
  const zoomPct = Math.round(state.zoomMode * 100)

  return (
    <header className="topbar">
      <div className="topbar-nav">
        <button
          type="button"
          className="topbar-icon"
          onClick={goBack}
          disabled={!canNav}
          title="Atrás"
          aria-label="Atrás"
        >
          <ArrowLeft size={16} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          className="topbar-icon"
          onClick={goForward}
          disabled={!canNav}
          title="Adelante"
          aria-label="Adelante"
        >
          <ArrowRight size={16} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          className="topbar-icon"
          onClick={reload}
          disabled={!canNav}
          title="Recargar"
          aria-label="Recargar"
        >
          <RefreshCw size={16} strokeWidth={1.75} />
        </button>
      </div>

      <form className="address-form" onSubmit={onSubmit}>
        <input
          className="address-input"
          value={state.draftUrl}
          onChange={(event) => setDraftUrl(event.target.value)}
          placeholder="Enter URL"
          spellCheck={false}
          aria-label="URL"
        />
      </form>

      <div className="topbar-right">
        <div className="topbar-tools">
          <div className="topbar-menu" ref={layoutRef}>
            <button
              type="button"
              className={`topbar-icon${layoutOpen ? ' active' : ''}`}
              title="Layout"
              aria-label="Layout"
              onClick={() => setLayoutOpen((open) => !open)}
            >
              <Columns2 size={16} strokeWidth={1.75} />
            </button>
            {layoutOpen && (
              <div className="topbar-dropdown">
                {LAYOUTS.map((option) => {
                  const Icon = option.icon
                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={
                        state.layout === option.id ? 'active' : undefined
                      }
                      onClick={() => {
                        setLayout(option.id)
                        setLayoutOpen(false)
                      }}
                    >
                      <Icon size={14} strokeWidth={1.75} />
                      {option.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <button
            type="button"
            className="topbar-icon"
            title="Usuario"
            aria-label="Usuario"
          >
            <User size={16} strokeWidth={1.75} />
          </button>

          <button
            type="button"
            className={`topbar-icon${state.syncEnabled ? ' active' : ''}`}
            title="Sincronizar scroll"
            aria-label="Sincronizar scroll"
            onClick={() => {
              const next = !state.syncEnabled
              setSyncEnabled(next)
              if (next) setSyncScroll(true)
            }}
          >
            <Link2 size={16} strokeWidth={1.75} />
          </button>

          <button
            type="button"
            className="topbar-icon"
            title="Captura"
            aria-label="Captura"
            onClick={() => void onGlobalScreenshot()}
          >
            <Camera size={16} strokeWidth={1.75} />
          </button>

          <button
            type="button"
            className={`topbar-icon${state.sidePanelOpen ? ' active' : ''}`}
            title="Inspector"
            aria-label="Inspector"
            onClick={() => setSidePanel(!state.sidePanelOpen)}
          >
            <Code2 size={16} strokeWidth={1.75} />
          </button>

          <button
            type="button"
            className={`topbar-icon${state.sidePanelOpen ? ' active' : ''}`}
            title="Panel lateral"
            aria-label="Panel lateral"
            onClick={() => setSidePanel(!state.sidePanelOpen)}
          >
            <LayoutPanelLeft size={16} strokeWidth={1.75} />
          </button>
        </div>

        <div className="zoom-control" title="Zoom global">
          <input
            type="range"
            min={25}
            max={100}
            step={1}
            value={zoomPct}
            onChange={(event) =>
              setZoomMode(Number(event.target.value) / 100)
            }
            aria-label="Zoom"
          />
          <span className="zoom-label">{formatZoomLabel(state.zoomMode)}</span>
        </div>

        <button
          type="button"
          className="topbar-icon"
          title="Extensiones"
          aria-label="Extensiones"
        >
          <Puzzle size={16} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          className="topbar-icon"
          title="Ajustes"
          aria-label="Ajustes"
        >
          <Settings size={16} strokeWidth={1.75} />
        </button>

        <div className="topbar-menu" ref={addRef}>
          <button
            type="button"
            className={`topbar-icon add-pane-btn${addOpen ? ' active' : ''}`}
            title="Agregar panel"
            aria-label="Agregar panel"
            onClick={() => setAddOpen((open) => !open)}
          >
            <Plus size={16} strokeWidth={1.75} />
          </button>
          {addOpen && (
            <div className="topbar-dropdown add-dropdown">
              {ADD_PANE_PRESETS.map((id) => {
                const preset = getPresetById(id)
                if (!preset) return null
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      addPane(id)
                      setAddOpen(false)
                    }}
                  >
                    <span>{preset.name}</span>
                    <span className="muted">
                      {preset.width}×{preset.height}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
