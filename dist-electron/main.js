import { ipcMain, webContents, dialog, app, BrowserWindow, BrowserView } from "electron";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import path from "node:path";
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
let devtoolsView = null;
let attachedGuestId = null;
function createWindow() {
  win = new BrowserWindow({
    title: "Pixelgrid",
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#12141a",
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs"),
      webviewTag: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.setMenuBarVisibility(false);
  win.on("closed", () => {
    devtoolsView = null;
    attachedGuestId = null;
    win = null;
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
function ensureDevToolsView() {
  if (!win) return null;
  if (devtoolsView) return devtoolsView;
  devtoolsView = new BrowserView({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  win.addBrowserView(devtoolsView);
  return devtoolsView;
}
function applyDevToolsBounds(bounds) {
  if (!devtoolsView || !win) return;
  const [winW, winH] = win.getContentSize();
  const x = Math.min(winW - 120, Math.max(200, Math.round(bounds.x)));
  const y = Math.min(winH - 120, Math.max(36, Math.round(bounds.y)));
  const width = Math.max(120, Math.min(Math.round(bounds.width), winW - x));
  const height = Math.max(120, Math.min(Math.round(bounds.height), winH - y));
  devtoolsView.setBounds({ x, y, width, height });
}
function hideDevToolsView() {
  if (attachedGuestId !== null) {
    const guest = webContents.fromId(attachedGuestId);
    if (guest && !guest.isDestroyed() && guest.isDevToolsOpened()) {
      guest.closeDevTools();
    }
    attachedGuestId = null;
  }
  if (win && devtoolsView) {
    win.removeBrowserView(devtoolsView);
  }
  devtoolsView = null;
}
function clearDeviceEmulation(wc) {
  try {
    wc.disableDeviceEmulation();
  } catch {
  }
}
ipcMain.handle(
  "pixelgrid:clear-emulation",
  async (_event, payload) => {
    try {
      const wc = webContents.fromId(payload.webContentsId);
      if (!wc || wc.isDestroyed()) return { ok: false };
      clearDeviceEmulation(wc);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "No se pudo limpiar la emulación"
      };
    }
  }
);
ipcMain.handle(
  "pixelgrid:devtools-show",
  async (_event, payload) => {
    try {
      if (!win) return { ok: false, error: "Sin ventana" };
      const guest = webContents.fromId(payload.guestWebContentsId);
      if (!guest || guest.isDestroyed()) {
        return { ok: false, error: "Panel webview no listo" };
      }
      const view = ensureDevToolsView();
      if (!view) {
        return {
          ok: false,
          error: "No se pudieron crear las herramientas de desarrollo"
        };
      }
      applyDevToolsBounds(payload.bounds);
      const previousGuestId = attachedGuestId;
      const switching = previousGuestId !== null && previousGuestId !== payload.guestWebContentsId;
      if (switching && previousGuestId !== null) {
        const prev = webContents.fromId(previousGuestId);
        if (prev && !prev.isDestroyed() && prev.isDevToolsOpened()) {
          prev.closeDevTools();
        }
      }
      if (switching || !guest.isDevToolsOpened()) {
        if (guest.isDevToolsOpened()) guest.closeDevTools();
        guest.setDevToolsWebContents(view.webContents);
        guest.openDevTools({ mode: "detach", activate: true });
        attachedGuestId = payload.guestWebContentsId;
      }
      win.setTopBrowserView(view);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Error en las herramientas de desarrollo"
      };
    }
  }
);
ipcMain.handle(
  "pixelgrid:devtools-layout",
  async (_event, payload) => {
    try {
      if (!devtoolsView) return { ok: false };
      applyDevToolsBounds(payload.bounds);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Error al ajustar el panel"
      };
    }
  }
);
ipcMain.handle("pixelgrid:devtools-hide", async () => {
  try {
    hideDevToolsView();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "No se pudo cerrar el panel"
    };
  }
});
const SCREENSHOT_LONG_EDGE = {
  native: 0,
  // keep viewport pixels as-is
  "1080p": 1920,
  "2k": 2560,
  "4k": 3840
};
ipcMain.handle(
  "pixelgrid:capture-screenshot",
  async (_event, payload) => {
    let wc;
    let outW = 0;
    let outH = 0;
    try {
      if (!win) return { ok: false, error: "Sin ventana" };
      wc = webContents.fromId(payload.webContentsId);
      if (!wc || wc.isDestroyed()) {
        return { ok: false, error: "Panel webview no listo" };
      }
      clearDeviceEmulation(wc);
      let image = await wc.capturePage();
      const src = image.getSize();
      if (src.width < 2 || src.height < 2) {
        return { ok: false, error: "Viewport vacío" };
      }
      const targetLong = SCREENSHOT_LONG_EDGE[payload.quality] ?? 0;
      if (targetLong > 0) {
        const srcLong = Math.max(src.width, src.height);
        const scale = targetLong / srcLong;
        outW = Math.max(1, Math.round(src.width * scale));
        outH = Math.max(1, Math.round(src.height * scale));
        if (outW !== src.width || outH !== src.height) {
          image = image.resize({
            width: outW,
            height: outH,
            quality: "best"
          });
        }
      } else {
        outW = src.width;
        outH = src.height;
      }
      const png = image.toPNG();
      const label = payload.quality === "native" ? "viewport" : payload.quality;
      const result = await dialog.showSaveDialog(win, {
        title: `Guardar captura (${label})`,
        defaultPath: `pixelgrid-${label}-${outW}x${outH}-${Date.now()}.png`,
        filters: [{ name: "PNG", extensions: ["png"] }]
      });
      if (result.canceled || !result.filePath) {
        return { ok: false, canceled: true, width: outW, height: outH };
      }
      await fs.writeFile(result.filePath, png);
      return {
        ok: true,
        path: result.filePath,
        width: outW,
        height: outH
      };
    } catch (error) {
      if (wc && !wc.isDestroyed()) {
        clearDeviceEmulation(wc);
      }
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Captura fallida"
      };
    }
  }
);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(createWindow);
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
