import { useState, useEffect } from 'react'
import { TitleBar } from './components/TitleBar'
import { MasterSwitch } from './components/MasterSwitch'
import { ResidentStatusCard } from './components/ResidentStatusCard'
import { LogConsole } from './components/LogConsole'
import { SettingsModal } from './components/SettingsModal'
import { ProfileSelector } from './components/ProfileSelector'
import { UpdateModal } from './components/UpdateModal'
import type { VpnStatus, AppSettings } from '../electron/preload'

export function App() {
  const [status, setStatus] = useState<VpnStatus>({
    isRunning: false,
    currentZone: 'Tomsk Standard Time',
    lfsvcStatus: 'Stopped',
    uptimeSeconds: 0,
    activeProfileName: 'Основной профиль'
  })

  const [settings, setSettings] = useState<AppSettings>({
    realZone: 'Tomsk Standard Time',
    fakeZone: 'W. Europe Standard Time',
    autoStart: false,
    minimizeToTray: true,
    startMinimized: false,
    activeProfileId: 'default'
  })

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [logsOpen, setLogsOpen] = useState(false)
  const [profilesOpen, setProfilesOpen] = useState(false)
  const [updateModalOpen, setUpdateModalOpen] = useState(false)

  // Listen for update notification click
  useEffect(() => {
    const unsub = window.electronAPI?.onOpenUpdateModal?.(() => {
      setSettingsOpen(false)
      setLogsOpen(false)
      setProfilesOpen(false)
      setUpdateModalOpen(true)
    })
    return () => unsub?.()
  }, [])

  // Fetch initial state safely
  useEffect(() => {
    window.electronAPI?.getStatus().then((s) => {
      if (s) setStatus(s)
    })

    window.electronAPI?.getSettings().then((set) => {
      if (set) setSettings(set)
    })

    const unsubscribe = window.electronAPI?.onStatusChange((updated) => {
      setStatus(updated)
    })

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [])

  // Uptime ticker
  useEffect(() => {
    let interval: any
    if (status.isRunning) {
      interval = setInterval(() => {
        setStatus((prev) => ({
          ...prev,
          uptimeSeconds: prev.uptimeSeconds + 1
        }))
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [status.isRunning])

  const handleToggleVpn = async () => {
    const res = await window.electronAPI?.toggleVpn()
    if (res) {
      setStatus((prev) => ({
        ...prev,
        isRunning: res.isRunning,
        uptimeSeconds: res.isRunning ? prev.uptimeSeconds : 0
      }))
    }
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
          setUpdateModalOpen(true)
          window.electronAPI?.checkForUpdates()
        }}
        logsOpen={logsOpen}
        profilesOpen={profilesOpen}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-between py-2 z-10 overflow-y-auto">
        {/* Central Master Switch */}
        <MasterSwitch
          isRunning={status.isRunning}
          uptimeSeconds={status.uptimeSeconds}
          activeProfileName={status.activeProfileName}
          onToggle={handleToggleVpn}
          onOpenProfiles={() => setProfilesOpen(true)}
        />

        {/* Resident Mode Cards & Amsterdam Latency */}
        <ResidentStatusCard
          isRunning={status.isRunning}
          currentZone={status.currentZone}
          fakeZone={settings.fakeZone}
          realZone={settings.realZone}
          lfsvcStatus={status.lfsvcStatus}
        />

        {/* Footer info badge with shimmering animated glow */}
        <footer className="px-4 py-2.5 mt-auto text-center flex items-center justify-center">
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
        onClose={() => {
          setProfilesOpen(false)
          window.electronAPI?.getStatus().then((s) => {
            if (s) setStatus(s)
          })
        }}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => {
          setSettingsOpen(false)
          window.electronAPI?.getSettings().then((set) => {
            if (set) setSettings(set)
          })
        }}
        onCheckUpdates={() => {
          setSettingsOpen(false)
          setUpdateModalOpen(true)
          window.electronAPI?.checkForUpdates()
        }}
      />

      {/* Auto Update Modal */}
      <UpdateModal
        isOpen={updateModalOpen}
        onClose={() => setUpdateModalOpen(false)}
      />
    </div>
  )
}

export default App
