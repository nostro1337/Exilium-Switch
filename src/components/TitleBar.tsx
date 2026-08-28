import React from 'react'
import { Settings, Terminal, Minus, Square, Copy, X, Layers } from 'lucide-react'
import exiliumIconUrl from '../assets/ExiliumAppIcon.png'

interface TitleBarProps {
  isRunning: boolean
  onToggleSettings: () => void
  onToggleLogs: () => void
  onToggleProfiles: () => void
  onCheckUpdates?: () => void
  logsOpen: boolean
  profilesOpen: boolean
}

export const TitleBar: React.FC<TitleBarProps> = ({
  isRunning,
  onToggleSettings,
  onToggleLogs,
  onToggleProfiles,
  onCheckUpdates,
  logsOpen,
  profilesOpen
}) => {
  const [version, setVersion] = React.useState('1.5.6')
  const [isDev, setIsDev] = React.useState(false)
  const [isMaximized, setIsMaximized] = React.useState(false)

  React.useEffect(() => {
    window.electronAPI?.getAppVersion?.().then((v) => {
      if (v) setVersion(v)
    })
    window.electronAPI?.isDevBuild?.().then((dev) => {
      setIsDev(Boolean(dev))
    })
    window.electronAPI?.isWindowMaximized?.().then((max) => {
      setIsMaximized(Boolean(max))
    })
    const unsub = window.electronAPI?.onWindowMaximizedChange?.((max) => {
      setIsMaximized(max)
    })
    return () => unsub?.()
  }, [])

  const handleMinimize = () => {
    window.electronAPI?.minimizeWindow()
  }

  const handleToggleMaximize = () => {
    window.electronAPI?.toggleMaximizeWindow()
  }

  const handleClose = () => {
    window.electronAPI?.closeWindow()
  }

  return (
    <header 
      onDoubleClick={handleToggleMaximize}
      className="h-10 w-full flex items-center justify-between px-3 select-none app-drag-region bg-[#09090b] border-b border-white/[0.08] z-50 shrink-0"
    >
      {/* App Logo & Uniform Glowing Name */}
      <div className="flex items-center gap-2.5">
        <img 
          src={exiliumIconUrl} 
          alt="Exilium" 
          className={`w-5 h-5 object-contain select-none pointer-events-none transition-all duration-300 ${
            isRunning 
              ? 'brightness-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]' 
              : 'opacity-90'
          }`} 
        />
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold tracking-wide transition-all duration-300 ${
            isRunning 
              ? 'text-white glow-white' 
              : 'text-zinc-200'
          }`}>
            Exilium<span className="text-white font-bold">Switch</span>
          </span>
          <button
            type="button"
            onClick={onCheckUpdates}
            title="Центр обновлений"
            className="app-no-drag text-[9px] font-mono font-medium px-1.5 py-0.5 rounded bg-white/[0.06] hover:bg-white/[0.14] text-zinc-300 hover:text-white border border-white/[0.08] hover:border-white/25 transition-all cursor-pointer flex items-center gap-1 active:scale-95 shadow-sm"
          >
            <span>v{version}</span>
          </button>
          {isDev && (
            <span className="app-no-drag text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 tracking-wider shadow-sm select-none">
              DEV BUILD
            </span>
          )}
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
          <Layers className="w-3.5 h-3.5" strokeWidth={1.8} />
        </button>

        {/* Toggle Logs Button */}
        <button
          onClick={onToggleLogs}
          title="Консоль логов"
          className={`p-1.5 rounded text-zinc-400 hover:text-white transition-colors cursor-pointer ${
            logsOpen ? 'bg-white/15 text-white' : 'hover:bg-white/[0.06]'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" strokeWidth={1.8} />
        </button>

        {/* Settings Button */}
        <button
          onClick={onToggleSettings}
          title="Настройки"
          className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
        >
          <Settings className="w-3.5 h-3.5" strokeWidth={1.8} />
        </button>

        <div className="h-3.5 w-[1px] bg-white/10 mx-1" />

        {/* Windows 11 Minimize */}
        <button
          onClick={handleMinimize}
          title="Свернуть"
          className="w-7 h-7 flex items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
        >
          <Minus className="w-3.5 h-3.5" strokeWidth={1.8} />
        </button>

        {/* Windows 11 Maximize / Restore */}
        <button
          onClick={handleToggleMaximize}
          title={isMaximized ? 'Восстановить' : 'Развернуть'}
          className="w-7 h-7 flex items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
        >
          {isMaximized ? (
            <Copy className="w-3 h-3 rotate-180" strokeWidth={1.8} />
          ) : (
            <Square className="w-3 h-3" strokeWidth={1.8} />
          )}
        </button>

        {/* Windows 11 Close */}
        <button
          onClick={handleClose}
          title="Закрыть"
          className="w-7 h-7 flex items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-white/[0.12] transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" strokeWidth={1.8} />
        </button>
      </div>
    </header>
  )
}
