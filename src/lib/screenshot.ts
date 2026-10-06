import { getWebview } from './webviewRegistry'

export async function capturePaneScreenshot(paneId: string) {
  const webview = getWebview(paneId)
  if (!webview || typeof webview.capturePage !== 'function') {
    throw new Error('Webview capture unavailable')
  }
  const image = await webview.capturePage()
  const dataUrl = image.toDataURL()
  return (await window.ipcRenderer.invoke(
    'pixelgrid:save-screenshot',
    dataUrl,
  )) as { ok: boolean; path?: string; canceled?: boolean; error?: string }
}
