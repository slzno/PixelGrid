import { getWebview, type WebviewEl } from './webviewRegistry'

type SizeLock = { width: number; height: number }

const sizeLocks = new Map<string, SizeLock>()

/**
 * Size the <webview> to real device pixels.
 * Never use attribute "100%" — Electron parses it as ~100px.
 *
 * IMPORTANT: do NOT leave enableDeviceEmulation active for normal browsing.
 * After reload, Chromium recalculates emulation `scale` and the panel looks
 * shrunk. Media queries / 100vh work from the element box size alone.
 */
export function applyWebviewFill(
  webview: WebviewEl,
  width: number,
  height: number,
) {
  const w = Math.max(1, Math.round(width))
  const h = Math.max(1, Math.round(height))
  const wPx = `${w}px`
  const hPx = `${h}px`

  webview.setAttribute('width', String(w))
  webview.setAttribute('height', String(h))

  webview.style.position = 'absolute'
  webview.style.inset = '0'
  webview.style.top = '0'
  webview.style.left = '0'
  webview.style.right = 'auto'
  webview.style.bottom = 'auto'
  webview.style.width = wPx
  webview.style.height = hPx
  webview.style.minWidth = wPx
  webview.style.minHeight = hPx
  webview.style.maxWidth = wPx
  webview.style.maxHeight = hPx
  webview.style.display = 'flex'
  webview.style.border = '0'
  webview.style.margin = '0'
  webview.style.padding = '0'
  webview.style.boxSizing = 'border-box'
  webview.style.background = '#fff'
  webview.style.transform = 'none'
  webview.style.transformOrigin = 'top left'

  try {
    webview.setZoomFactor?.(1)
  } catch {
    // ignore
  }
}

/** Clear leftover enableDeviceEmulation / CDP metrics that shrink the guest. */
export async function clearWebviewEmulation(webview: WebviewEl) {
  try {
    const webContentsId = webview.getWebContentsId?.()
    if (typeof webContentsId !== 'number') return
    await window.ipcRenderer.invoke('prixelgrid:clear-emulation', {
      webContentsId,
    })
  } catch {
    // ignore
  }
}

export function lockWebviewSize(
  webview: WebviewEl,
  width: number,
  height: number,
) {
  applyWebviewFill(webview, width, height)
  void clearWebviewEmulation(webview)
}

export function setPaneSizeLock(
  paneId: string,
  width: number,
  height: number,
) {
  sizeLocks.set(paneId, {
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
  })
}

export function clearPaneSizeLock(paneId: string) {
  sizeLocks.delete(paneId)
}

export function relockAllPanes() {
  for (const [paneId, size] of sizeLocks) {
    const webview = getWebview(paneId)
    if (!webview) continue
    lockWebviewSize(webview, size.width, size.height)
  }
}

export function relockPane(paneId: string) {
  const size = sizeLocks.get(paneId)
  const webview = getWebview(paneId)
  if (!size || !webview) return
  lockWebviewSize(webview, size.width, size.height)
}
