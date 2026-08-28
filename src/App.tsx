import { useState, useEffect } from 'react'
import { TitleBar } from './components/TitleBar'
import { MasterSwitch } from './components/MasterSwitch'
import { ResidentStatusCard } from './components/ResidentStatusCard'
import { LogConsole } from './components/LogConsole'
import { SettingsModal } from './components/SettingsModal'
import { ProfileSelector } from './components/ProfileSelector'
import { UpdateModal } from './components/UpdateModal'
import { SystemDiagnosisModal } from './components/SystemDiagnosisModal'
import { useVpnStatus } from './hooks/useVpnStatus'
import { useSettings } from './hooks/useSettings'
import type { AppMode } from '../shared/types'

export function App() {
  const { status, toggleVpn, setMode } = useVpnStatus()
  const { settings, reloadSettings } = useSettings()

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [logsOpen, setLogsOpen] = useState(false)
  const [profilesOpen, setProfilesOpen] = useState(false)
  const [updateModalOpen, setUpdateModalOpen] = useState(false)
  const [diagnosisOpen, setDiagnosisOpen] = useState(false)

  const currentMode: AppMode = (status.appMode || settings.appMode || 'home') as AppMode

  // Listen for update notification click
  useEffect(() => {
    const unsub = window.electronAPI?.onOpenUpdateModal?.(() => {
      setSettingsOpen(false)
      setLogsOpen(false)
      setProfilesOpen(false)
      setDiagnosisOpen(false)
      setUpdateModalOpen(true)
    })
    return () => unsub?.()
  }, [])

  const handleSelectMode = async (mode: AppMode) => {
    if (status.isRunning) return
    await setMode(mode)
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-[#09090b] text-white relative overflow-hidden select-none">
      {/* Titlebar */}
      <TitleBar
        isRunning={status.isRunning}
        onToggleSettings={() => setSettingsOpen(true)}
        onToggleLogs={() => setLogsOpen(!logsOpen)}
        onToggleProfiles={() => setProfilesOpen(!profilesOpen)}
        onCheckUpdates={() => {
          setSettingsOpen(false)
          setLogsOpen(false)
          setProfilesOpen(false)
          setDiagnosisOpen(false)
          setUpdateModalOpen(true)
        }}
        logsOpen={logsOpen}
        profilesOpen={profilesOpen}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-between py-2 z-10 overflow-y-auto">
        {/* Central Master Switch & Mode Selector */}
        <MasterSwitch
          isRunning={status.isRunning}
          uptimeSeconds={status.uptimeSeconds}
          activeProfileName={status.activeProfileName}
          currentMode={currentMode}
          onToggle={async () => { await toggleVpn() }}
          onSelectMode={handleSelectMode}
          onOpenDiagnosis={() => setDiagnosisOpen(true)}
          onOpenProfiles={() => setProfilesOpen(true)}
        />

        {/* Resident Mode Cards & Status */}
        <ResidentStatusCard
          isRunning={status.isRunning}
          currentZone={status.currentZone}
          fakeZone={settings.fakeZone}
          realZone={settings.realZone}
          lfsvcStatus={status.lfsvcStatus}
          currentMode={currentMode}
        />

        {/* Footer info badge */}
        <footer className="px-4 py-2 mt-auto text-center flex items-center justify-center">
          <p className="text-[11px] tracking-widest uppercase font-mono font-semibold nostro-shimmer cursor-default transition-transform duration-300 hover:scale-[1.02]">
            Exilium Resident Shield By Nostro
          </p>
        </footer>
      </main>

      {/* Logs Console Overlay */}
      <LogConsole isOpen={logsOpen} onClose={() => setLogsOpen(false)} />

      {/* Profile Selector Modal */}
      <ProfileSelector
        isOpen={profilesOpen}
        isRunning={status.isRunning}
        currentMode={currentMode}
        onModeChange={handleSelectMode}
        onClose={() => setProfilesOpen(false)}
      />

      {/* System Auto-Diagnosis Modal */}
      <SystemDiagnosisModal
        isOpen={diagnosisOpen}
        currentMode={currentMode}
        onClose={() => setDiagnosisOpen(false)}
        onApplyMode={handleSelectMode}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => {
          setSettingsOpen(false)
          reloadSettings()
        }}
        onCheckUpdates={() => {
          setSettingsOpen(false)
          setUpdateModalOpen(true)
        }}
      />

      {/* Update Center Modal */}
      <UpdateModal
        isOpen={updateModalOpen}
        currentVersion="1.5.4"
        onClose={() => setUpdateModalOpen(false)}
      />
    </div>
  )
}

export default App
