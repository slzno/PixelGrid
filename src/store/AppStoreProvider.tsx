import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'
import type { InspectPayload } from '../lib/toolsScripts'
import {
  createDefaultState,
  loadPersistedState,
  reducer,
  STORAGE_KEY,
  type Pane,
  type PaneTool,
  type ZoomMode,
} from './appState'
import { AppStoreContext, type AppStoreValue } from './AppStoreContext'

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
      panes: state.panes.map((pane) => ({
        ...pane,
        // don't persist large data URLs
        overlayImage: null,
        activeTool: 'none' as const,
      })),
      layout: state.layout,
      zoomMode: state.zoomMode,
      syncEnabled: state.syncEnabled,
      syncScroll: state.syncScroll,
      syncClick: state.syncClick,
      focusedPaneId: state.focusedPaneId,
      designGridSize: state.designGridSize,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }, [
    state.url,
    state.panes,
    state.layout,
    state.zoomMode,
    state.syncEnabled,
    state.syncScroll,
    state.syncClick,
    state.focusedPaneId,
    state.designGridSize,
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

  const setLayout = useCallback((layout: AppStoreValue['state']['layout']) => {
    dispatch({ type: 'SET_LAYOUT', layout })
  }, [])

  const setZoomMode = useCallback((zoomMode: ZoomMode) => {
    dispatch({ type: 'SET_ZOOM_MODE', zoomMode })
  }, [])

  const setSidePanel = useCallback((sidePanelOpen: boolean) => {
    dispatch({ type: 'SET_SIDE_PANEL', sidePanelOpen })
  }, [])

  const togglePaneDark = useCallback((paneId: string) => {
    dispatch({ type: 'TOGGLE_PANE_DARK', paneId })
  }, [])

  const setSyncEnabled = useCallback((syncEnabled: boolean) => {
    dispatch({ type: 'SET_SYNC', syncEnabled })
  }, [])

  const setSyncScroll = useCallback((syncScroll: boolean) => {
    dispatch({ type: 'SET_SYNC_SCROLL', syncScroll })
  }, [])

  const setSyncClick = useCallback((syncClick: boolean) => {
    dispatch({ type: 'SET_SYNC_CLICK', syncClick })
  }, [])

  const setFocusedPane = useCallback((focusedPaneId: string | null) => {
    dispatch({ type: 'SET_FOCUSED_PANE', focusedPaneId })
  }, [])

  const togglePaneTool = useCallback(
    (paneId: string, tool: Exclude<PaneTool, 'none'>) => {
      dispatch({ type: 'TOGGLE_PANE_TOOL', paneId, tool })
    },
    [],
  )

  const setPaneTool = useCallback((paneId: string, tool: PaneTool) => {
    dispatch({ type: 'SET_PANE_TOOL', paneId, tool })
  }, [])

  const setPaneOverlay = useCallback(
    (paneId: string, overlayImage: string | null, overlayOpacity?: number) => {
      dispatch({
        type: 'SET_PANE_OVERLAY',
        paneId,
        overlayImage,
        overlayOpacity,
      })
    },
    [],
  )

  const setPaneOverlayOpacity = useCallback(
    (paneId: string, overlayOpacity: number) => {
      dispatch({ type: 'SET_PANE_OVERLAY_OPACITY', paneId, overlayOpacity })
    },
    [],
  )

  const setPaneColor = useCallback(
    (paneId: string, pickedColor: string | null) => {
      dispatch({ type: 'SET_PANE_COLOR', paneId, pickedColor })
    },
    [],
  )

  const addPane = useCallback((presetId?: string) => {
    dispatch({ type: 'ADD_PANE', presetId })
  }, [])

  const duplicatePane = useCallback((paneId: string) => {
    dispatch({ type: 'DUPLICATE_PANE', paneId })
  }, [])

  const removePane = useCallback((paneId: string) => {
    dispatch({ type: 'REMOVE_PANE', paneId })
  }, [])

  const rotatePane = useCallback((paneId: string) => {
    dispatch({ type: 'ROTATE_PANE', paneId })
  }, [])

  const updatePane = useCallback(
    (
      paneId: string,
      patch: Partial<
        Pick<Pane, 'name' | 'width' | 'height' | 'scale' | 'presetId' | 'starred'>
      >,
    ) => {
      dispatch({ type: 'UPDATE_PANE', paneId, patch })
    },
    [],
  )

  const togglePaneStar = useCallback((paneId: string) => {
    dispatch({ type: 'TOGGLE_PANE_STAR', paneId })
  }, [])

  const applyPreset = useCallback((paneId: string, presetId: string) => {
    dispatch({ type: 'APPLY_PRESET', paneId, presetId })
  }, [])

  const setLoadError = useCallback((loadError: string | null) => {
    dispatch({ type: 'SET_LOAD_ERROR', loadError })
  }, [])

  const setDesignGridSize = useCallback((designGridSize: number) => {
    dispatch({ type: 'SET_DESIGN_GRID_SIZE', designGridSize })
  }, [])

  const setInspectInfo = useCallback((inspectInfo: InspectPayload | null) => {
    dispatch({ type: 'SET_INSPECT_INFO', inspectInfo })
  }, [])

  const setStatusMessage = useCallback((statusMessage: string | null) => {
    dispatch({ type: 'SET_STATUS_MESSAGE', statusMessage })
  }, [])

  const value = useMemo(
    () => ({
      state,
      setDraftUrl,
      navigate,
      setUrlFromWebview,
      setLayout,
      setZoomMode,
      setSyncEnabled,
      setSyncScroll,
      setSyncClick,
      setFocusedPane,
      togglePaneTool,
      setPaneTool,
      togglePaneDark,
      setPaneOverlay,
      setPaneOverlayOpacity,
      setPaneColor,
      addPane,
      duplicatePane,
      removePane,
      rotatePane,
      updatePane,
      togglePaneStar,
      applyPreset,
      setLoadError,
      setDesignGridSize,
      setInspectInfo,
      setStatusMessage,
      setSidePanel,
    }),
    [
      state,
      setDraftUrl,
      navigate,
      setUrlFromWebview,
      setLayout,
      setZoomMode,
      setSyncEnabled,
      setSyncScroll,
      setSyncClick,
      setFocusedPane,
      togglePaneTool,
      setPaneTool,
      togglePaneDark,
      setPaneOverlay,
      setPaneOverlayOpacity,
      setPaneColor,
      addPane,
      duplicatePane,
      removePane,
      rotatePane,
      updatePane,
      togglePaneStar,
      applyPreset,
      setLoadError,
      setDesignGridSize,
      setInspectInfo,
      setStatusMessage,
      setSidePanel,
    ],
  )

  return (
    <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>
  )
}
