import {
  ArrowLeft,
  ArrowRight,
  Columns2,
  Focus,
  Plus,
  RotateCw,
  Rows2,
} from 'lucide-react'
import { AddressBar } from './AddressBar'
import { forEachWebview, getAllWebviews } from '../lib/webviewRegistry'
import type { LayoutMode } from '../store/appState'
import { useAppStore } from '../store/useAppStore'

const LAYOUTS: { id: LayoutMode; label: string; icon: typeof Columns2 }[] = [
  { id: 'horizontal', label: 'Horizontal', icon: Columns2 },
  { id: 'vertical', label: 'Vertical', icon: Rows2 },
  { id: 'focus', label: 'Focus', icon: Focus },
]

export function Toolbar() {
  const { state, addPane, setLayout } = useAppStore()

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

  const canNav = getAllWebviews().length > 0

  return (
    <header className="topbar">
      <div className="brand" title="Pixelgrid">
        <div className="brand-mark" aria-hidden />
        <div className="brand-name">
          Pixel<span>grid</span>
        </div>
      </div>

      <div className="nav-group">
        <button
          type="button"
          className="icon-btn"
          onClick={goBack}
          disabled={!canNav}
          title="Back"
          aria-label="Back"
        >
          <ArrowLeft size={16} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={goForward}
          disabled={!canNav}
          title="Forward"
          aria-label="Forward"
        >
          <ArrowRight size={16} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={reload}
          disabled={!canNav}
          title="Reload"
          aria-label="Reload"
        >
          <RotateCw size={16} strokeWidth={1.75} />
        </button>
      </div>

      <AddressBar />

      <div className="toolbar-actions">
        <button
          type="button"
          className="chip-btn"
          onClick={() => addPane('freeform')}
          title="Add pane"
        >
          <Plus size={14} strokeWidth={1.75} />
          Pane
        </button>
        <div className="toolbar-actions" role="group" aria-label="Layout">
          {LAYOUTS.map((option) => {
            const Icon = option.icon
            return (
              <button
                key={option.id}
                type="button"
                className={`chip-btn icon-chip${
                  state.layout === option.id ? ' active' : ''
                }`}
                onClick={() => setLayout(option.id)}
                title={option.label}
                aria-label={option.label}
              >
                <Icon size={15} strokeWidth={1.75} />
              </button>
            )
          })}
        </div>
      </div>
    </header>
  )
}
