import { DEVICE_PRESETS, getPresetById } from '../data/devicePresets'
import type { InspectPayload } from '../lib/toolsScripts'

export type LayoutMode = 'horizontal' | 'vertical' | 'focus'

export type PaneTool =
  | 'none'
  | 'ruler'
  | 'overlay'
  | 'eyedropper'
  | 'sync'
  | 'inspect'

export type Pane = {
  id: string
  name: string
  width: number
  height: number
  scale: number
  presetId?: string
  activeTool: PaneTool
  overlayImage: string | null
  overlayOpacity: number
  pickedColor: string | null
}

export type AppState = {
  url: string
  draftUrl: string
  panes: Pane[]
  layout: LayoutMode
  syncEnabled: boolean
  syncScroll: boolean
  syncClick: boolean
  focusedPaneId: string | null
  loadError: string | null
  designGridSize: number
  inspectInfo: InspectPayload | null
  statusMessage: string | null
}

export type Action =
  | { type: 'SET_DRAFT_URL'; draftUrl: string }
  | { type: 'NAVIGATE'; url: string }
  | { type: 'SET_URL_FROM_WEBVIEW'; url: string }
  | { type: 'SET_LAYOUT'; layout: LayoutMode }
  | { type: 'SET_SYNC'; syncEnabled: boolean }
  | { type: 'SET_SYNC_SCROLL'; syncScroll: boolean }
  | { type: 'SET_SYNC_CLICK'; syncClick: boolean }
  | { type: 'SET_FOCUSED_PANE'; focusedPaneId: string | null }
  | { type: 'TOGGLE_PANE_TOOL'; paneId: string; tool: Exclude<PaneTool, 'none'> }
  | { type: 'SET_PANE_TOOL'; paneId: string; tool: PaneTool }
  | {
      type: 'SET_PANE_OVERLAY'
      paneId: string
      overlayImage: string | null
      overlayOpacity?: number
    }
  | { type: 'SET_PANE_OVERLAY_OPACITY'; paneId: string; overlayOpacity: number }
  | { type: 'SET_PANE_COLOR'; paneId: string; pickedColor: string | null }
  | { type: 'ADD_PANE'; presetId?: string }
  | { type: 'DUPLICATE_PANE'; paneId: string }
  | { type: 'REMOVE_PANE'; paneId: string }
  | {
      type: 'UPDATE_PANE'
      paneId: string
      patch: Partial<
        Pick<Pane, 'name' | 'width' | 'height' | 'scale' | 'presetId'>
      >
    }
  | { type: 'APPLY_PRESET'; paneId: string; presetId: string }
  | { type: 'SET_LOAD_ERROR'; loadError: string | null }
  | { type: 'SET_DESIGN_GRID_SIZE'; designGridSize: number }
  | { type: 'SET_INSPECT_INFO'; inspectInfo: InspectPayload | null }
  | { type: 'SET_STATUS_MESSAGE'; statusMessage: string | null }
  | { type: 'HYDRATE'; state: Partial<AppState> }

export const STORAGE_KEY = 'pixelgrid-state-v3'
export const DEFAULT_URL = 'https://example.com'

function createId() {
  return `pane-${Math.random().toString(36).slice(2, 9)}`
}

function defaultScaleForPreset(presetId: string) {
  const preset = getPresetById(presetId)
  if (preset?.form === 'laptop' || preset?.form === 'desktop') return 0.7
  if (preset?.form === 'phone') return 0.72
  if (preset?.form === 'tablet') return 0.6
  return 1
}

export function paneFromPreset(presetId: string): Pane {
  const preset = getPresetById(presetId) ?? DEVICE_PRESETS[0]
  return {
    id: createId(),
    name: preset.name,
    width: preset.width,
    height: preset.height,
    scale: preset.scale ?? defaultScaleForPreset(preset.id),
    presetId: preset.id,
    activeTool: 'none',
    overlayImage: null,
    overlayOpacity: 0.45,
    pickedColor: null,
  }
}

