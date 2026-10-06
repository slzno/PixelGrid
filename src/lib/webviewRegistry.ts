type NativeImageLike = {
  toDataURL(): string
  toPNG(): Buffer
}

type WebviewEl = HTMLElement & {
  src: string
  getURL(): string
  canGoBack(): boolean
  canGoForward(): boolean
  goBack(): void
  goForward(): void
  reload(): void
  loadURL(url: string): Promise<void>
  capturePage(): Promise<NativeImageLike>
  setZoomFactor(factor: number): void
  getZoomFactor(): number
  getWebContentsId(): number
  executeJavaScript<T = unknown>(code: string, userGesture?: boolean): Promise<T>
  insertCSS(css: string): Promise<string>
  openDevTools(): void
  closeDevTools(): void
  isDevToolsOpened(): boolean
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

const registry = new Map<string, WebviewEl>()

export function registerWebview(id: string, webview: WebviewEl | null) {
  if (!webview) {
    registry.delete(id)
    return
  }
  registry.set(id, webview)
}

export function getWebview(id: string) {
  return registry.get(id)
}

export function getAllWebviews() {
  return Array.from(registry.entries())
}

export function forEachWebview(
  callback: (id: string, webview: WebviewEl) => void,
  exceptId?: string,
) {
  for (const [id, webview] of registry) {
    if (exceptId && id === exceptId) continue
    callback(id, webview)
  }
}

/** executeJavaScript throws sync if webview is not dom-ready — never call it bare. */
export function safeExecuteJavaScript(webview: WebviewEl, code: string) {
  try {
    return webview.executeJavaScript(code).catch(() => undefined)
  } catch {
    return Promise.resolve(undefined)
  }
}

export type { WebviewEl }
