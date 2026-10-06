import { Pane } from './Pane'
import { useAppStore } from '../store/useAppStore'

export function PaneGrid() {
  const { state, addPane } = useAppStore()

  if (state.panes.length === 0) {
    return (
      <div className="pane-grid">
        <div className="empty-state">
          <h2>Aún no hay paneles</h2>
          <p>Agrega un viewport para previsualizar tu sitio.</p>
          <button
            type="button"
            className="chip-btn active"
            onClick={() => addPane('mobile-phone')}
          >
            + Agregar panel
          </button>
        </div>
      </div>
    )
  }

  if (state.layout === 'focus') {
    const focused =
      state.panes.find((pane) => pane.id === state.focusedPaneId) ??
      state.panes[0]
    const thumbs = state.panes.filter((pane) => pane.id !== focused.id)

    return (
      <div className="pane-grid focus">
        <div className="focus-main">
          <Pane pane={focused} />
        </div>
        <div className="focus-thumbs">
          {thumbs.map((pane) => (
            <Pane key={pane.id} pane={pane} compact />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`pane-grid ${state.layout}`}>
      {state.panes.map((pane) => (
        <Pane key={pane.id} pane={pane} />
      ))}
    </div>
  )
}
