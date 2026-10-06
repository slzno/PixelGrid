import { type FormEvent } from 'react'
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
import { getAddPaneGroups } from '@/data/devicePresets'
import { forEachWebview, getAllWebviews } from '@/lib/webviewRegistry'
import { formatZoomLabel } from '@/lib/zoom'
import { capturePaneScreenshot } from '@/lib/screenshot'
import type { LayoutMode } from '@/store/appState'
import { useAppStore } from '@/store/useAppStore'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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
  const addGroups = getAddPaneGroups()

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="topbar-icon"
                title="Layout"
                aria-label="Layout"
              >
                <Columns2 size={16} strokeWidth={1.75} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel>Layout</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {LAYOUTS.map((option) => {
                const Icon = option.icon
                return (
                  <DropdownMenuItem
                    key={option.id}
                    onClick={() => setLayout(option.id)}
                    className={
                      state.layout === option.id ? 'bg-accent' : undefined
                    }
                  >
                    <Icon size={14} strokeWidth={1.75} className="mr-2" />
                    {option.label}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>

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
            title="Developer Tools del panel activo"
            aria-label="Developer Tools del panel activo"
            onClick={() => {
              const paneId = state.focusedPaneId ?? state.panes[0]?.id
              if (!paneId) return
              if (state.sidePanelOpen) {
                setSidePanel(false)
                return
              }
              setFocusedPane(paneId)
              setSidePanel(true)
            }}
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="topbar-icon add-pane-btn"
              title="Agregar panel"
              aria-label="Agregar panel"
            >
              <Plus size={16} strokeWidth={1.75} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="max-h-[min(420px,70vh)] w-[280px] overflow-y-auto"
          >
            {addGroups.map((group, index) => (
              <DropdownMenuGroup key={group.id}>
                {index > 0 && <DropdownMenuSeparator />}
                <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
                {group.presets.map((preset) => (
                  <DropdownMenuItem
                    key={preset.id}
                    onClick={() => addPane(preset.id)}
                    className="justify-between gap-3"
                  >
                    <span className="truncate">{preset.name}</span>
                    <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                      {preset.width}×{preset.height}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
