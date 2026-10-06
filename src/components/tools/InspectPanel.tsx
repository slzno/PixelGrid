import { X } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

export function InspectPanel() {
  const { state, setPaneTool, setSidePanel } = useAppStore()
  const pane =
    state.panes.find(
      (item) =>
        item.id === state.focusedPaneId && item.activeTool === 'inspect',
    ) ??
    state.panes.find((item) => item.activeTool === 'inspect') ??
    state.panes.find((item) => item.id === state.focusedPaneId) ??
    state.panes[0]

  if (!pane) return null

  const info = state.inspectInfo

  return (
    <aside className="side-panel inspect-panel">
      <div className="side-panel-header">
        <strong>Inspeccionar · {pane.name}</strong>
        <button
          type="button"
          className="icon-btn"
          onClick={() => {
            setPaneTool(pane.id, 'none')
            setSidePanel(false)
          }}
          aria-label="Cerrar inspección"
        >
          <X size={15} strokeWidth={1.75} />
        </button>
      </div>
      {!info ? (
        <p className="side-panel-empty">
          Pasa el cursor sobre elementos de este dispositivo y haz clic para
          inspeccionar.
        </p>
      ) : (
        <dl className="inspect-dl">
          <div>
            <dt>Etiqueta</dt>
            <dd>
              {info.tag}
              {info.id ? `#${info.id}` : ''}
            </dd>
          </div>
          <div>
            <dt>Tamaño</dt>
            <dd>
              {info.width} × {info.height}px
            </dd>
          </div>
          <div>
            <dt>Posición</dt>
            <dd>
              {info.x}, {info.y}
            </dd>
          </div>
          <div>
            <dt>Clases</dt>
            <dd>{info.classes || '—'}</dd>
          </div>
          <div>
            <dt>Texto</dt>
            <dd>{info.text || '—'}</dd>
          </div>
        </dl>
      )}
    </aside>
  )
}
