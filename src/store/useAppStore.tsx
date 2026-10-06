import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'
import { DEVICE_PRESETS, getPresetById } from '../data/devicePresets'

export type LayoutMode = 'horizontal' | 'vertical' | 'focus'

export type Pane = {
  id: string
  name: string
  width: number
  height: number
  scale: number
  presetId?: string
}

export type AppState = {
  url: string
  draftUrl: string
  panes: Pane[]
  layout: LayoutMode
  syncEnabled: boolean
  focusedPaneId: string | null
  loadError: string | null
}

type Action =
  | { type: 'SET_DRAFT_URL'; draftUrl: string }
  | { type: 'NAVIGATE'; url: string }
  | { type: 'SET_URL_FROM_WEBVIEW'; url: string }
  | { type: 'SET_LAYOUT'; layout: LayoutMode }
  | { type: 'SET_SYNC'; syncEnabled: boolean }
  | { type: 'SET_FOCUSED_PANE'; focusedPaneId: string | null }
  | { type: 'ADD_PANE'; presetId?: string }
  | { type: 'DUPLICATE_PANE'; paneId: string }
  | { type: 'REMOVE_PANE'; paneId: string }
  | {
      type: 'UPDATE_PANE'
      paneId: string
      patch: Partial<Pick<Pane, 'name' | 'width' | 'height' | 'scale' | 'presetId'>>
    }
  | { type: 'APPLY_PRESET'; paneId: string; presetId: string }
  | { type: 'SET_LOAD_ERROR'; loadError: string | null }
  | { type: 'HYDRATE'; state: Partial<AppState> }

const STORAGE_KEY = 'pixelgrid-state-v1'
const DEFAULT_URL = 'https://example.com'

function createId() {
  return `pane-${Math.random().toString(36).slice(2, 9)}`
}

function paneFromPreset(presetId: string): Pane {
  const preset = getPresetById(presetId) ?? DEVICE_PRESETS[0]
  return {
    id: createId(),
    name: preset.name,
    width: preset.width,
    height: preset.height,
    scale: 1,
    presetId: preset.id,
  }
}

export function createDefaultState(): AppState {
  return {
    url: DEFAULT_URL,
    draftUrl: DEFAULT_URL,
    panes: [
      paneFromPreset('iphone-se'),
      paneFromPreset('iphone-14'),
      paneFromPreset('desktop-1280'),
    ],
    layout: 'horizontal',
    syncEnabled: true,
    focusedPaneId: null,
    loadError: null,
  }
}

