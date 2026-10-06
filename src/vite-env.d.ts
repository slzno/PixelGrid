/// <reference types="vite/client" />

interface WebviewTag extends HTMLElement {
  src: string
  partition?: string
  allowpopups?: boolean
  useragent?: string
  preload?: string
  getURL(): string
  getTitle(): string
  isLoading(): boolean
  canGoBack(): boolean
  canGoForward(): boolean
  goBack(): void
  goForward(): void
  reload(): void
  stop(): void
  loadURL(url: string): Promise<void>
  getWebContentsId(): number
  setZoomFactor(factor: number): void
  getZoomFactor(): number
  executeJavaScript<T = unknown>(code: string, userGesture?: boolean): Promise<T>
  insertCSS(css: string): Promise<string>
  openDevTools(): void
  closeDevTools(): void
  addEventListener(
    type: string,
    listener: (event: Event & Record<string, unknown>) => void,
    options?: boolean | AddEventListenerOptions,
  ): void
  removeEventListener(
    type: string,
    listener: (event: Event & Record<string, unknown>) => void,
    options?: boolean | EventListenerOptions,
  ): void
}

declare global {
  interface Window {
    ipcRenderer: {
      on: (
        channel: string,
        listener: (event: unknown, ...args: unknown[]) => void,
      ) => unknown
      off: (...args: unknown[]) => unknown
      send: (...args: unknown[]) => void
      invoke: (...args: unknown[]) => Promise<unknown>
    }
    pixelgrid?: {
      getGuestPreloadPath: () => Promise<string | null>
    }
  }
}

export {}
