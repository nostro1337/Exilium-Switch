import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ScanSearch,
  X,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Home,
  RefreshCw,
  Server,
  Globe,
  ArrowRight,
  ShieldAlert,
  Wifi
} from 'lucide-react'
import type { AuditDiagnosisResult, AppMode } from '../../electron/preload'

interface SystemDiagnosisModalProps {
  isOpen: boolean
  currentMode: AppMode
  onClose: () => void
  onApplyMode: (mode: AppMode) => void
}

export const SystemDiagnosisModal: React.FC<SystemDiagnosisModalProps> = ({
  isOpen,
  currentMode,
  onClose,
  onApplyMode
}) => {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<AuditDiagnosisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runScan = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await window.electronAPI?.runSystemAudit()
      if (res) {
        setData(res)
      } else {
        setError('Не удалось получить результаты диагностики')
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка выполнения сканирования')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      runScan()
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none cursor-default"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', stiffness: 450, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md rounded-2xl border border-white/15 bg-[#0e0e11] shadow-2xl text-white overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="h-12 px-4 border-b border-white/10 flex items-center justify-between bg-[#141418] shrink-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
              <ScanSearch className="w-4 h-4 text-zinc-300" strokeWidth={2} />
              <span>Авто-диагностика окружения</span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
            {loading && (
              <div className="flex flex-col items-center justify-center py-10 space-y-3">
                <RefreshCw className="w-8 h-8 text-zinc-300 animate-spin" />
                <h3 className="text-sm font-medium text-zinc-200">Сканирование системы и сети...</h3>
                <p className="text-xs text-zinc-500 text-center max-w-xs">
                  Проверяем Active Directory, сетевые адаптеры, DNS и доступность сервера Exilium
                </p>
              </div>
            )}

            {!loading && error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {!loading && data && (
              <>
                {/* Recommendation Banner */}
                <div className={`p-3.5 rounded-xl border flex flex-col gap-2.5 transition-all ${
                  data.recommendedMode === 'office'
                    ? 'bg-white/[0.06] border-white/20'
                    : 'bg-white/[0.04] border-white/15'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {data.recommendedMode === 'office' ? (
                        <div className="p-1.5 rounded-lg bg-white/15 text-white">
                          <Briefcase className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="p-1.5 rounded-lg bg-white/15 text-white">
                          <Home className="w-4 h-4" />
                        </div>
                      )}
                      <div>
                        <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 block">
                          Рекомендация Exilium
                        </span>
                        <span className="text-sm font-bold text-white">
                          Режим: {data.recommendedMode === 'office' ? 'ОФИС' : 'ДОМ'}
                        </span>
                      </div>
                    </div>

                    {currentMode === data.recommendedMode ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white border border-white/20 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                        Уже активен
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          onApplyMode(data.recommendedMode)
                          onClose()
                        }}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white text-black hover:bg-zinc-200 active:scale-95 transition-all cursor-pointer flex items-center gap-1 shadow-[0_0_12px_rgba(255,255,255,0.3)]"
                      >
                        <span>Применить</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {data.recommendationReason}
                  </p>
                </div>

                {/* Device & Network Details Grid */}
                <div className="space-y-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block px-1">
                    Собранные параметры устройства
                  </span>

                  <div className="grid grid-cols-1 gap-2 text-xs font-mono">
                    {/* Host & User */}
                    <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.08] flex items-center justify-between">
                      <span className="text-zinc-400">Устройство</span>
                      <span className="text-zinc-100 font-semibold truncate max-w-[220px]">
                        {data.hostname} ({data.currentUser})
                      </span>
                    </div>

                    {/* Domain */}
                    <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.08] flex items-center justify-between">
                      <span className="text-zinc-400">Active Directory</span>
                      <span className={`font-semibold ${data.domainJoined ? 'text-white' : 'text-zinc-400'}`}>
                        {data.domainJoined ? `Домен: ${data.domainName}` : 'Рабочая группа (Нет домена)'}
                      </span>
                    </div>

                    {/* Domain Controllers */}
                    {data.domainControllers && data.domainControllers.length > 0 && (
                      <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.08] flex items-center justify-between">
                        <span className="text-zinc-400">Контроллер (DC)</span>
                        <span className="text-zinc-100 truncate max-w-[220px]">
                          {data.domainControllers[0].name} ({data.domainControllers[0].ip})
                        </span>
                      </div>
                    )}

                    {/* Network & Gateway */}
                    <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.08] flex items-center justify-between">
                      <span className="text-zinc-400">IP / Шлюз</span>
                      <span className="text-zinc-100">
                        {data.ipAddress || 'DHCP'} &bull; {data.defaultGateway || '-'}
                      </span>
                    </div>

                    {/* DNS */}
                    <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.08] flex items-center justify-between">
                      <span className="text-zinc-400">DNS Серверы</span>
                      <span className="text-zinc-100 truncate max-w-[220px]">
                        {data.dnsServers.length > 0 ? data.dnsServers.join(', ') : 'Автоматически'}
                      </span>
                    </div>

                    {/* VPS Connection */}
                    <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.08] flex items-center justify-between">
                      <span className="text-zinc-400">Сервер Exilium</span>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${data.vpsReachable ? 'bg-white drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]' : 'bg-red-500'}`} />
                        <span className="text-zinc-100">
                          {data.vpsReachable ? `Доступен (${data.vpsLatencyMs} мс)` : 'Заблокирован'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rescan Button */}
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={runScan}
                    disabled={loading}
                    className="text-xs font-mono px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white border border-white/10 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    <span>{loading ? 'Анализ...' : 'Повторить анализ'}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
