import React from 'react'
import { Settings, Terminal, Minus, X, Layers } from 'lucide-react'
import exiliumIconUrl from '../assets/ExiliumAppIcon.png'

interface TitleBarProps {
  isRunning: boolean
  onToggleSettings: () => void
  onToggleLogs: () => void
  onToggleProfiles: () => void
  logsOpen: boolean
  profilesOpen: boolean
}

export const TitleBar: React.FC<TitleBarProps> = ({
  isRunning,
  onToggleSettings,
  onToggleLogs,
  onToggleProfiles,
  logsOpen,
  profilesOpen
}) => {
  const handleMinimize = () => {
    window.electronAPI?.minimizeWindow()
  }

  const handleClose = () => {
    window.electronAPI?.closeWindow()
  }

  return (
    <header className="h-10 w-full flex items-center justify-between px-3 select-none app-drag-region bg-[#09090b] border-b border-white/[0.08] z-50">
      {/* App Logo & Uniform Glowing Name */}
      <div className="flex items-center gap-2.5">
        <img 
          src={exiliumIconUrl} 
          alt="Exilium" 
          className={`w-6 h-6 object-contain select-none pointer-events-none transition-all duration-300 ${
            isRunning 
              ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]' 
              : 'drop-shadow-[0_0_3px_rgba(255,255,255,0.2)]'
          }`} 
        />
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold tracking-wide transition-all duration-300 ${
            isRunning 
              ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]' 
              : 'text-zinc-200'
          }`}>
            Exilium<span className="text-white font-bold">Switch</span>
          </span>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-zinc-400 border border-white/[0.06]">
            v1.1
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1 app-no-drag">
        {/* Profile Manager Button */}
        <button
          onClick={onToggleProfiles}
          title="Конфигурации (.json)"
          className={`p-1.5 rounded text-zinc-400 hover:text-white transition-colors cursor-pointer ${
            profilesOpen ? 'bg-white/15 text-white' : 'hover:bg-white/[0.06]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" strokeWidth={1.75} />
        </button>

        {/* Toggle Logs Button */}
        <button
          onClick={onToggleLogs}
          title="Консоль логов"
          className={`p-1.5 rounded text-zinc-400 hover:text-white transition-colors cursor-pointer ${
            logsOpen ? 'bg-white/15 text-white' : 'hover:bg-white/[0.06]'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" strokeWidth={1.75} />
        </button>

        {/* Settings Button */}
        <button
          onClick={onToggleSettings}
          title="Настройки"
          className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
        >
          <Settings className="w-3.5 h-3.5" strokeWidth={1.75} />
        </button>

        <div className="h-3.5 w-[1px] bg-white/10 mx-1" />

        {/* Windows 11 Minimize */}
        <button
          onClick={handleMinimize}
          title="Свернуть"
          className="w-7 h-7 flex items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
        >
          <Minus className="w-3.5 h-3.5" strokeWidth={1.75} />
        </button>

        {/* Windows 11 Close */}
        <button
          onClick={handleClose}
          title="Закрыть"
          className="w-7 h-7 flex items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-white/[0.12] transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" strokeWidth={1.75} />
        </button>
      </div>
    </header>
  )
}
