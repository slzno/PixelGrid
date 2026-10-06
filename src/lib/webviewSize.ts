import type { WebviewEl } from './webviewRegistry'

/** Force Electron <webview> element box to exact CSS viewport size. */
export function applyWebviewViewport(
  webview: WebviewEl,
  width: number,
  height: number,
  scale = 1,
) {
  const wPx = `${Math.max(1, Math.round(width))}px`
  const hPx = `${Math.max(1, Math.round(height))}px`

  webview.style.cssText = [
    'display:block',
    'position:relative',
    `width:${wPx}`,
    `height:${hPx}`,
    `min-width:${wPx}`,
    `min-height:${hPx}`,
    `max-width:${wPx}`,
    `max-height:${hPx}`,
    'border:0',
    'background:#fff',
    'transform-origin:0 0',
    scale !== 1 ? `transform:scale(${scale})` : 'transform:none',
  ].join(';')

  try {
    webview.setZoomFactor?.(1)
  } catch {
    // ignore
  }
}

/** Tell Chromium the guest viewport is exactly width×height (Polypane-like). */
export async function emulateWebviewViewport(
  webview: WebviewEl,
  width: number,
  height: number,
) {
  try {
    const webContentsId = webview.getWebContentsId?.()
    if (typeof webContentsId !== 'number') return
    await window.ipcRenderer.invoke('pixelgrid:emulate-viewport', {
      webContentsId,
      width,
      height,
    })
  } catch {
    // ignore if guest is not ready yet
  }
}
