/**
 * Preload for <webview> guests — bridges sync events to the host via sendToHost.
 * Must remain plain CommonJS so it can load without a separate Vite build step.
 */
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('__pixelgridHost', {
  send(channel, payload) {
    try {
      ipcRenderer.sendToHost('pixelgrid-bridge', { channel, payload })
    } catch {
      // host not ready
    }
  },
})
