import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Power,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Clock,
  Layers,
  Plus,
  Home,
  Briefcase,
  Gamepad2,
  ScanSearch
} from 'lucide-react'
import type { AppMode } from '../../electron/preload'

interface MasterSwitchProps {
  isRunning: boolean
  uptimeSeconds: number
  activeProfileName?: string
  currentMode: AppMode
  onToggle: () => Promise<void>
  onSelectMode: (mode: AppMode) => void
  onOpenDiagnosis: () => void
  onOpenProfiles?: () => void
}

export const MasterSwitch: React.FC<MasterSwitchProps> = ({
  isRunning,
  uptimeSeconds,
  activeProfileName,
  currentMode,
  onToggle,
  onSelectMode,
  onOpenDiagnosis,
  onOpenProfiles
}) => {
  const [loading, setLoading] = useState(false)

  const playClickSound = (enabled: boolean) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.connect(gain)
      gain.connect(audioCtx.destination)

      if (enabled) {
        osc.frequency.setValueAtTime(520, audioCtx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(1040, audioCtx.currentTime + 0.07)
      } else {
        osc.frequency.setValueAtTime(680, audioCtx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(260, audioCtx.currentTime + 0.07)
      }

      gain.gain.setValueAtTime(0.15, audioCtx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.07)

      osc.start()
      osc.stop(audioCtx.currentTime + 0.08)
    } catch {}
  }

  const handleClick = async () => {
    if (loading) return
    if (!activeProfileName && !isRunning) {
      if (onOpenProfiles) onOpenProfiles()
      return
    }
    setLoading(true)
    playClickSound(!isRunning)
    try {
      await onToggle()
    } finally {
      setLoading(false)
    }
  }

  const formatUptime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0')
    const mins = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0')
    const secs = (totalSeconds % 60).toString().padStart(2, '0')
    return `${hours}:${mins}:${secs}`
  }

  return (
    <div className="flex flex-col items-center justify-center pt-1 pb-2 relative select-none">
      {/* 3-Position Mode Switcher + Auto-Diagnosis Button */}
      <div className="flex items-center justify-between w-full max-w-[340px] px-2 mt-2.5 mb-6 gap-2">
        {/* Mode Segmented Controls */}
        <div className="flex items-center p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] gap-1 flex-1">
          {/* Дом */}
          <button
            type="button"
            onClick={() => onSelectMode('home')}
            disabled={isRunning}
            title={isRunning ? 'Отключите туннель для смены режима' : 'Режим «Дом» — полная маскировка под Амстердам'}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-lg text-xs font-medium transition-all ${
              isRunning ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
            } ${
              currentMode === 'home'
                ? 'bg-white text-black font-semibold shadow-[0_0_12px_rgba(255,255,255,0.3)]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Дом</span>
          </button>

          {/* Офис */}
          <button
            type="button"
            onClick={() => onSelectMode('office')}
            disabled={isRunning}
            title={isRunning ? 'Отключите туннель для смены режима' : 'Режим «Офис» — безопасный сплит-туннель для корпоративной сети'}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-lg text-xs font-medium transition-all ${
              isRunning ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
            } ${
              currentMode === 'office'
                ? 'bg-white text-black font-semibold shadow-[0_0_12px_rgba(255,255,255,0.3)]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Офис</span>
          </button>

          {/* Игры (disabled) */}
          <div className="relative flex-1 group">
            <button
              type="button"
              disabled
              className="w-full flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-lg text-xs font-medium text-zinc-600 opacity-40 cursor-not-allowed"
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>Игры</span>
            </button>
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:flex px-2 py-0.5 bg-zinc-900 border border-white/15 text-[9px] text-zinc-400 rounded whitespace-nowrap z-50 pointer-events-none shadow-lg">
              В разработке
            </div>
          </div>
        </div>

        {/* Auto-Diagnosis Quick Button */}
        <button
          type="button"
          onClick={onOpenDiagnosis}
          title="Авто-диагностика устройства и выбор режима"
          className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white border border-white/[0.08] hover:border-white/20 transition-all cursor-pointer flex items-center justify-center shrink-0 active:scale-95 shadow-sm"
        >
          <ScanSearch className="w-4 h-4" />
        </button>
      </div>

      {/* Outer SVG Track & Active Rotating Ring */}
      <div className="relative flex items-center justify-center">
        <svg className="w-48 h-48 absolute pointer-events-none" viewBox="0 0 200 200">
          <circle
            cx="100"
            cy="100"
            r="88"
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="2.5"
          />
          
          {isRunning && (
            <motion.circle
              cx="100"
              cy="100"
              r="88"
              fill="none"
              stroke="url(#silverGradient)"
              strokeWidth="3.5"
              strokeDasharray="14 8"
              strokeLinecap="round"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 16, ease: "linear" }}
              style={{ transformOrigin: 'center' }}
            />
          )}

          <defs>
            <linearGradient id="silverGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="60%" stopColor="#a1a1aa" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#3f3f46" stopOpacity="0.2" />
            </linearGradient>
          </defs>
        </svg>

        {/* Master Push Button (Monochrome Tactile) */}
        <motion.button
          onClick={handleClick}
          disabled={loading}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 450, damping: 25 }}
          className={`relative w-36 h-36 rounded-full flex flex-col items-center justify-center transition-all duration-300 cursor-pointer ${
            isRunning
              ? 'bg-[#18181c] border-2 border-white shadow-[0_0_35px_rgba(255,255,255,0.3),inset_0_0_15px_rgba(255,255,255,0.1)]'
              : 'bg-[#111114] border border-white/10 hover:border-white/25 shadow-[0_6px_20px_rgba(0,0,0,0.7),inset_0_1px_2px_rgba(255,255,255,0.08)]'
          }`}
        >
          {/* Subtle Inner Bevel */}
          <div className="absolute inset-1.5 rounded-full border border-white/[0.04] pointer-events-none" />

          {/* Central Power Icon & Perfectly Centered Status Label */}
          <div className="relative z-10 flex flex-col items-center justify-center text-center w-full px-2">
            {loading ? (
              <Loader2 className="w-10 h-10 text-white animate-spin" strokeWidth={2} />
            ) : (
              <Power className={`w-10 h-10 transition-all duration-300 ${
                isRunning 
                  ? 'text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.85)]' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`} strokeWidth={2} />
            )}

            <span className={`text-[10px] font-bold tracking-[0.12em] uppercase mt-2.5 font-mono text-center block w-full transition-colors duration-300 ${
              isRunning ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]' : 'text-zinc-500'
            }`}>
              {loading ? 'СВЯЗЬ...' : isRunning ? 'ВКЛЮЧЕНО' : 'ВЫКЛЮЧЕНО'}
            </span>
          </div>
        </motion.button>
      </div>

      {/* Spacing & Status Badges */}
      <div className="mt-6 flex flex-col items-center gap-2">
        {/* Shield Main Badge */}
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium tracking-wide border transition-all duration-300 ${
          isRunning
            ? 'bg-white/10 text-white border-white/30 shadow-[0_0_15px_rgba(255,255,255,0.2)]'
            : 'bg-zinc-900/80 text-zinc-400 border-white/[0.06]'
        }`}>
          {isRunning ? (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-white" strokeWidth={2} />
              <span>{currentMode === 'office' ? 'OFFICE TUNNEL: АКТИВЕН' : 'RESIDENT SHIELD: АКТИВЕН'}</span>
            </>
          ) : (
            <>
              <ShieldAlert className="w-3.5 h-3.5 text-zinc-500" strokeWidth={2} />
              <span>{currentMode === 'office' ? 'РЕЖИМ ОФИС (ОЖИДАНИЕ)' : 'РЕЖИМ ДОМ (ОЖИДАНИЕ)'}</span>
            </>
          )}
        </div>

        {/* Active Profile Pill / Switcher trigger */}
        {activeProfileName ? (
          <button
            onClick={onOpenProfiles}
            disabled={isRunning}
            title={isRunning ? 'Отключите туннель для смены профиля' : 'Нажмите для смены профиля'}
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono border transition-all ${
              isRunning
                ? 'bg-white/[0.04] text-zinc-400 border-white/[0.06] cursor-default'
                : 'bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white border-white/10 hover:border-white/20 cursor-pointer'
            }`}
          >
            <Layers className="w-3 h-3 text-zinc-400" />
            <span className="truncate max-w-[180px]">{activeProfileName}</span>
          </button>
        ) : (
          <button
            onClick={onOpenProfiles}
            title="Нажмите чтобы добавить конфигурацию"
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono border border-dashed border-white/20 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white transition-all cursor-pointer"
          >
            <Plus className="w-3 h-3 text-zinc-400" />
            <span>Добавить конфиг ({currentMode === 'office' ? 'Офис' : 'Дом'})</span>
          </button>
        )}

        {/* Uptime Display */}
        <AnimatePresence>
          {isRunning && (
            <motion.div
              initial={{ opacity: 0, y: -3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              className="flex items-center gap-1.5 text-zinc-400 text-xs font-mono mt-0.5"
            >
              <Clock className="w-3 h-3 text-zinc-400" strokeWidth={1.75} />
              <span>Время сессии: <span className="text-white font-semibold">{formatUptime(uptimeSeconds)}</span></span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
