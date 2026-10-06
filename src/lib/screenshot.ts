import { getWebview } from './webviewRegistry'

export type ScreenshotQuality = 'native' | '1080p' | '2k' | '4k'

function readCssViewport(webview: {
  getAttribute(name: string): string | null
  getBoundingClientRect(): DOMRect
}): { cssWidth: number; cssHeight: number } {
  const attrW = Number(webview.getAttribute('width'))
  const attrH = Number(webview.getAttribute('height'))
  if (
    Number.isFinite(attrW) &&
    Number.isFinite(attrH) &&
    attrW > 1 &&
    attrH > 1
  ) {
    return { cssWidth: Math.round(attrW), cssHeight: Math.round(attrH) }
  }
  const rect = webview.getBoundingClientRect()
  return {
    cssWidth: Math.max(1, Math.round(rect.width)),
    cssHeight: Math.max(1, Math.round(rect.height)),
  }
}

export const SCREENSHOT_QUALITIES: {
  id: ScreenshotQuality
  label: string
  hint: string
}[] = [
  { id: 'native', label: 'Viewport', hint: 'retina' },
  { id: '1080p', label: '1080p', hint: 'nítido' },
  { id: '2k', label: '2K', hint: 'nítido' },
  { id: '4k', label: '4K', hint: 'nítido' },
]

const QUALITY_STORAGE_KEY = 'prixelgrid-screenshot-quality'

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
    throw new Error('Captura no disponible')
  }

  let webContentsId: number
  try {
    webContentsId = webview.getWebContentsId()
  } catch {
    throw new Error('Panel no listo para capturar')
  }

  const { cssWidth, cssHeight } = readCssViewport(webview)

  return (await window.ipcRenderer.invoke('prixelgrid:capture-screenshot', {
    webContentsId,
    quality: opts.quality,
    cssWidth,
    cssHeight,
  })) as {
    ok: boolean
    path?: string
    canceled?: boolean
    error?: string
    width?: number
    height?: number
  }
}
