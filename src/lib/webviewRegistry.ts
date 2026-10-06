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
  reloadIgnoringCache(): void
  isLoading(): boolean
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

export function safeReload(webview: WebviewEl) {
  try {
    const url = webview.getURL()
    // loadURL keeps the host element size more stable than reload()
    // (reload() often re-triggers broken device-emulation scale).
    if (url && url !== 'about:blank') {
      void webview.loadURL(url)
      return
    }
    webview.reload()
  } catch {
    try {
      webview.reload()
    } catch {
      // guest not ready
    }
  }
}

export function safeGoBack(webview: WebviewEl) {
  try {
    if (webview.canGoBack()) webview.goBack()
  } catch {
    // guest not ready
  }
}

export function safeGoForward(webview: WebviewEl) {
  try {
    if (webview.canGoForward()) webview.goForward()
  } catch {
    // guest not ready
  }
}

export type { WebviewEl }
