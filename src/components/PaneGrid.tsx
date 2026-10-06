import { Pane } from './Pane'
import { useAppStore } from '../store/useAppStore'

export function PaneGrid() {
  const { state, addPane } = useAppStore()

  if (state.panes.length === 0) {
    return (
      <div className="pane-grid">
        <div className="empty-state">
          <h2>No panes yet</h2>
          <p>Add a viewport to start previewing your site.</p>
          <button type="button" className="chip-btn active" onClick={() => addPane()}>
            + Add pane
          </button>
        </div>
      </div>
    )
  }

  if (state.layout === 'focus') {
    const focused =
      state.panes.find((pane) => pane.id === state.focusedPaneId) ?? state.panes[0]
    const thumbs = state.panes.filter((pane) => pane.id !== focused.id)

    return (
      <div className="pane-grid focus">
        <div className="focus-main">
          <Pane pane={focused} />
        </div>
        <div className="focus-thumbs">
          {thumbs.map((pane) => (
            <Pane key={pane.id} pane={{ ...pane, scale: Math.min(pane.scale, 0.35) }} compact />
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
