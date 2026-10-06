import { getWebview } from './webviewRegistry'

export type ScreenshotQuality = 'native' | '1080p' | '2k' | '4k'

export const SCREENSHOT_QUALITIES: {
  id: ScreenshotQuality
  label: string
  hint: string
}[] = [
  { id: 'native', label: 'Viewport', hint: '1:1' },
  { id: '1080p', label: '1080p', hint: '1920px' },
  { id: '2k', label: '2K', hint: '2560px' },
  { id: '4k', label: '4K', hint: '3840px' },
]

const QUALITY_STORAGE_KEY = 'pixelgrid-screenshot-quality'

export function getStoredScreenshotQuality(): ScreenshotQuality {
  try {
    const raw = localStorage.getItem(QUALITY_STORAGE_KEY)
    if (
      raw === 'native' ||
      raw === '1080p' ||
      raw === '2k' ||
      raw === '4k'
    ) {
      return raw
    }
  } catch {
    // ignore
  }
  return 'native'
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
  opts: { quality: ScreenshotQuality },
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
