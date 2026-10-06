import { useEffect, useRef, type CSSProperties } from 'react'
import {
  DEVICE_PRESETS,
  formatDeviceLabel,
  getPresetById,
} from '../data/devicePresets'
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
import type { Pane as PaneModel } from '../store/appState'
import { useAppStore } from '../store/useAppStore'
import { PaneTools } from './PaneTools'
import { ImageOverlayLayer } from './tools/ImageOverlayLayer'
import { RulerOverlay } from './tools/RulerOverlay'

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
    applyPreset,
    updatePane,
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

  const displayWidth = Math.round(pane.width * pane.scale)
  const displayHeight = Math.round(pane.height * pane.scale)
  const isFocused = state.focusedPaneId === pane.id
  const isInspecting = pane.activeTool === 'inspect'
  const preset = getPresetById(pane.presetId ?? '')
  const form = preset?.form ?? 'freeform'
  const deviceLabel = formatDeviceLabel({
    name: pane.name,
    width: pane.width,
    height: pane.height,
    platform: preset?.platform,
    ppi: preset?.ppi,
  })

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

    const onDomReady = () => {
      readyRef.current = true
      installGuestTools()
      setLoadError(null)
    }

    const onNavigate = (event: Event & Record<string, unknown>) => {
      if (!readyRef.current) return
      try {
        const url =
          typeof event.url === 'string' ? event.url : webview.getURL()
        if (url) setUrlFromWebview(url)
      } catch {
        // webview not ready
      }
      installGuestTools()
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
        // ignore malformed sync payloads
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
    setFocusedPane,
    setInspectInfo,
    setLoadError,
    setPaneColor,
    setUrlFromWebview,
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
      // not ready yet
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

  return (
    <article
      className={`pane form-${form}${compact ? ' thumb' : ''}${
        isFocused ? ' focused' : ''
      }${isInspecting ? ' inspecting' : ''}`}
      onClick={() => setFocusedPane(pane.id)}
    >
      <div className="pane-header">
        <label className="pane-device-select">
          <select
            value={pane.presetId ?? 'freeform'}
            onChange={(event) => applyPreset(pane.id, event.target.value)}
            aria-label="Device preset"
            title={deviceLabel}
          >
            {DEVICE_PRESETS.map((item) => (
              <option key={item.id} value={item.id}>
                {formatDeviceLabel(item)}
              </option>
            ))}
          </select>
        </label>

        {!compact && (
          <div className="pane-meta">
            <input
              className="size"
              type="number"
              min={200}
              value={pane.width}
              onChange={(event) =>
                updatePane(pane.id, {
                  width: Number(event.target.value) || pane.width,
                  presetId: 'freeform',
                  name: 'Freeform',
                })
              }
              aria-label="Pane width"
            />
            <span>×</span>
            <input
              className="size"
              type="number"
              min={200}
              value={pane.height}
              onChange={(event) =>
                updatePane(pane.id, {
                  height: Number(event.target.value) || pane.height,
                  presetId: 'freeform',
                  name: 'Freeform',
                })
              }
              aria-label="Pane height"
            />
            <input
              className="scale"
              type="number"
              min={0.25}
              max={2}
              step={0.05}
              value={pane.scale}
              onChange={(event) =>
                updatePane(pane.id, {
                  scale: Number(event.target.value) || 1,
                })
              }
              aria-label="Pane scale"
              title="Scale"
            />
            <PaneTools pane={pane} />
          </div>
        )}
      </div>

      <div className={`device-shell form-${form}`}>
        <div
          className="pane-frame"
          style={
            {
              width: displayWidth,
              height: displayHeight,
              '--pane-w': `${pane.width}px`,
              '--pane-h': `${pane.height}px`,
              '--pane-scale': String(pane.scale),
            } as CSSProperties
          }
        >
          {/*
            Use CSS zoom (not transform) so Electron webviews keep a real
            width×height viewport and still shrink visually without clipping.
          */}
          <webview
            ref={(node) => {
              webviewRef.current = node as unknown as WebviewEl | null
              if (!node) readyRef.current = false
            }}
            src={state.url}
            className="pane-webview"
            style={
              {
                width: pane.width,
                height: pane.height,
                zoom: pane.scale,
              } as CSSProperties
            }
            allowpopups={'true' as unknown as boolean}
            webpreferences="contextIsolation=yes"
          />
          {!compact && pane.activeTool === 'ruler' && <RulerOverlay />}
          {!compact && <ImageOverlayLayer pane={pane} />}
        </div>
      </div>

      {!compact && (
        <div className="pane-footer">
          <div className="pane-health">
            <span className="badge error" title="Errors">
              0
            </span>
            <span className="badge warn" title="Warnings">
              0
            </span>
          </div>
          <div className="pane-online">Online</div>
        </div>
      )}
    </article>
  )
}