function normalizeUrl(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return DEFAULT_URL
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

function reducer(state: AppState, action: Action): AppState {
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
    case 'SET_FOCUSED_PANE':
      return { ...state, focusedPaneId: action.focusedPaneId }
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
      return {
        ...state,
        panes: state.panes.map((pane) =>
          pane.id === action.paneId ? { ...pane, ...action.patch } : pane,
        ),
      }
    case 'APPLY_PRESET': {
      const preset = getPresetById(action.presetId)
      if (!preset) return state
      return {
        ...state,
        panes: state.panes.map((pane) =>
          pane.id === action.paneId
            ? {
                ...pane,
                name: preset.name,
                width: preset.width,
                height: preset.height,
                presetId: preset.id,
              }
            : pane,
        ),
      }
    }
    case 'SET_LOAD_ERROR':
      return { ...state, loadError: action.loadError }
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

type AppStoreValue = {
  state: AppState
  setDraftUrl: (draftUrl: string) => void
  navigate: (url?: string) => void
  setUrlFromWebview: (url: string) => void
  setLayout: (layout: LayoutMode) => void
  setSyncEnabled: (syncEnabled: boolean) => void
  setFocusedPane: (paneId: string | null) => void
  addPane: (presetId?: string) => void
  duplicatePane: (paneId: string) => void
  removePane: (paneId: string) => void
  updatePane: (
    paneId: string,
    patch: Partial<Pick<Pane, 'name' | 'width' | 'height' | 'scale' | 'presetId'>>,
  ) => void
  applyPreset: (paneId: string, presetId: string) => void
  setLoadError: (loadError: string | null) => void
}

const AppStoreContext = createContext<AppStoreValue | null>(null)

function loadPersistedState(): Partial<AppState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<AppState>
    if (!parsed || typeof parsed !== 'object') return null
    return {
      url: typeof parsed.url === 'string' ? parsed.url : undefined,
      panes: Array.isArray(parsed.panes) ? parsed.panes : undefined,
      layout:
        parsed.layout === 'horizontal' ||
        parsed.layout === 'vertical' ||
        parsed.layout === 'focus'
          ? parsed.layout
          : undefined,
      syncEnabled:
        typeof parsed.syncEnabled === 'boolean' ? parsed.syncEnabled : undefined,
      focusedPaneId:
        typeof parsed.focusedPaneId === 'string' || parsed.focusedPaneId === null
          ? parsed.focusedPaneId
          : undefined,
    }
  } catch {
    return null
  }
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const defaults = createDefaultState()
    const persisted = loadPersistedState()
    if (!persisted) return defaults
    return {
      ...defaults,
      ...persisted,
      draftUrl: persisted.url ?? defaults.draftUrl,
      panes:
        persisted.panes && persisted.panes.length > 0
          ? persisted.panes
          : defaults.panes,
      focusedPaneId:
        persisted.focusedPaneId ??
        persisted.panes?.[0]?.id ??
        defaults.panes[0]?.id ??
        null,
    }
  })

  useEffect(() => {
    const payload = {
      url: state.url,
      panes: state.panes,
      layout: state.layout,
      syncEnabled: state.syncEnabled,
      focusedPaneId: state.focusedPaneId,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }, [
    state.url,
    state.panes,
    state.layout,
    state.syncEnabled,
    state.focusedPaneId,
  ])

  const setDraftUrl = useCallback((draftUrl: string) => {
    dispatch({ type: 'SET_DRAFT_URL', draftUrl })
  }, [])

  const navigate = useCallback(
    (url?: string) => {
      dispatch({ type: 'NAVIGATE', url: url ?? state.draftUrl })
    },
    [state.draftUrl],
  )

  const setUrlFromWebview = useCallback((url: string) => {
    dispatch({ type: 'SET_URL_FROM_WEBVIEW', url })
  }, [])

  const setLayout = useCallback((layout: LayoutMode) => {
    dispatch({ type: 'SET_LAYOUT', layout })
  }, [])

  const setSyncEnabled = useCallback((syncEnabled: boolean) => {
    dispatch({ type: 'SET_SYNC', syncEnabled })
  }, [])

  const setFocusedPane = useCallback((focusedPaneId: string | null) => {
    dispatch({ type: 'SET_FOCUSED_PANE', focusedPaneId })
  }, [])

  const addPane = useCallback((presetId?: string) => {
    dispatch({ type: 'ADD_PANE', presetId })
  }, [])

  const duplicatePane = useCallback((paneId: string) => {
    dispatch({ type: 'DUPLICATE_PANE', paneId })
  }, [])

  const removePane = useCallback((paneId: string) => {
    dispatch({ type: 'REMOVE_PANE', paneId })
  }, [])

  const updatePane = useCallback(
    (
      paneId: string,
      patch: Partial<Pick<Pane, 'name' | 'width' | 'height' | 'scale' | 'presetId'>>,
    ) => {
      dispatch({ type: 'UPDATE_PANE', paneId, patch })
    },
    [],
  )

  const applyPreset = useCallback((paneId: string, presetId: string) => {
    dispatch({ type: 'APPLY_PRESET', paneId, presetId })
  }, [])

  const setLoadError = useCallback((loadError: string | null) => {
    dispatch({ type: 'SET_LOAD_ERROR', loadError })
  }, [])

  const value = useMemo(
    () => ({
      state,
      setDraftUrl,
      navigate,
      setUrlFromWebview,
      setLayout,
      setSyncEnabled,
      setFocusedPane,
      addPane,
      duplicatePane,
      removePane,
      updatePane,
      applyPreset,
      setLoadError,
    }),
    [
      state,
      setDraftUrl,
      navigate,
      setUrlFromWebview,
      setLayout,
      setSyncEnabled,
      setFocusedPane,
      addPane,
      duplicatePane,
      removePane,
      updatePane,
      applyPreset,
      setLoadError,
    ],
  )

  return (
    <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>
  )
}

export function useAppStore() {
  const ctx = useContext(AppStoreContext)
  if (!ctx) {
    throw new Error('useAppStore must be used within AppStoreProvider')
  }
  return ctx
}
