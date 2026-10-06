import { ipcMain as g, webContents as v, screen as V, dialog as O, app as m, BrowserWindow as I, BrowserView as R, nativeImage as S } from "electron";
import { fileURLToPath as B } from "node:url";
import { existsSync as A } from "node:fs";
import W from "node:fs/promises";
import d from "node:path";
const k = d.dirname(B(import.meta.url));
process.env.APP_ROOT = d.join(k, "..");
const D = process.env.VITE_DEV_SERVER_URL, K = d.join(process.env.APP_ROOT, "dist-electron"), P = d.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = D ? d.join(process.env.APP_ROOT, "public") : P;
let o, l = null, f = null;
function j() {
  const e = [
    d.join(process.env.APP_ROOT ?? "", "build", "icon.png"),
    d.join(process.env.VITE_PUBLIC ?? "", "icons", "icon.png"),
    d.join(process.env.VITE_PUBLIC ?? "", "prixelgrid.svg")
  ];
  for (const r of e)
    if (r && A(r)) return r;
}
function T() {
  const e = j();
  if (o = new I({
    title: "PrixelGrid",
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#1e1f22",
    ...e ? { icon: e } : {},
    webPreferences: {
      preload: d.join(k, "preload.mjs"),
      webviewTag: !0,
      contextIsolation: !0,
      nodeIntegration: !1
    }
  }), o.setMenuBarVisibility(!1), process.platform === "darwin" && m.dock && e)
    try {
      m.dock.setIcon(e);
    } catch {
    }
  o.on("closed", () => {
    l = null, f = null, o = null;
  }), D ? o.loadURL(D) : o.loadFile(d.join(P, "index.html"));
}
function L() {
  return o ? l || (l = new R({
    webPreferences: {
      contextIsolation: !0,
      nodeIntegration: !1,
      sandbox: !0
    }
  }), o.addBrowserView(l), l) : null;
}
function _(e) {
  if (!l || !o) return;
  const [r, t] = o.getContentSize(), i = Math.min(r - 120, Math.max(200, Math.round(e.x))), n = Math.min(t - 120, Math.max(36, Math.round(e.y))), a = Math.max(120, Math.min(Math.round(e.width), r - i)), s = Math.max(120, Math.min(Math.round(e.height), t - n));
  l.setBounds({ x: i, y: n, width: a, height: s });
}
function N() {
  if (f !== null) {
    const e = v.fromId(f);
    e && !e.isDestroyed() && e.isDevToolsOpened() && e.closeDevTools(), f = null;
  }
  o && l && o.removeBrowserView(l), l = null;
}
function p(e) {
  try {
    e.disableDeviceEmulation();
  } catch {
  }
  try {
    e.debugger.isAttached() && e.debugger.sendCommand("Emulation.clearDeviceMetricsOverride").catch(() => {
    });
  } catch {
  }
}
async function G(e, r, t, i) {
  const n = Math.min(6, Math.max(1, i)), a = Math.max(1, Math.round(r)), s = Math.max(1, Math.round(t)), w = !e.debugger.isAttached();
  w && e.debugger.attach("1.3");
  try {
    await e.debugger.sendCommand("Emulation.setDeviceMetricsOverride", {
      width: a,
      height: s,
      deviceScaleFactor: n,
      mobile: s > a,
      scale: 1
    }), await new Promise((b) => setTimeout(b, 80));
    const u = await e.debugger.sendCommand("Page.captureScreenshot", {
      format: "png",
      fromSurface: !0,
      captureBeyondViewport: !1
    });
    await e.debugger.sendCommand("Emulation.clearDeviceMetricsOverride").catch(() => {
    });
    const M = S.createFromBuffer(Buffer.from(u.data, "base64"));
    if (M.isEmpty())
      throw new Error("Captura vacía");
    return M;
  } finally {
    try {
      await e.debugger.sendCommand("Emulation.clearDeviceMetricsOverride").catch(() => {
      });
    } catch {
    }
    if (p(e), w && e.debugger.isAttached())
      try {
        e.debugger.detach();
      } catch {
      }
  }
}
g.handle(
  "prixelgrid:set-ui-theme",
  async (e, r) => {
    if (!o || o.isDestroyed()) return { ok: !1 };
    const t = r.theme === "light" ? "#eef0f3" : "#1e1f22";
    return o.setBackgroundColor(t), { ok: !0 };
  }
);
g.handle(
  "prixelgrid:clear-emulation",
  async (e, r) => {
    try {
      const t = v.fromId(r.webContentsId);
      return !t || t.isDestroyed() ? { ok: !1 } : (p(t), { ok: !0 });
    } catch (t) {
      return {
        ok: !1,
        error: t instanceof Error ? t.message : "No se pudo limpiar la emulación"
      };
    }
  }
);
g.handle(
  "prixelgrid:devtools-show",
  async (e, r) => {
    try {
      if (!o) return { ok: !1, error: "Sin ventana" };
      const t = v.fromId(r.guestWebContentsId);
      if (!t || t.isDestroyed())
        return { ok: !1, error: "Panel webview no listo" };
      const i = L();
      if (!i)
        return {
          ok: !1,
          error: "No se pudieron crear las herramientas de desarrollo"
        };
      _(r.bounds);
      const n = f, a = n !== null && n !== r.guestWebContentsId;
      if (a && n !== null) {
        const s = v.fromId(n);
        s && !s.isDestroyed() && s.isDevToolsOpened() && s.closeDevTools();
      }
      return (a || !t.isDevToolsOpened()) && (t.isDevToolsOpened() && t.closeDevTools(), t.setDevToolsWebContents(i.webContents), t.openDevTools({ mode: "detach", activate: !0 }), f = r.guestWebContentsId), o.setTopBrowserView(i), { ok: !0 };
    } catch (t) {
      return {
        ok: !1,
        error: t instanceof Error ? t.message : "Error en las herramientas de desarrollo"
      };
    }
  }
);
g.handle(
  "prixelgrid:devtools-layout",
  async (e, r) => {
    try {
      return l ? (_(r.bounds), { ok: !0 }) : { ok: !1 };
    } catch (t) {
      return {
        ok: !1,
        error: t instanceof Error ? t.message : "Error al ajustar el panel"
      };
    }
  }
);
g.handle("prixelgrid:devtools-hide", async () => {
  try {
    return N(), { ok: !0 };
  } catch (e) {
    return {
      ok: !1,
      error: e instanceof Error ? e.message : "No se pudo cerrar el panel"
    };
  }
});
const H = {
  native: 0,
  // CSS viewport × display scale (nítido)
  "1080p": 1920,
  "2k": 2560,
  "4k": 3840
};
g.handle(
  "prixelgrid:capture-screenshot",
  async (e, r) => {
    let t, i = 0, n = 0;
    try {
      if (!o) return { ok: !1, error: "Sin ventana" };
      if (t = v.fromId(r.webContentsId), !t || t.isDestroyed())
        return { ok: !1, error: "Panel webview no listo" };
      p(t);
      const a = Math.max(1, Math.round(r.cssWidth || 1)), s = Math.max(1, Math.round(r.cssHeight || 1));
      if (a < 2 || s < 2)
        return { ok: !1, error: "Viewport vacío" };
      const w = Math.max(a, s), u = H[r.quality] ?? 0, M = Math.max(
        1,
        V.getPrimaryDisplay().scaleFactor || 1
      ), b = u > 0 ? Math.min(6, Math.max(1, u / w)) : Math.min(3, Math.max(2, M));
      let h;
      try {
        h = await G(
          t,
          a,
          s,
          b
        );
      } catch {
        h = await t.capturePage();
      }
      const c = h.getSize();
      if (c.width < 2 || c.height < 2)
        return { ok: !1, error: "Viewport vacío" };
      if (u > 0) {
        const y = Math.max(c.width, c.height);
        i = Math.max(1, Math.round(c.width * (u / y))), n = Math.max(1, Math.round(c.height * (u / y))), Math.abs(y - u) / u > 0.02 && (i !== c.width || n !== c.height) ? h = h.resize({
          width: i,
          height: n,
          quality: "best"
        }) : (i = c.width, n = c.height);
      } else
        i = c.width, n = c.height;
      p(t);
      const C = h.toPNG(), E = r.quality === "native" ? "viewport" : r.quality, x = await O.showSaveDialog(o, {
        title: `Guardar captura (${E})`,
        defaultPath: `prixelgrid-${E}-${i}x${n}-${Date.now()}.png`,
        filters: [{ name: "PNG", extensions: ["png"] }]
      });
      return x.canceled || !x.filePath ? { ok: !1, canceled: !0, width: i, height: n } : (await W.writeFile(x.filePath, C), {
        ok: !0,
        path: x.filePath,
        width: i,
        height: n
      });
    } catch (a) {
      return t && !t.isDestroyed() && p(t), {
        ok: !1,
        error: a instanceof Error ? a.message : "Captura fallida"
      };
    }
  }
);
m.on("window-all-closed", () => {
  process.platform !== "darwin" && (m.quit(), o = null);
});
m.on("activate", () => {
  I.getAllWindows().length === 0 && T();
});
m.whenReady().then(T);
export {
  K as MAIN_DIST,
  P as RENDERER_DIST,
  D as VITE_DEV_SERVER_URL
};
