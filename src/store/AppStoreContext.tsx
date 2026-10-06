import { createContext, useContext } from 'react'
import type { InspectPayload } from '../lib/toolsScripts'
import type { AppState, LayoutMode, Pane, PaneTool } from './appState'

export type AppStoreValue = {
  state: AppState
  setDraftUrl: (draftUrl: string) => void
  navigate: (url?: string) => void
  setUrlFromWebview: (url: string) => void
  setLayout: (layout: LayoutMode) => void
  setSyncEnabled: (syncEnabled: boolean) => void
  setSyncScroll: (syncScroll: boolean) => void
  setSyncClick: (syncClick: boolean) => void
  setFocusedPane: (paneId: string | null) => void
  togglePaneTool: (paneId: string, tool: Exclude<PaneTool, 'none'>) => void
  setPaneTool: (paneId: string, tool: PaneTool) => void
  setPaneOverlay: (
    paneId: string,
    overlayImage: string | null,
    overlayOpacity?: number,
  ) => void
  setPaneOverlayOpacity: (paneId: string, overlayOpacity: number) => void
  setPaneColor: (paneId: string, pickedColor: string | null) => void
  addPane: (presetId?: string) => void
  duplicatePane: (paneId: string) => void
  removePane: (paneId: string) => void
  updatePane: (
    paneId: string,
    patch: Partial<Pick<Pane, 'name' | 'width' | 'height' | 'scale' | 'presetId'>>,
  ) => void
  applyPreset: (paneId: string, presetId: string) => void
  setLoadError: (loadError: string | null) => void
  setDesignGridSize: (designGridSize: number) => void
  setInspectInfo: (inspectInfo: InspectPayload | null) => void
  setStatusMessage: (statusMessage: string | null) => void
}

export const AppStoreContext = createContext<AppStoreValue | null>(null)

export function useAppStore() {
  const ctx = useContext(AppStoreContext)
  if (!ctx) {
    throw new Error('useAppStore must be used within AppStoreProvider')
  }
  return ctx
}