function normalizePane(raw: Partial<Pane> & { id?: string }): Pane | null {
  if (!raw || typeof raw.id !== 'string') return null
  return {
    id: raw.id,
    name: typeof raw.name === 'string' ? raw.name : 'Freeform',
    width: typeof raw.width === 'number' ? raw.width : 1024,
    height: typeof raw.height === 'number' ? raw.height : 768,
    scale: typeof raw.scale === 'number' ? raw.scale : 1,
    presetId: typeof raw.presetId === 'string' ? raw.presetId : 'freeform',
    activeTool:
      raw.activeTool === 'ruler' ||
      raw.activeTool === 'overlay' ||
      raw.activeTool === 'eyedropper' ||
      raw.activeTool === 'sync' ||
      raw.activeTool === 'inspect'
        ? raw.activeTool
        : 'none',
    overlayImage: typeof raw.overlayImage === 'string' ? raw.overlayImage : null,
    overlayOpacity:
      typeof raw.overlayOpacity === 'number' ? raw.overlayOpacity : 0.45,
    pickedColor: typeof raw.pickedColor === 'string' ? raw.pickedColor : null,
  }
}

export function createDefaultState(): AppState {
  const panes = [paneFromPreset('laptop-m'), paneFromPreset('pixel-8-pro')]
  return {
    url: DEFAULT_URL,
    draftUrl: DEFAULT_URL,
    panes,
    layout: 'horizontal',
    syncEnabled: true,
    syncScroll: true,
    syncClick: true,
    focusedPaneId: panes[0]?.id ?? null,
    loadError: null,
    designGridSize: 8,
    inspectInfo: null,
    statusMessage: null,
  }
}

