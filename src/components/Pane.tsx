import { useEffect, useRef, type CSSProperties } from 'react'
import { Circle } from 'lucide-react'
import { getPresetById } from '../data/devicePresets'
import {
  getApplyPointerScript,
  getApplyScrollScript,
  getSyncInstallScript,
} from '../lib/sync'
import {
  getInspectEnableScript,
  type InspectPayload,
} from '../lib/toolsScripts'
import {
  forEachWebview,
  registerWebview,
  safeExecuteJavaScript,
  type WebviewEl,
} from '../lib/webviewRegistry'
import { applyWebviewFill, emulateWebviewViewport } from '../lib/webviewSize'
import { clampZoom } from '../lib/zoom'
import type { Pane as PaneModel } from '../store/appState'
import { useAppStore } from '../store/useAppStore'
import { PaneToolbar } from './PaneToolbar'
import { ImageOverlayLayer } from './tools/ImageOverlayLayer'

const DARK_CSS = `
html { color-scheme: dark !important; }
html, body { background: #121212 !important; color: #e8e8e8 !important; }
`

type PaneProps = {
  pane: PaneModel
  compact?: boolean
}

export function Pane({ pane, compact = false }: PaneProps) {
  const webviewRef = useRef<WebviewEl | null>(null)
  const readyRef = useRef(false)
  const toolStateRef = useRef({
    syncEnabled: true,
    syncScroll: true,
    syncClick: true,
    activeTool: pane.activeTool,
  })

  const {
    state,
    setFocusedPane,
    setUrlFromWebview,
    setLoadError,
    setInspectInfo,
    setPaneColor,
  } = useAppStore()

  toolStateRef.current = {
    syncEnabled: state.syncEnabled,
    syncScroll: state.syncScroll,
    syncClick: state.syncClick,
    activeTool: pane.activeTool,
  }

  const viewWidth = Math.max(1, Math.round(pane.width))
  const viewHeight = Math.max(1, Math.round(pane.height))
  const scale = compact
    ? Math.min(0.28, clampZoom(state.zoomMode))
    : clampZoom(state.zoomMode)
  const clipWidth = Math.round(viewWidth * scale)
  const clipHeight = Math.round(viewHeight * scale)
  const isFocused = state.focusedPaneId === pane.id
  const isInspecting = pane.activeTool === 'inspect'
  const preset = getPresetById(pane.presetId ?? '')
  const form = preset?.form ?? 'freeform'
  useEffect(() => {
    const webview = webviewRef.current
    if (!webview) return

    readyRef.current = false
    registerWebview(pane.id, webview)

    const installGuestTools = () => {
      if (!readyRef.current) return
      const tools = toolStateRef.current
      void safeExecuteJavaScript(webview, getSyncInstallScript())
      void safeExecuteJavaScript(
        webview,
        getInspectEnableScript(tools.activeTool === 'inspect'),
      )
    }

    const applyDark = () => {
      if (!readyRef.current) return
      void safeExecuteJavaScript(
        webview,
        `(() => {
          let el = document.getElementById('pixelgrid-dark');
          if (${pane.darkMode ? 'true' : 'false'}) {
            if (!el) {
              el = document.createElement('style');
              el.id = 'pixelgrid-dark';
              document.documentElement.appendChild(el);
            }
            el.textContent = ${JSON.stringify(DARK_CSS)};
          } else if (el) {
            el.remove();
          }
        })()`,
      )
    }

    const onDomReady = () => {
      readyRef.current = true
      applyWebviewFill(webview)
      void emulateWebviewViewport(webview, viewWidth, viewHeight)
      installGuestTools()
      applyDark()
      setLoadError(null)
    }

    const onNavigate = (event: Event & Record<string, unknown>) => {
      if (!readyRef.current) return
      try {
        const url =
          typeof event.url === 'string' ? event.url : webview.getURL()
        if (url) setUrlFromWebview(url)
      } catch {
        // not ready
      }
      installGuestTools()
      applyDark()
    }

    const onFail = (event: Event & Record<string, unknown>) => {
      if (event.errorCode === -3) return
      if (event.isMainFrame === false) return
      const description =
        typeof event.errorDescription === 'string'
          ? event.errorDescription
          : 'Failed to load page'
      setLoadError(description)
    }

    const onConsoleMessage = (event: Event & Record<string, unknown>) => {
      const message = typeof event.message === 'string' ? event.message : ''
      const tools = toolStateRef.current

      if (message.startsWith('__PIXELGRID_COLOR__')) {
        try {
          const payload = JSON.parse(
            message.replace('__PIXELGRID_COLOR__', ''),
          ) as { color: string }
          if (payload.color) setPaneColor(pane.id, payload.color)
        } catch {
          // ignore
        }
        return
      }

      if (message.startsWith('__PIXELGRID_INSPECT__')) {
        if (tools.activeTool !== 'inspect') return
        try {
          const info = JSON.parse(
            message.replace('__PIXELGRID_INSPECT__', ''),
          ) as InspectPayload
          setInspectInfo(info)
          setFocusedPane(pane.id)
        } catch {
          // ignore
        }
        return
      }

      if (!tools.syncEnabled) return
      if (!message.startsWith('__PIXELGRID__')) return
      try {
        const payload = JSON.parse(message.replace('__PIXELGRID__', '')) as {
          channel: string
          payload: Record<string, number | string>
        }
        if (payload.channel === 'pixelgrid-scroll' && tools.syncScroll) {
          forEachWebview((_id, other) => {
            void safeExecuteJavaScript(
              other,
              getApplyScrollScript(
                Number(payload.payload.ratioX),
                Number(payload.payload.ratioY),
              ),
            )
          }, pane.id)
        }
        if (payload.channel === 'pixelgrid-pointer' && tools.syncClick) {
          forEachWebview((_id, other) => {
            void safeExecuteJavaScript(
              other,
              getApplyPointerScript(
                payload.payload.type as 'click' | 'mousemove',
                Number(payload.payload.ratioX),
                Number(payload.payload.ratioY),
              ),
            )
          }, pane.id)
        }
      } catch {
        // ignore
      }
    }

    webview.addEventListener('dom-ready', onDomReady)
    webview.addEventListener('did-navigate', onNavigate)
    webview.addEventListener('did-navigate-in-page', onNavigate)
    webview.addEventListener('did-fail-load', onFail)
    webview.addEventListener('console-message', onConsoleMessage)

    return () => {
      readyRef.current = false
      webview.removeEventListener('dom-ready', onDomReady)
      webview.removeEventListener('did-navigate', onNavigate)
      webview.removeEventListener('did-navigate-in-page', onNavigate)
      webview.removeEventListener('did-fail-load', onFail)
      webview.removeEventListener('console-message', onConsoleMessage)
      registerWebview(pane.id, null)
    }
  }, [
    pane.id,
    pane.darkMode,
    setFocusedPane,
    setInspectInfo,
    setLoadError,
    setPaneColor,
    setUrlFromWebview,
    viewHeight,
    viewWidth,
  ])

  useEffect(() => {
    const webview = webviewRef.current
    if (!webview || !readyRef.current) return
    try {
      const current = webview.getURL()
      if (current && current !== state.url) {
        void webview.loadURL(state.url)
      }
    } catch {
      // not ready
    }
  }, [state.url])

  useEffect(() => {
    const webview = webviewRef.current
    if (!webview || compact || !readyRef.current) return
    void safeExecuteJavaScript(
      webview,
      getInspectEnableScript(isInspecting),
    )
  }, [compact, isInspecting])

  useEffect(() => {
    const webview = webviewRef.current
    if (!webview) return
    applyWebviewFill(webview)
    if (readyRef.current) {
      void emulateWebviewViewport(webview, viewWidth, viewHeight)
    }
  }, [viewWidth, viewHeight, scale])

  useEffect(() => {
    const webview = webviewRef.current
    if (!webview || !readyRef.current) return
    void safeExecuteJavaScript(
      webview,
      `(() => {
        let el = document.getElementById('pixelgrid-dark');
        if (${pane.darkMode ? 'true' : 'false'}) {
          if (!el) {
            el = document.createElement('style');
            el.id = 'pixelgrid-dark';
            document.documentElement.appendChild(el);
          }
          el.textContent = ${JSON.stringify(DARK_CSS)};
        } else if (el) {
          el.remove();
        }
      })()`,
    )
  }, [pane.darkMode])

  const scaleWrapStyle: CSSProperties = {
    position: 'relative',
    width: viewWidth,
    height: viewHeight,
    minWidth: viewWidth,
    minHeight: viewHeight,
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
  }

  const webviewStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    minWidth: '100%',
    minHeight: '100%',
    display: 'flex',
    border: 0,
    margin: 0,
    padding: 0,
    boxSizing: 'border-box',
    background: '#fff',
  }

  return (
    <article
      className={`device-pane form-${form}${compact ? ' thumb' : ''}${
        isFocused ? ' focused' : ''
      }${isInspecting ? ' inspecting' : ''}`}
      style={{ width: clipWidth }}
      onClick={() => setFocusedPane(pane.id)}
    >
      {!compact && <PaneToolbar pane={pane} width={clipWidth} />}

      <div className="pane-label-row" style={{ width: clipWidth }}>
        <div className="pane-label-name">
          {isFocused && (
            <Circle
              size={8}
              strokeWidth={0}
              fill="currentColor"
              className="focus-dot"
              aria-hidden
            />
          )}
          <span>{pane.name}</span>
        </div>
        <div className="pane-label-size" title="Tamaño real del viewport">
          <span>
            {viewWidth}×{viewHeight}
          </span>
          <span className="px-unit">px</span>
        </div>
      </div>

      <div className="viewport-shell" style={{ width: clipWidth }}>
        <div className="viewport-accent" aria-hidden />
        <div
          className="viewport-clip"
          style={{
            width: clipWidth,
            height: clipHeight,
            overflow: 'hidden',
          }}
        >
          {/* Parent owns real device px; webview fills with width/height 100%. */}
          <div className="viewport-scale" style={scaleWrapStyle}>
            <webview
              ref={(node: HTMLWebViewElement | null) => {
                const el = node as unknown as WebviewEl | null
                webviewRef.current = el
                if (!el) {
                  readyRef.current = false
                  return
                }
                applyWebviewFill(el)
              }}
              src={state.url}
              className="pane-webview"
              {...({
                width: '100%',
                height: '100%',
              } as Record<string, string>)}
              style={webviewStyle}
              allowpopups={'true' as unknown as boolean}
              webpreferences="contextIsolation=yes"
            />
            {!compact && <ImageOverlayLayer pane={pane} />}
          </div>
        </div>
      </div>
    </article>
  )
}
