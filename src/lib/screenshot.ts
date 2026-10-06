import { getWebview } from './webviewRegistry'

export type ScreenshotQuality = '1080p' | '2k' | '4k'

export const SCREENSHOT_QUALITIES: {
  id: ScreenshotQuality
  label: string
  hint: string
  longEdge: number
}[] = [
  { id: '1080p', label: '1080p', hint: '1920px', longEdge: 1920 },
  { id: '2k', label: '2K', hint: '2560px', longEdge: 2560 },
  { id: '4k', label: '4K', hint: '3840px', longEdge: 3840 },
]

const QUALITY_STORAGE_KEY = 'pixelgrid-screenshot-quality'

export function getStoredScreenshotQuality(): ScreenshotQuality {
  try {
    const raw = localStorage.getItem(QUALITY_STORAGE_KEY)
    if (raw === '1080p' || raw === '2k' || raw === '4k') return raw
  } catch {
    // ignore
  }
  return '4k'
}

export function setStoredScreenshotQuality(quality: ScreenshotQuality) {
  try {
    localStorage.setItem(QUALITY_STORAGE_KEY, quality)
  } catch {
    // ignore
  }
}

export async function capturePaneScreenshot(
  paneId: string,
  opts: { width: number; height: number; quality: ScreenshotQuality },
) {
  const webview = getWebview(paneId)
  if (!webview) {
    throw new Error('Webview capture unavailable')
  }

  let webContentsId: number
  try {
    webContentsId = webview.getWebContentsId()
  } catch {
    throw new Error('Panel no listo para capturar')
  }

  return (await window.ipcRenderer.invoke('pixelgrid:capture-screenshot', {
    webContentsId,
    width: Math.max(1, Math.round(opts.width)),
    height: Math.max(1, Math.round(opts.height)),
    quality: opts.quality,
  })) as {
    ok: boolean
    path?: string
    canceled?: boolean
    error?: string
    width?: number
    height?: number
  }
}
