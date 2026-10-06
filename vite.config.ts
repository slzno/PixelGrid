import { defineConfig } from 'vite'
import { copyFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'
import react from '@vitejs/plugin-react'

function copyGuestPreload() {
  const dir = path.resolve(__dirname, 'dist-electron')
  mkdirSync(dir, { recursive: true })
  copyFileSync(
    path.resolve(__dirname, 'electron/guest-preload.cjs'),
    path.join(dir, 'guest-preload.cjs'),
  )
}

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    react(),
    {
      name: 'copy-guest-preload',
      buildStart() {
        copyGuestPreload()
      },
      closeBundle() {
        copyGuestPreload()
      },
    },
    electron({
      main: {
        // Shortcut of `build.lib.entry`.
        entry: 'electron/main.ts',
        vite: {
          plugins: [
            {
              name: 'copy-guest-preload-main',
              closeBundle() {
                copyGuestPreload()
              },
            },
          ],
        },
      },
      preload: {
        // Shortcut of `build.rollupOptions.input`.
        // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
        input: path.join(__dirname, 'electron/preload.ts'),
      },
      // Ployfill the Electron and Node.js API for Renderer process.
      // If you want use Node.js in Renderer process, the `nodeIntegration` needs to be enabled in the Main process.
      // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
      renderer: process.env.NODE_ENV === 'test'
        // https://github.com/electron-vite/vite-plugin-electron-renderer/issues/78#issuecomment-2053600808
        ? undefined
        : {},
    }),
  ],
})
