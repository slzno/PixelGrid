import type { Pane } from '../../store/appState'

type ImageOverlayLayerProps = {
  pane: Pane
}

export function ImageOverlayLayer({ pane }: ImageOverlayLayerProps) {
  if (!pane.overlayImage || pane.activeTool !== 'overlay') return null

  return (
    <div className="tool-overlay image-overlay" aria-hidden>
      <img
        src={pane.overlayImage}
        alt=""
        style={{ opacity: pane.overlayOpacity }}
      />
    </div>
  )
}
