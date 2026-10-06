import { Toolbar } from './components/Toolbar'
import { PaneGrid } from './components/PaneGrid'
import { InspectPanel } from './components/tools/InspectPanel'
import { AppStoreProvider, useAppStore } from './store/useAppStore'
import './styles/app.css'

function StatusBar() {
  const { state } = useAppStore()
  const inspecting = state.panes.some((pane) => pane.activeTool === 'inspect')
  return (
    <div className="status-bar">
      <div>
        {state.panes.length} pane{state.panes.length === 1 ? '' : 's'} · layout{' '}
        {state.layout}
        {state.syncEnabled ? ' · sync on' : ' · sync off'}
        {inspecting ? ' · inspecting' : ''}
      </div>
      <div className={state.loadError ? 'error' : ''}>
        {state.statusMessage
          ? state.statusMessage
          : state.loadError
            ? `Load error: ${state.loadError}`
            : state.url}
      </div>
    </div>
  )
}

function Workspace() {
  return (
    <div className="workspace">
      <PaneGrid />
      <InspectPanel />
    </div>
  )
}

function AppShell() {
  return (
    <div className="app">
      <Toolbar />
      <StatusBar />
      <Workspace />
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
