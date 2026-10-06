import { X } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

export function InspectPanel() {
  const { state, setPaneTool } = useAppStore()
  const pane =
    state.panes.find(
      (item) =>
        item.id === state.focusedPaneId && item.activeTool === 'inspect',
    ) ?? state.panes.find((item) => item.activeTool === 'inspect')

  if (!pane) return null

  const info = state.inspectInfo

  return (
    <aside className="side-panel inspect-panel">
      <div className="side-panel-header">
        <strong>Inspect · {pane.name}</strong>
        <button
          type="button"
          className="icon-btn"
          onClick={() => setPaneTool(pane.id, 'none')}
          aria-label="Close inspect"
        >
          <X size={15} strokeWidth={1.75} />
        </button>
      </div>
      {!info ? (
        <p className="side-panel-empty">
          Hover elements in this device, then click to inspect.
        </p>
      ) : (
        <dl className="inspect-dl">
          <div>
            <dt>Tag</dt>
            <dd>
              {info.tag}
              {info.id ? `#${info.id}` : ''}
            </dd>
          </div>
          <div>
            <dt>Size</dt>
            <dd>
              {info.width} × {info.height}px
            </dd>
          </div>
          <div>
            <dt>Position</dt>
            <dd>
              {info.x}, {info.y}
            </dd>
          </div>
          <div>
            <dt>Classes</dt>
            <dd>{info.classes || '—'}</dd>
          </div>
          <div>
            <dt>Text</dt>
            <dd>{info.text || '—'}</dd>
          </div>
        </dl>
      )}
    </aside>
  )
}
