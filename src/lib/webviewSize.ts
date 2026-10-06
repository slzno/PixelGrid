import type { WebviewEl } from './webviewRegistry'

/**
 * Make <webview> fill its sized parent (width/height: 100%).
 * Electron ignores % height unless the element is explicitly stretched.
 */
export function applyWebviewFill(webview: WebviewEl) {
  webview.setAttribute('width', '100%')
  webview.setAttribute('height', '100%')
  webview.style.cssText = [
    'position:absolute',
    'inset:0',
    'top:0',
    'left:0',
    'right:0',
    'bottom:0',
    'width:100%',
    'height:100%',
    'min-width:100%',
    'min-height:100%',
    'max-width:none',
    'max-height:none',
    'display:flex',
    'border:0',
    'margin:0',
    'padding:0',
    'box-sizing:border-box',
    'background:#fff',
    'transform:none',
  ].join(';')

  try {
    webview.setZoomFactor?.(1)
  } catch {
    // ignore
  }
}

/** @deprecated Prefer applyWebviewFill + sized parent. */
export function applyWebviewViewport(
  webview: WebviewEl,
  width: number,
  height: number,
  scale = 1,
) {
  const wPx = `${Math.max(1, Math.round(width))}px`
  const hPx = `${Math.max(1, Math.round(height))}px`

  webview.style.cssText = [
    'display:flex',
    'position:relative',
    `width:${wPx}`,
    `height:${hPx}`,
    `min-width:${wPx}`,
    `min-height:${hPx}`,
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
