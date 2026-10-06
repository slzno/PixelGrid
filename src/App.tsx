import { Toolbar } from './components/Toolbar'
import { PaneGrid } from './components/PaneGrid'
import { InspectPanel } from './components/tools/InspectPanel'
import { AppStoreProvider, useAppStore } from './store/useAppStore'
import './styles/app.css'

function Workspace() {
  const { state } = useAppStore()
  return (
    <div className={`workspace${state.sidePanelOpen ? ' with-side' : ''}`}>
      <PaneGrid />
      {state.sidePanelOpen && <InspectPanel />}
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
      {state.statusMessage || `Load error: ${state.loadError}`}
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
