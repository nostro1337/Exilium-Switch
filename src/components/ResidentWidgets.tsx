import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Globe,
  MapPinOff,
  Activity,
  Gauge,
  RefreshCw,
  Radio,
  ArrowDown,
  ArrowUp,
  Zap,
  Info,
  ChevronDown,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react'
import { useSpeedtest } from '../hooks/useSpeedtest'
import type { AppMode } from '../../electron/preload'

interface ResidentWidgetsProps {
  isRunning: boolean
  currentZone: string
  fakeZone: string
  realZone: string
  lfsvcStatus: string
  currentMode?: AppMode
}

export const ResidentWidgets: React.FC<ResidentWidgetsProps> = ({
  isRunning,
  currentZone,
  fakeZone,
  realZone,
  lfsvcStatus,
  currentMode = 'home'
}) => {
  const { progress, result, isRunning: isSpeedtestRunning, runSpeedtest } = useSpeedtest()
  const [quickPing, setQuickPing] = useState<number | null>(null)
  const [testingPing, setTestingPing] = useState(false)
  const [activeModal, setActiveModal] = useState<'tz' | 'geo' | 'speed' | null>(null)

  // Escape key support to close open detail modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeModal) {
        setActiveModal(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeModal])

  // Measure initial ping on mount / tunnel activation
  useEffect(() => {
    if (isRunning) {
      handleQuickPing()
    } else {
      setQuickPing(null)
    }
  }, [isRunning])

  const handleQuickPing = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (testingPing || isSpeedtestRunning) return
    setTestingPing(true)
    try {
      const res = await window.electronAPI?.testLatency()
      setQuickPing(res?.latencyMs ?? null)
    } finally {
      setTestingPing(false)
    }
  }

  const isOffice = currentMode === 'office'
  const isFakeZone = currentZone.toLowerCase().includes('europe') || currentZone === fakeZone
  const isLocationBlocked =
    lfsvcStatus.toLowerCase().includes('stop') ||
    lfsvcStatus === 'NotFound' ||
    lfsvcStatus.toLowerCase().includes('disabled')

  const displayPing = quickPing !== null ? quickPing : (result?.pingMs ?? null)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 px-4 select-none w-full max-w-4xl mx-auto">
      {/* 1. Timezone Widget */}
      <motion.div
        whileHover={{ y: -1 }}
        transition={{ duration: 0.15 }}
        onClick={() => setActiveModal('tz')}
        className="mono-card rounded-xl p-3.5 flex flex-col justify-between cursor-pointer border border-white/[0.08] hover:border-white/20 transition-colors bg-white/[0.02]"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-zinc-300 font-medium">
            <Globe className="w-3.5 h-3.5 text-zinc-200" strokeWidth={1.8} />
            <span>Часовой пояс</span>
          </div>
          <span
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              isOffice
                ? isRunning
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                  : 'bg-zinc-600'
                : isRunning && isFakeZone
                ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]'
                : 'bg-zinc-600'
            }`}
          />
        </div>

        <div className="mt-2.5">
          <p className="text-xs font-semibold text-zinc-100 truncate" title={currentZone}>
            {currentZone || 'Tomsk Standard Time'}
          </p>
          <p className="text-[10px] text-zinc-400 font-mono mt-0.5 truncate">
            {isOffice
              ? isRunning
                ? 'В режиме «Офис» часовой пояс сохранен'
                : 'Режим «Офис»: без подмены времени'
              : isRunning
              ? `Амстердам — маскировка локалей (${fakeZone})`
              : `Реальный: ${realZone}`}
          </p>
        </div>
      </motion.div>

      {/* 2. Geolocation Shield Widget */}
      <motion.div
        whileHover={{ y: -1 }}
        transition={{ duration: 0.15 }}
        onClick={() => setActiveModal('geo')}
        className="mono-card rounded-xl p-3.5 flex flex-col justify-between cursor-pointer border border-white/[0.08] hover:border-white/20 transition-colors bg-white/[0.02]"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-zinc-300 font-medium">
            <MapPinOff className="w-3.5 h-3.5 text-zinc-200" strokeWidth={1.8} />
            <span>ГЕО Служба (lfsvc)</span>
          </div>
          <span
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              isOffice
                ? isRunning
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                  : 'bg-zinc-600'
                : isRunning && isLocationBlocked
                ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]'
                : isRunning
                ? 'bg-amber-500/80 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                : 'bg-zinc-600'
            }`}
          />
        </div>

        <div className="mt-2.5">
          <p className="text-xs font-semibold text-zinc-100">
            {isOffice
              ? isRunning
                ? 'Штатная работа (Офис)'
                : 'Штатная работа (Windows)'
              : isRunning
              ? isLocationBlocked
                ? 'Заблокирована (Safe)'
                : 'Активна (Не отключена)'
              : isLocationBlocked
              ? 'Отключена (Windows)'
              : 'Активна (Windows)'}
          </p>
          <p className="text-[10px] text-zinc-400 font-mono mt-0.5 truncate">
            {isOffice
              ? isRunning
                ? 'В режиме «Офис» служба гео не изменяется'
                : 'Режим «Офис»: без блокировки служб'
              : isRunning
              ? isLocationBlocked
                ? 'Защита от утечки местоположения'
                : 'Предупреждение: служба работает'
              : 'Стандартный режим гео'}
          </p>
        </div>
      </motion.div>

      {/* 3. Speedtest & Ping Interactive Widget */}
      <motion.div
        whileHover={{ y: -1 }}
        transition={{ duration: 0.15 }}
        className="col-span-1 sm:col-span-2 mono-card rounded-xl p-3.5 border border-white/[0.08] bg-white/[0.02] flex flex-col gap-2.5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-white/[0.06] text-white border border-white/[0.08]">
              <Gauge className="w-4 h-4 text-zinc-200" strokeWidth={1.8} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-zinc-200">
                  Замер скорости и задержки канала
                </span>
                {isRunning && <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />}
              </div>
              <p className="text-[10px] text-zinc-400 font-mono">
                Физический пинг и скорость до узла (Amsterdam VPS)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Ping Button */}
            <button
              onClick={handleQuickPing}
              disabled={testingPing || isSpeedtestRunning}
              title="Быстрый замер задержки (Ping)"
              className="px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40"
            >
              <RefreshCw className={`w-3 h-3 ${testingPing ? 'animate-spin' : ''}`} />
              <span>{testingPing ? '...' : 'Пинг'}</span>
            </button>

            {/* Full Speedtest Button */}
            <button
              onClick={() => runSpeedtest()}
              disabled={isSpeedtestRunning || !isRunning}
              title="Комплексный замер скорости (Speedtest)"
              className="px-3 py-1.5 rounded-lg bg-white text-black hover:bg-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Zap className={`w-3.5 h-3.5 ${isSpeedtestRunning ? 'animate-bounce text-amber-600' : ''}`} />
              <span>{isSpeedtestRunning ? 'Тест...' : 'Speedtest'}</span>
            </button>
          </div>
        </div>

        {/* Live Speedtest Progress Bar */}
        {isSpeedtestRunning && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-zinc-300 flex items-center gap-1">
                {progress.stage === 'ping' && 'Замер задержки (Ping)...'}
                {progress.stage === 'download' && 'Загрузка (Download)...'}
                {progress.stage === 'upload' && 'Отдача (Upload)...'}
              </span>
              <span className="text-white font-semibold">
                {progress.currentSpeedMbps > 0 ? `${progress.currentSpeedMbps} Mbps` : `${progress.progressPct}%`}
              </span>
            </div>
            <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/10">
              <motion.div
                className="h-full bg-white rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${progress.progressPct}%` }}
                transition={{ ease: 'easeOut', duration: 0.2 }}
              />
            </div>
          </div>
        )}

        {/* Metrics Display Grid */}
        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/[0.06] text-center">
          {/* Ping */}
          <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <span className="text-[10px] font-mono uppercase text-zinc-500">Задержка</span>
            <p className="text-xs font-semibold font-mono text-white mt-0.5">
              {displayPing !== null ? `${displayPing} ms` : '—'}
            </p>
          </div>

          {/* Download */}
          <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <span className="text-[10px] font-mono uppercase text-zinc-500 flex items-center justify-center gap-0.5">
              <ArrowDown className="w-2.5 h-2.5 text-emerald-400" />
              <span>Входящая</span>
            </span>
            <p className="text-xs font-semibold font-mono text-zinc-200 mt-0.5">
              {result?.downloadMbps !== null && result?.downloadMbps !== undefined
                ? `${result.downloadMbps} Mbps`
                : '—'}
            </p>
          </div>

          {/* Upload */}
          <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <span className="text-[10px] font-mono uppercase text-zinc-500 flex items-center justify-center gap-0.5">
              <ArrowUp className="w-2.5 h-2.5 text-cyan-400" />
              <span>Исходящая</span>
            </span>
            <p className="text-xs font-semibold font-mono text-zinc-200 mt-0.5">
              {result?.uploadMbps !== null && result?.uploadMbps !== undefined
                ? `${result.uploadMbps} Mbps`
                : '—'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Detail Modal Overlay for Timezone / Geo */}
      <AnimatePresence>
        {activeModal && (
          <div
            onClick={() => setActiveModal(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#121215] border border-white/12 rounded-2xl w-full max-w-md shadow-2xl p-5 overflow-hidden flex flex-col gap-4"
            >
              {activeModal === 'tz' && (
                <>
                  <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
                    <Globe className="w-5 h-5 text-zinc-200" />
                    <div>
                      <h3 className="text-sm font-semibold text-white">Маскировка часового пояса</h3>
                      <p className="text-[11px] text-zinc-400 font-mono">Resident Shield • Локализация</p>
                    </div>
                  </div>

                  <div className="space-y-3 text-xs text-zinc-300">
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1.5 font-mono">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Текущий пояс Windows:</span>
                        <span className="text-white font-semibold">{currentZone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Подменный (Амстердам):</span>
                        <span className="text-white font-semibold">{fakeZone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Реальный (Физический):</span>
                        <span className="text-zinc-400">{realZone}</span>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-400 leading-relaxed">
                      При включении режима «Дом» система автоматически синхронизирует часовой пояс Windows
                      с сервером в Амстердаме, предотвращая утечку реального региона через WebRTC и системные таймеры браузера.
                    </p>
                  </div>
                </>
              )}

              {activeModal === 'geo' && (
                <>
                  <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
                    <MapPinOff className="w-5 h-5 text-zinc-200" />
                    <div>
                      <h3 className="text-sm font-semibold text-white">Служба геолокации Windows (lfsvc)</h3>
                      <p className="text-[11px] text-zinc-400 font-mono">Resident Shield • Защита координат</p>
                    </div>
                  </div>

                  <div className="space-y-3 text-xs text-zinc-300">
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1.5 font-mono">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Статус службы lfsvc:</span>
                        <span className="text-white font-semibold">{lfsvcStatus}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Состояние защиты:</span>
                        <span className={isLocationBlocked ? 'text-emerald-400' : 'text-amber-400'}>
                          {isLocationBlocked ? 'Заблокирована (Безопасно)' : 'Активна'}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Служба геолокации Windows сканирует окружающие BSSID Wi-Fi сетей и передает точные GPS-координаты.
                      В режиме «Дом» служба временно блокируется для полной защиты приватности.
                    </p>
                  </div>
                </>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-1.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-colors cursor-pointer"
                >
                  Закрыть
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