export function normalizeUrl(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return DEFAULT_URL
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

function mapPane(
  state: AppState,
  paneId: string,
  updater: (pane: Pane) => Pane,
): AppState {
  return {
    ...state,
    panes: state.panes.map((pane) =>
      pane.id === paneId ? updater(pane) : pane,
    ),
  }
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_DRAFT_URL':
      return { ...state, draftUrl: action.draftUrl }
    case 'NAVIGATE': {
      const url = normalizeUrl(action.url)
      return { ...state, url, draftUrl: url, loadError: null }
    }
    case 'SET_URL_FROM_WEBVIEW':
      return {
        ...state,
        url: action.url,
        draftUrl: action.url,
        loadError: null,
      }
    case 'SET_LAYOUT':
      return {
        ...state,
        layout: action.layout,
        focusedPaneId:
          action.layout === 'focus'
            ? state.focusedPaneId ?? state.panes[0]?.id ?? null
            : state.focusedPaneId,
      }
    case 'SET_SYNC':
      return { ...state, syncEnabled: action.syncEnabled }
    case 'SET_SYNC_SCROLL':
      return { ...state, syncScroll: action.syncScroll }
    case 'SET_SYNC_CLICK':
      return { ...state, syncClick: action.syncClick }
    case 'SET_FOCUSED_PANE':
      return { ...state, focusedPaneId: action.focusedPaneId }
    case 'TOGGLE_PANE_TOOL': {
      const pane = state.panes.find((item) => item.id === action.paneId)
      if (!pane) return state
      const nextTool = pane.activeTool === action.tool ? 'none' : action.tool
      return {
        ...mapPane(state, action.paneId, (item) => ({
          ...item,
          activeTool: nextTool,
        })),
        focusedPaneId: action.paneId,
        inspectInfo:
          nextTool === 'inspect' || pane.activeTool === 'inspect'
            ? nextTool === 'inspect'
              ? state.inspectInfo
              : null
            : state.inspectInfo,
      }
    }
    case 'SET_PANE_TOOL':
      return {
        ...mapPane(state, action.paneId, (pane) => ({
          ...pane,
          activeTool: action.tool,
        })),
        focusedPaneId: action.paneId,
      }
    case 'SET_PANE_OVERLAY':
      return mapPane(state, action.paneId, (pane) => ({
        ...pane,
        overlayImage: action.overlayImage,
        overlayOpacity: action.overlayOpacity ?? pane.overlayOpacity,
        activeTool: action.overlayImage ? 'overlay' : pane.activeTool,
      }))
    case 'SET_PANE_OVERLAY_OPACITY':
      return mapPane(state, action.paneId, (pane) => ({
        ...pane,
        overlayOpacity: action.overlayOpacity,
      }))
    case 'SET_PANE_COLOR':
      return mapPane(state, action.paneId, (pane) => ({
        ...pane,
        pickedColor: action.pickedColor,
      }))
    case 'ADD_PANE': {
      const pane = paneFromPreset(action.presetId ?? 'freeform')
      return {
        ...state,
        panes: [...state.panes, pane],
        focusedPaneId: state.layout === 'focus' ? pane.id : state.focusedPaneId,
      }
    }
    case 'DUPLICATE_PANE': {
      const source = state.panes.find((pane) => pane.id === action.paneId)
      if (!source) return state
      const copy: Pane = {
        ...source,
        id: createId(),
        name: `${source.name} copy`,
        activeTool: 'none',
      }
      const index = state.panes.findIndex((pane) => pane.id === action.paneId)
      const panes = [...state.panes]
      panes.splice(index + 1, 0, copy)
      return { ...state, panes }
    }
    case 'REMOVE_PANE': {
      if (state.panes.length <= 1) return state
      const panes = state.panes.filter((pane) => pane.id !== action.paneId)
      return {
        ...state,
        panes,
        focusedPaneId:
          state.focusedPaneId === action.paneId
            ? panes[0]?.id ?? null
            : state.focusedPaneId,
      }
    }
    case 'UPDATE_PANE':
      return mapPane(state, action.paneId, (pane) => ({
        ...pane,
        ...action.patch,
      }))
    case 'APPLY_PRESET': {
      const preset = getPresetById(action.presetId)
      if (!preset) return state
      return mapPane(state, action.paneId, (pane) => ({
        ...pane,
        name: preset.name,
        width: preset.width,
        height: preset.height,
        scale: preset.scale ?? defaultScaleForPreset(preset.id),
        presetId: preset.id,
      }))
    }
    case 'SET_LOAD_ERROR':
      return { ...state, loadError: action.loadError }
    case 'SET_DESIGN_GRID_SIZE':
      return { ...state, designGridSize: action.designGridSize }
    case 'SET_INSPECT_INFO':
      return { ...state, inspectInfo: action.inspectInfo }
    case 'SET_STATUS_MESSAGE':
      return { ...state, statusMessage: action.statusMessage }
    case 'HYDRATE':
      return {
        ...state,
        ...action.state,
        draftUrl: action.state.url ?? action.state.draftUrl ?? state.draftUrl,
      }
    default:
      return state
  }
}

export function loadPersistedState(): Partial<AppState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<AppState>
    if (!parsed || typeof parsed !== 'object') return null
    const panes = Array.isArray(parsed.panes)
      ? parsed.panes
          .map((pane) => normalizePane(pane as Partial<Pane>))
          .filter((pane): pane is Pane => pane !== null)
      : undefined
    return {
      url: typeof parsed.url === 'string' ? parsed.url : undefined,
      panes: panes && panes.length > 0 ? panes : undefined,
      layout:
        parsed.layout === 'horizontal' ||
        parsed.layout === 'vertical' ||
        parsed.layout === 'focus'
          ? parsed.layout
          : undefined,
      syncEnabled:
        typeof parsed.syncEnabled === 'boolean' ? parsed.syncEnabled : undefined,
      syncScroll:
        typeof parsed.syncScroll === 'boolean' ? parsed.syncScroll : undefined,
      syncClick:
        typeof parsed.syncClick === 'boolean' ? parsed.syncClick : undefined,
      focusedPaneId:
        typeof parsed.focusedPaneId === 'string' || parsed.focusedPaneId === null
          ? parsed.focusedPaneId
          : undefined,
      designGridSize:
        typeof parsed.designGridSize === 'number' ? parsed.designGridSize : undefined,
    }
  } catch {
    return null
  }
}
