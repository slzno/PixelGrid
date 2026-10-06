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
import {
  clearPaneSizeLock,
  lockWebviewSize,
  setPaneSizeLock,
} from '../lib/webviewSize'
import { clampZoom } from '../lib/zoom'
import type { Pane as PaneModel } from '../store/appState'
import { useAppStore } from '../store/useAppStore'
import { DeviceMockup } from './DeviceMockup'
import { PaneToolbar } from './PaneToolbar'
import { ImageOverlayLayer } from './tools/ImageOverlayLayer'
import { getMockupSpec, mockupOuterSize } from '../lib/deviceMockup'

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
  const urlRef = useRef('')
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

  urlRef.current = state.url
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
  const mockupSpec = getMockupSpec(form, preset?.category)
  const mockup = mockupOuterSize(mockupSpec, clipWidth, clipHeight, scale)
  const chromeWidth =
    mockupSpec.kind === 'none' ? clipWidth : mockup.outerW

  useEffect(() => {
    setPaneSizeLock(pane.id, viewWidth, viewHeight)
  }, [pane.id, viewWidth, viewHeight])

  useEffect(() => {
    return () => clearPaneSizeLock(pane.id)
  }, [pane.id])

  useEffect(() => {
    const webview = webviewRef.current
    if (!webview) return

    readyRef.current = false
    registerWebview(pane.id, webview)
    setPaneSizeLock(pane.id, viewWidth, viewHeight)

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

    const lockSize = () => {
      setPaneSizeLock(pane.id, viewWidth, viewHeight)
      lockWebviewSize(webview, viewWidth, viewHeight)
    }

    const scheduleRelock = () => {
      lockSize()
      window.setTimeout(lockSize, 50)
      window.setTimeout(lockSize, 200)
      window.setTimeout(lockSize, 500)
    }

    const onDomReady = () => {
      readyRef.current = true
      scheduleRelock()
      installGuestTools()
      applyDark()
      setLoadError(null)
    }

    const onStartLoading = () => {
      lockSize()
    }

    const onFinishLoad = () => {
      readyRef.current = true
      scheduleRelock()
      installGuestTools()
      applyDark()
    }

    const onNavigate = (event: Event & Record<string, unknown>) => {
      scheduleRelock()
      try {
        const url =
          typeof event.url === 'string' ? event.url : webview.getURL()
        // Ignore transient reload/blank URLs so we don't thrash navigation state.
        if (
          url &&
          url !== 'about:blank' &&
          !url.startsWith('chrome-error://') &&
          url !== urlRef.current
        ) {
          setUrlFromWebview(url)
        }
      } catch {
        // not ready
      }
      if (!readyRef.current) return
      installGuestTools()
      applyDark()
    }

    const onFail = (event: Event & Record<string, unknown>) => {
      if (event.errorCode === -3) return
      if (event.isMainFrame === false) return
      const description =
        typeof event.errorDescription === 'string'
          ? event.errorDescription
          : 'No se pudo cargar la página'
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
    webview.addEventListener('did-start-loading', onStartLoading)
    webview.addEventListener('did-finish-load', onFinishLoad)
    webview.addEventListener('did-navigate', onNavigate)
    webview.addEventListener('did-navigate-in-page', onNavigate)
    webview.addEventListener('did-fail-load', onFail)
    webview.addEventListener('console-message', onConsoleMessage)

    // Initial lock in case the element is already attached.
    lockSize()

    return () => {
      readyRef.current = false
      webview.removeEventListener('dom-ready', onDomReady)
      webview.removeEventListener('did-start-loading', onStartLoading)
      webview.removeEventListener('did-finish-load', onFinishLoad)
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
      if (typeof webview.isLoading === 'function' && webview.isLoading()) return
      const current = webview.getURL()
      if (
        current &&
        current !== state.url &&
        current !== 'about:blank' &&
        state.url
      ) {
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
    lockWebviewSize(webview, viewWidth, viewHeight)
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
    width: viewWidth,
    height: viewHeight,
    minWidth: viewWidth,
    minHeight: viewHeight,
    display: 'flex',
    border: 0,
    margin: 0,
    padding: 0,
    boxSizing: 'border-box',
    background: '#fff',
  }

  const viewport = (
    <div
      className="viewport-clip"
      style={{
        width: clipWidth,
        height: clipHeight,
        overflow: 'hidden',
      }}
    >
      <div className="viewport-scale" style={scaleWrapStyle}>
        <webview
          ref={(node: HTMLWebViewElement | null) => {
            const el = node as unknown as WebviewEl | null
            webviewRef.current = el
            if (!el) {
              readyRef.current = false
              return
            }
            lockWebviewSize(el, viewWidth, viewHeight)
          }}
          src={state.url}
          className="pane-webview"
          {...({
            width: viewWidth,
            height: viewHeight,
          } as Record<string, number>)}
          style={webviewStyle}
          allowpopups={'true' as unknown as boolean}
          webpreferences="contextIsolation=yes"
        />
        {!compact && <ImageOverlayLayer pane={pane} />}
      </div>
    </div>
  )

  return (
    <article
      className={`device-pane form-${form}${compact ? ' thumb' : ''}${
        isFocused ? ' focused' : ''
      }${isInspecting ? ' inspecting' : ''}${
        mockupSpec.kind !== 'none' ? ' has-mockup' : ''
      }`}
      style={{ width: chromeWidth }}
      onClick={() => setFocusedPane(pane.id)}
    >
      {!compact && <PaneToolbar pane={pane} width={chromeWidth} />}

      <div className="pane-label-row" style={{ width: chromeWidth }}>
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

      <div className="viewport-shell" style={{ width: chromeWidth }}>
        {mockupSpec.kind === 'none' && (
          <div className="viewport-accent" aria-hidden />
        )}
        {mockupSpec.kind === 'none' ? (
          viewport
        ) : (
          <DeviceMockup
            spec={mockupSpec}
            scale={scale}
            screenW={clipWidth}
            screenH={clipHeight}
            outerW={mockup.outerW}
            frameW={mockup.frameW}
            frameH={mockup.frameH}
            baseW={mockup.baseW}
            baseH={mockup.baseH}
            buttonGutter={mockup.buttonGutter}
          >
            {viewport}
          </DeviceMockup>
        )}
      </div>
    </article>
  )
}
