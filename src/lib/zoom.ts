/** Clamp global zoom to the 25%–100% slider range. */
export function clampZoom(value: number) {
  if (!Number.isFinite(value)) return 1
  return Math.min(1, Math.max(0.25, value))
}

export function formatZoomLabel(scale: number) {
  return `${Math.round(clampZoom(scale) * 100)}%`
}
