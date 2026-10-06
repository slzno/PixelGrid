import { Toolbar } from './components/Toolbar'
import { PaneGrid } from './components/PaneGrid'
import { DevToolsPanel } from './components/tools/DevToolsPanel'
import { AppStoreProvider, useAppStore } from './store/useAppStore'
import './styles/app.css'

function Workspace() {
  const { state } = useAppStore()
  return (
    <div className={`workspace${state.sidePanelOpen ? ' with-side' : ''}`}>
      <PaneGrid />
      {state.sidePanelOpen && <DevToolsPanel />}
    </div>
  )
}

function AppShell() {
  return (
    <div className="app">
      <Toolbar />
      <Workspace />
      <StatusToast />
    </div>
  )
}

function StatusToast() {
  const { state } = useAppStore()
  if (!state.statusMessage && !state.loadError) return null
  return (
    <div className={`status-toast${state.loadError ? ' error' : ''}`}>
      {state.statusMessage || `Error de carga: ${state.loadError}`}
    </div>
  )
}

export default function App() {
  return (
    <AppStoreProvider>
      <AppShell />
    </AppStoreProvider>
  )
}
