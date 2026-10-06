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
  win.on("resize", () => {
  });
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
  if (!devtoolsView) return;
  devtoolsView.setBounds({
    x: Math.max(0, Math.round(bounds.x)),
    y: Math.max(0, Math.round(bounds.y)),
    width: Math.max(120, Math.round(bounds.width)),
    height: Math.max(120, Math.round(bounds.height))
  });
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
ipcMain.handle(
  "pixelgrid:emulate-viewport",
  async (_event, payload) => {
    try {
      const wc = webContents.fromId(payload.webContentsId);
      if (!wc || wc.isDestroyed()) return { ok: false, error: "Missing webContents" };
      const width = Math.max(1, Math.round(payload.width));
      const height = Math.max(1, Math.round(payload.height));
      const mobile = height >= width;
      wc.enableDeviceEmulation({
        screenPosition: mobile ? "mobile" : "desktop",
        screenSize: { width, height },
        viewSize: { width, height },
        viewPosition: { x: 0, y: 0 },
        deviceScaleFactor: 1,
        scale: 1
      });
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Emulation failed"
      };
    }
  }
);
ipcMain.handle(
  "pixelgrid:devtools-show",
  async (_event, payload) => {
    try {
      if (!win) return { ok: false, error: "No window" };
      const guest = webContents.fromId(payload.guestWebContentsId);
      if (!guest || guest.isDestroyed()) {
        return { ok: false, error: "Panel webview no listo" };
      }
      const view = ensureDevToolsView();
      if (!view) return { ok: false, error: "No se pudo crear DevTools" };
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
        error: error instanceof Error ? error.message : "DevTools failed"
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
        error: error instanceof Error ? error.message : "Layout failed"
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
      error: error instanceof Error ? error.message : "Hide failed"
    };
  }
});
ipcMain.handle(
  "pixelgrid:save-screenshot",
  async (_event, dataUrl) => {
    try {
      if (!win) return { ok: false, error: "No window" };
      const result = await dialog.showSaveDialog(win, {
        title: "Save screenshot",
        defaultPath: `pixelgrid-${Date.now()}.png`,
        filters: [{ name: "PNG", extensions: ["png"] }]
      });
      if (result.canceled || !result.filePath) {
        return { ok: false, canceled: true };
      }
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
      await fs.writeFile(result.filePath, Buffer.from(base64, "base64"));
      return { ok: true, path: result.filePath };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Save failed"
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
