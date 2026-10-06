import {
  app,
  BrowserView,
  BrowserWindow,
  dialog,
  ipcMain,
  webContents,
  type NativeImage,
  type WebContents,
} from 'electron'
import { fileURLToPath } from 'node:url'
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

function createWindow() {
  win = new BrowserWindow({
    title: 'Pixelgrid',
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#12141a',
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      webviewTag: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.setMenuBarVisibility(false)

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
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

ipcMain.handle(
  'pixelgrid:clear-emulation',
  async (_event, payload: { webContentsId: number }) => {
    try {
      const wc = webContents.fromId(payload.webContentsId)
      if (!wc || wc.isDestroyed()) return { ok: false }
      clearDeviceEmulation(wc)
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Clear failed',
      }
    }
  },
)

ipcMain.handle(
  'pixelgrid:devtools-show',
  async (
    _event,
    payload: { guestWebContentsId: number; bounds: Bounds },
  ) => {
    try {
      if (!win) return { ok: false, error: 'No window' }
      const guest = webContents.fromId(payload.guestWebContentsId)
      if (!guest || guest.isDestroyed()) {
        return { ok: false, error: 'Panel webview no listo' }
      }

      const view = ensureDevToolsView()
      if (!view) return { ok: false, error: 'No se pudo crear DevTools' }

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
        error: error instanceof Error ? error.message : 'DevTools failed',
      }
    }
  },
)

ipcMain.handle(
  'pixelgrid:devtools-layout',
  async (_event, payload: { bounds: Bounds }) => {
    try {
      if (!devtoolsView) return { ok: false }
      applyDevToolsBounds(payload.bounds)
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Layout failed',
      }
    }
  },
)

ipcMain.handle('pixelgrid:devtools-hide', async () => {
  try {
    hideDevToolsView()
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Hide failed',
    }
  }
})

const SCREENSHOT_LONG_EDGE: Record<string, number> = {
  '1080p': 1920,
  '2k': 2560,
  '4k': 3840,
}

async function captureWithCdp(
  wc: WebContents,
  cssW: number,
  cssH: number,
  scale: number,
): Promise<Buffer | null> {
  // DevTools / setDevToolsWebContents often owns the debugger — skip if busy.
  if (wc.debugger.isAttached()) return null

  try {
    wc.debugger.attach('1.3')
    await wc.debugger.sendCommand('Emulation.setDeviceMetricsOverride', {
      width: cssW,
      height: cssH,
      deviceScaleFactor: scale,
      mobile: cssH >= cssW,
      scale: 1,
    })
    await delay(200)
    const shot = (await wc.debugger.sendCommand('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
      captureBeyondViewport: true,
    })) as { data: string }
    return Buffer.from(shot.data, 'base64')
  } catch {
    return null
  } finally {
    try {
      await wc.debugger.sendCommand('Emulation.clearDeviceMetricsOverride')
    } catch {
      // ignore
    }
    try {
      if (wc.debugger.isAttached()) wc.debugger.detach()
    } catch {
      // ignore
    }
    clearDeviceEmulation(wc)
  }
}

async function captureWithResize(
  wc: WebContents,
  _cssW: number,
  _cssH: number,
  outW: number,
  outH: number,
): Promise<NativeImage> {
  clearDeviceEmulation(wc)
  await delay(40)
  let image = await wc.capturePage()
  const size = image.getSize()
  if (size.width !== outW || size.height !== outH) {
    image = image.resize({
      width: outW,
      height: outH,
      quality: 'best',
    })
  }
  return image
}

ipcMain.handle(
  'pixelgrid:capture-screenshot',
  async (
    _event,
    payload: {
      webContentsId: number
      width: number
      height: number
      quality: '1080p' | '2k' | '4k'
    },
  ) => {
    const cssW = Math.max(1, Math.round(payload.width))
    const cssH = Math.max(1, Math.round(payload.height))
    const targetLong = SCREENSHOT_LONG_EDGE[payload.quality] ?? 3840
    const longEdge = Math.max(cssW, cssH)
    const scale = Math.max(1, targetLong / longEdge)
    const outW = Math.round(cssW * scale)
    const outH = Math.round(cssH * scale)

    let wc: WebContents | undefined
    const hadEmbeddedDevTools =
      attachedGuestId === payload.webContentsId && devtoolsView !== null

    try {
      if (!win) return { ok: false, error: 'No window' }
      wc = webContents.fromId(payload.webContentsId)
      if (!wc || wc.isDestroyed()) {
        return { ok: false, error: 'Panel webview no listo' }
      }

      // Embedded DevTools holds the debugger and breaks CDP capture.
      if (hadEmbeddedDevTools) {
        hideDevToolsView()
        await delay(60)
      }

      // Capture first (so canceling the dialog doesn't leave bad emulation).
      let png: Buffer | null = await captureWithCdp(wc, cssW, cssH, scale)
      if (!png) {
        const image = await captureWithResize(wc, cssW, cssH, outW, outH)
        png = image.toPNG()
      }

      // Never leave device emulation on — it shrinks panes after reload.
      clearDeviceEmulation(wc)

      const result = await dialog.showSaveDialog(win, {
        title: `Save screenshot (${payload.quality.toUpperCase()})`,
        defaultPath: `pixelgrid-${payload.quality}-${outW}x${outH}-${Date.now()}.png`,
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
        error: error instanceof Error ? error.message : 'Capture failed',
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
