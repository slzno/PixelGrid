import {
  app,
  BrowserView,
  BrowserWindow,
  dialog,
  ipcMain,
  nativeImage,
  screen,
  webContents,
  type NativeImage,
  type WebContents,
} from 'electron'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

let win: BrowserWindow | null
let devtoolsView: BrowserView | null = null
let attachedGuestId: number | null = null

type Bounds = { x: number; y: number; width: number; height: number }

function resolveAppIcon() {
  const candidates = [
    path.join(process.env.APP_ROOT ?? '', 'build', 'icon.png'),
    path.join(process.env.VITE_PUBLIC ?? '', 'icons', 'icon.png'),
    path.join(process.env.VITE_PUBLIC ?? '', 'prixelgrid.svg'),
  ]
  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) return candidate
  }
  return undefined
}

function createWindow() {
  const icon = resolveAppIcon()
  win = new BrowserWindow({
    title: 'PrixelGrid',
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#1e1f22',
    ...(icon ? { icon } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      webviewTag: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.setMenuBarVisibility(false)
  if (process.platform === 'darwin' && app.dock && icon) {
    try {
      app.dock.setIcon(icon)
    } catch {
      // ignore
    }
  }

  win.on('closed', () => {
    devtoolsView = null
    attachedGuestId = null
    win = null
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

function ensureDevToolsView() {
  if (!win) return null
  if (devtoolsView) return devtoolsView

  devtoolsView = new BrowserView({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  win.addBrowserView(devtoolsView)
  return devtoolsView
}

function applyDevToolsBounds(bounds: Bounds) {
  if (!devtoolsView || !win) return
  const [winW, winH] = win.getContentSize()
  const x = Math.min(winW - 120, Math.max(200, Math.round(bounds.x)))
  const y = Math.min(winH - 120, Math.max(36, Math.round(bounds.y)))
  const width = Math.max(120, Math.min(Math.round(bounds.width), winW - x))
  const height = Math.max(120, Math.min(Math.round(bounds.height), winH - y))
  devtoolsView.setBounds({ x, y, width, height })
}

function hideDevToolsView() {
  if (attachedGuestId !== null) {
    const guest = webContents.fromId(attachedGuestId)
    if (guest && !guest.isDestroyed() && guest.isDevToolsOpened()) {
      guest.closeDevTools()
    }
    attachedGuestId = null
  }

  if (win && devtoolsView) {
    win.removeBrowserView(devtoolsView)
  }
  devtoolsView = null
}

function clearDeviceEmulation(wc: WebContents) {
  try {
    wc.disableDeviceEmulation()
  } catch {
    // ignore
  }
  try {
    if (wc.debugger.isAttached()) {
      void wc.debugger
        .sendCommand('Emulation.clearDeviceMetricsOverride')
        .catch(() => undefined)
    }
  } catch {
    // ignore
  }
}

/**
 * Capture the guest viewport at a real deviceScaleFactor (sharp pixels),
 * instead of soft-upscaling a small capturePage() bitmap to 2K/4K.
 */
async function captureViewportAtScale(
  wc: WebContents,
  cssWidth: number,
  cssHeight: number,
  deviceScaleFactor: number,
): Promise<NativeImage> {
  const dsf = Math.min(6, Math.max(1, deviceScaleFactor))
  const width = Math.max(1, Math.round(cssWidth))
  const height = Math.max(1, Math.round(cssHeight))

  const attachedHere = !wc.debugger.isAttached()
  if (attachedHere) {
    wc.debugger.attach('1.3')
  }

  try {
    await wc.debugger.sendCommand('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: dsf,
      mobile: height > width,
      scale: 1,
    })

    // Let Chromium paint at the new backing-store size.
    await new Promise((r) => setTimeout(r, 80))

    const shot = (await wc.debugger.sendCommand('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
      captureBeyondViewport: false,
    })) as { data: string }

    await wc.debugger
      .sendCommand('Emulation.clearDeviceMetricsOverride')
      .catch(() => undefined)

    const image = nativeImage.createFromBuffer(Buffer.from(shot.data, 'base64'))
    if (image.isEmpty()) {
      throw new Error('Captura vacía')
    }
    return image
  } finally {
    try {
      await wc.debugger
        .sendCommand('Emulation.clearDeviceMetricsOverride')
        .catch(() => undefined)
    } catch {
      // ignore
    }
    clearDeviceEmulation(wc)
    if (attachedHere && wc.debugger.isAttached()) {
      try {
        wc.debugger.detach()
      } catch {
        // ignore
      }
    }
  }
}

ipcMain.handle(
  'prixelgrid:set-ui-theme',
  async (_event, payload: { theme: 'dark' | 'light' }) => {
    if (!win || win.isDestroyed()) return { ok: false }
    const backgroundColor = payload.theme === 'light' ? '#eef0f3' : '#1e1f22'
    win.setBackgroundColor(backgroundColor)
    return { ok: true }
  },
)

ipcMain.handle(
  'prixelgrid:clear-emulation',
  async (_event, payload: { webContentsId: number }) => {
    try {
      const wc = webContents.fromId(payload.webContentsId)
      if (!wc || wc.isDestroyed()) return { ok: false }
      clearDeviceEmulation(wc)
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error ? error.message : 'No se pudo limpiar la emulación',
      }
    }
  },
)

ipcMain.handle(
  'prixelgrid:devtools-show',
  async (
    _event,
    payload: { guestWebContentsId: number; bounds: Bounds },
  ) => {
    try {
      if (!win) return { ok: false, error: 'Sin ventana' }
      const guest = webContents.fromId(payload.guestWebContentsId)
      if (!guest || guest.isDestroyed()) {
        return { ok: false, error: 'Panel webview no listo' }
      }

      const view = ensureDevToolsView()
      if (!view) {
        return {
          ok: false,
          error: 'No se pudieron crear las herramientas de desarrollo',
        }
      }

      applyDevToolsBounds(payload.bounds)

      const previousGuestId = attachedGuestId
      const switching =
        previousGuestId !== null &&
        previousGuestId !== payload.guestWebContentsId

      if (switching && previousGuestId !== null) {
        const prev = webContents.fromId(previousGuestId)
        if (prev && !prev.isDestroyed() && prev.isDevToolsOpened()) {
          prev.closeDevTools()
        }
      }

      if (switching || !guest.isDevToolsOpened()) {
        if (guest.isDevToolsOpened()) guest.closeDevTools()
        guest.setDevToolsWebContents(view.webContents)
        guest.openDevTools({ mode: 'detach', activate: true })
        attachedGuestId = payload.guestWebContentsId
      }

      win.setTopBrowserView(view)
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error en las herramientas de desarrollo',
      }
    }
  },
)

ipcMain.handle(
  'prixelgrid:devtools-layout',
  async (_event, payload: { bounds: Bounds }) => {
    try {
      if (!devtoolsView) return { ok: false }
      applyDevToolsBounds(payload.bounds)
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error al ajustar el panel',
      }
    }
  },
)

ipcMain.handle('prixelgrid:devtools-hide', async () => {
  try {
    hideDevToolsView()
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : 'No se pudo cerrar el panel',
    }
  }
})

const SCREENSHOT_LONG_EDGE: Record<string, number> = {
  native: 0, // CSS viewport × display scale (nítido)
  '1080p': 1920,
  '2k': 2560,
  '4k': 3840,
}

/**
 * Capture ONLY the visible guest viewport.
 * High qualities re-render at a higher deviceScaleFactor (sharp),
 * instead of soft-upscaling a tiny bitmap.
 */
ipcMain.handle(
  'prixelgrid:capture-screenshot',
  async (
    _event,
    payload: {
      webContentsId: number
      quality: 'native' | '1080p' | '2k' | '4k'
      cssWidth?: number
      cssHeight?: number
    },
  ) => {
    let wc: WebContents | undefined
    let outW = 0
    let outH = 0

    try {
      if (!win) return { ok: false, error: 'Sin ventana' }
      wc = webContents.fromId(payload.webContentsId)
      if (!wc || wc.isDestroyed()) {
        return { ok: false, error: 'Panel webview no listo' }
      }

      clearDeviceEmulation(wc)

      const cssWidth = Math.max(1, Math.round(payload.cssWidth || 1))
      const cssHeight = Math.max(1, Math.round(payload.cssHeight || 1))
      if (cssWidth < 2 || cssHeight < 2) {
        return { ok: false, error: 'Viewport vacío' }
      }
      const cssLong = Math.max(cssWidth, cssHeight)
      const targetLong = SCREENSHOT_LONG_EDGE[payload.quality] ?? 0

      // native → retina del display; 1080p/2K/4K → DSF para que Chromium pinte más píxeles
      const screenScale = Math.max(
        1,
        screen.getPrimaryDisplay().scaleFactor || 1,
      )
      const deviceScaleFactor =
        targetLong > 0
          ? Math.min(6, Math.max(1, targetLong / cssLong))
          : Math.min(3, Math.max(2, screenScale))

      let image: NativeImage
      try {
        image = await captureViewportAtScale(
          wc,
          cssWidth,
          cssHeight,
          deviceScaleFactor,
        )
      } catch {
        // Fallback: visible surface only (may be softer for 2K/4K).
        image = await wc.capturePage()
      }

      const src = image.getSize()
      if (src.width < 2 || src.height < 2) {
        return { ok: false, error: 'Viewport vacío' }
      }

      if (targetLong > 0) {
        const srcLong = Math.max(src.width, src.height)
        outW = Math.max(1, Math.round(src.width * (targetLong / srcLong)))
        outH = Math.max(1, Math.round(src.height * (targetLong / srcLong)))
        // Only nudge size if CDP landed a few px off (avoid big soft upscales).
        const drift = Math.abs(srcLong - targetLong) / targetLong
        if (drift > 0.02 && (outW !== src.width || outH !== src.height)) {
          image = image.resize({
            width: outW,
            height: outH,
            quality: 'best',
          })
        } else {
          outW = src.width
          outH = src.height
        }
      } else {
        outW = src.width
        outH = src.height
      }

      clearDeviceEmulation(wc)

      const png = image.toPNG()
      const label =
        payload.quality === 'native' ? 'viewport' : payload.quality

      const result = await dialog.showSaveDialog(win, {
        title: `Guardar captura (${label})`,
        defaultPath: `prixelgrid-${label}-${outW}x${outH}-${Date.now()}.png`,
        filters: [{ name: 'PNG', extensions: ['png'] }],
      })
      if (result.canceled || !result.filePath) {
        return { ok: false, canceled: true, width: outW, height: outH }
      }

      await fs.writeFile(result.filePath, png)
      return {
        ok: true,
        path: result.filePath,
        width: outW,
        height: outH,
      }
    } catch (error) {
      if (wc && !wc.isDestroyed()) {
        clearDeviceEmulation(wc)
      }
      return {
        ok: false,
        error:
          error instanceof Error ? error.message : 'Captura fallida',
      }
    }
  },
)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)
