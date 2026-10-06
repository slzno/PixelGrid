import type { WebviewTag } from '../vite-env'

const registry = new Map<string, WebviewTag>()

export function registerWebview(id: string, webview: WebviewTag | null) {
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
  callback: (id: string, webview: WebviewTag) => void,
  exceptId?: string,
) {
  for (const [id, webview] of registry) {
    if (exceptId && id === exceptId) continue
    callback(id, webview)
  }
}
