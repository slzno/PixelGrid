import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { X } from 'lucide-react'
import { getWebview } from '@/lib/webviewRegistry'
import { useAppStore } from '@/store/useAppStore'

const MIN_WIDTH = 280
const MAX_WIDTH_RATIO = 0.72
const DEFAULT_WIDTH = 440
const WIDTH_STORAGE_KEY = 'prixelgrid-devtools-width'

function clampWidth(value: number) {
  const max = Math.floor(window.innerWidth * MAX_WIDTH_RATIO)
  return Math.min(max, Math.max(MIN_WIDTH, Math.round(value)))
}

function readStoredWidth() {
  try {
    const raw = localStorage.getItem(WIDTH_STORAGE_KEY)
    const n = raw ? Number(raw) : DEFAULT_WIDTH
    return Number.isFinite(n) ? clampWidth(n) : DEFAULT_WIDTH
  } catch {
    return DEFAULT_WIDTH
  }
}

type Bounds = { x: number; y: number; width: number; height: number }

function measureBounds(el: HTMLElement): Bounds {
  const rect = el.getBoundingClientRect()
  // Leave 5px for the resize handle so BrowserView doesn't steal pointer events.
  const handle = 5
  return {
    x: Math.round(rect.left + handle),
    y: Math.round(rect.top),
    width: Math.round(Math.max(0, rect.width - handle)),
    height: Math.round(rect.height),
  }
}

export function DevToolsPanel() {
  const slotRef = useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(readStoredWidth)
  const [error, setError] = useState<string | null>(null)
  const { state, setSidePanel, setStatusMessage } = useAppStore()

  const pane =
    state.panes.find((item) => item.id === state.focusedPaneId) ??
    state.panes[0]
  const paneId = pane?.id

  const syncDevTools = useCallback(async () => {
    if (!paneId || !slotRef.current) return
    const guest = getWebview(paneId)
    if (!guest) {
      setError('El panel aún no está listo')
      return
    }

    let guestId: number
    try {
      guestId = guest.getWebContentsId()
    } catch {
      setError('El panel aún no está listo')
      return
    }

    const bounds = measureBounds(slotRef.current)
    if (bounds.width < 80 || bounds.height < 80) return

    const result = (await window.ipcRenderer.invoke('prixelgrid:devtools-show', {
      guestWebContentsId: guestId,
      bounds,
    })) as { ok: boolean; error?: string }

    if (!result.ok) {
      setError(
        result.error || 'No se pudieron abrir las herramientas de desarrollo',
      )
      setStatusMessage(
        result.error || 'No se pudieron abrir las herramientas de desarrollo',
      )
      return
    }
    setError(null)
  }, [paneId, setStatusMessage])

  const syncLayoutOnly = useCallback(async () => {
    if (!slotRef.current) return
    const bounds = measureBounds(slotRef.current)
    if (bounds.width < 80 || bounds.height < 80) return
    await window.ipcRenderer.invoke('prixelgrid:devtools-layout', { bounds })
  }, [])

  useEffect(() => {
    // Wait for layout after width/open changes.
    const timer = window.setTimeout(() => {
      void syncDevTools()
    }, 40)
    return () => window.clearTimeout(timer)
  }, [syncDevTools, width, paneId])

  useEffect(() => {
    const onResize = () => {
      setWidth((w) => clampWidth(w))
      void syncLayoutOnly()
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [syncLayoutOnly])

  useEffect(() => {
    const el = slotRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      void syncLayoutOnly()
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [syncLayoutOnly])

  useEffect(() => {
    return () => {
      void window.ipcRenderer.invoke('prixelgrid:devtools-hide')
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(WIDTH_STORAGE_KEY, String(width))
  }, [width])

  const onClose = () => {
    void window.ipcRenderer.invoke('prixelgrid:devtools-hide')
    setSidePanel(false)
  }

  const onResizePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const handle = event.currentTarget
    handle.setPointerCapture(event.pointerId)
    const startX = event.clientX
    const startWidth = width

    const onMove = (moveEvent: PointerEvent) => {
      const next = clampWidth(startWidth + (startX - moveEvent.clientX))
      setWidth(next)
    }
    const onUp = (upEvent: PointerEvent) => {
      handle.releasePointerCapture(upEvent.pointerId)
      handle.removeEventListener('pointermove', onMove)
      handle.removeEventListener('pointerup', onUp)
      void syncDevTools()
    }
    handle.addEventListener('pointermove', onMove)
    handle.addEventListener('pointerup', onUp)
  }

  if (!pane) return null

  return (
    <aside className="side-panel devtools-panel" style={{ width }}>
      <div
        className="devtools-resize-handle"
        title="Arrastra para cambiar el ancho"
        onPointerDown={onResizePointerDown}
      />
      <div className="side-panel-header">
        <strong>Consola · {pane.name}</strong>
        <button
          type="button"
          className="icon-btn"
          onClick={onClose}
          aria-label="Cerrar consola"
        >
          <X size={15} strokeWidth={1.75} />
        </button>
      </div>
      <div ref={slotRef} className="devtools-host-slot">
        {error ? <p className="side-panel-empty">{error}</p> : null}
      </div>
    </aside>
  )
}
