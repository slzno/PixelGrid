/// <reference types="vite/client" />

import type { CSSProperties, DetailedHTMLProps, HTMLAttributes } from 'react'

interface WebviewTag extends HTMLElement {
  src: string
  partition?: string
  allowpopups?: boolean
  useragent?: string
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
  namespace JSX {
    interface IntrinsicElements {
      webview: DetailedHTMLProps<
        HTMLAttributes<WebviewTag> & {
          src?: string
          partition?: string
          allowpopups?: boolean | string
          useragent?: string
          webpreferences?: string
          style?: CSSProperties
        },
        WebviewTag
      >
    }
  }

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
  }
}

export {}
