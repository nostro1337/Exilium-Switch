import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Download, Check, AlertCircle, RefreshCw, X, ArrowUpCircle } from 'lucide-react'
import type { UpdateInfo, UpdateProgress } from '../../electron/preload'

interface UpdateModalProps {
  isOpen: boolean
  onClose: () => void
}

type UpdateState = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'up-to-date' | 'error'

export const UpdateModal: React.FC<UpdateModalProps> = ({ isOpen, onClose }) => {
  const [state, setState] = useState<UpdateState>('idle')
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [progress, setProgress] = useState<UpdateProgress>({
    percent: 0,
    bytesPerSecond: 0,
    transferred: 0,
    total: 0
  })
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    if (isOpen && state === 'idle') {
      setState('checking')
    }
  }, [isOpen, state])

  useEffect(() => {
    const unsubChecking = window.electronAPI?.onUpdateChecking(() => {
      setState('checking')
    })

    const unsubAvailable = window.electronAPI?.onUpdateAvailable((info) => {
      setUpdateInfo(info)
      setState('available')
    })

    const unsubNotAvailable = window.electronAPI?.onUpdateNotAvailable(() => {
      setState('up-to-date')
      setTimeout(() => {
        onClose()
      }, 2500)
    })

    const unsubProgress = window.electronAPI?.onUpdateProgress((p) => {
      setProgress(p)
      setState('downloading')
    })

    const unsubDownloaded = window.electronAPI?.onUpdateDownloaded((info) => {
      setUpdateInfo(info)
      setState('ready')
    })

    const unsubError = window.electronAPI?.onUpdateError((err) => {
      setErrorMessage(err.message || 'Не удалось проверить или скачать обновление')
      setState('error')
    })

    return () => {
      unsubChecking?.()
      unsubAvailable?.()
      unsubNotAvailable?.()
      unsubProgress?.()
      unsubDownloaded?.()
      unsubError?.()
    }
  }, [onClose])

  if (!isOpen) return null

  const handleStartDownload = async () => {
    setState('downloading')
    const res = await window.electronAPI?.startUpdateDownload()
    if (!res?.success) {
      setErrorMessage(res?.error || 'Ошибка начала загрузки')
      setState('error')
    }
  }

  const handleRestartNow = () => {
    window.electronAPI?.quitAndInstallUpdate()
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Б'
    const k = 1024
    const sizes = ['Б', 'КБ', 'МБ', 'ГБ']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
  }

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none cursor-default"
        onClick={() => {
          if (state !== 'downloading') onClose()
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', stiffness: 450, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-sm rounded-2xl border border-white/15 bg-[#0e0e11] shadow-2xl text-white overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="h-12 px-4 border-b border-white/10 flex items-center justify-between bg-[#141418] shrink-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
              <Sparkles className="w-4 h-4 text-zinc-300" strokeWidth={2} />
              <span>Обновление Exilium Switch</span>
            </div>
            {state !== 'downloading' && (
              <button
                onClick={onClose}
                className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" strokeWidth={2} />
              </button>
            )}
          </div>

          {/* Modal Body */}
          <div className="p-4 space-y-4">
            {/* State: Checking */}
            {state === 'checking' && (
              <div className="flex flex-col items-center text-center py-6">
                <RefreshCw className="animate-spin text-zinc-400 mb-3" size={32} />
                <h3 className="text-sm font-medium text-zinc-200">Поиск обновлений...</h3>
                <p className="text-xs text-zinc-500 mt-1">Проверяем наличие новой версии на GitHub</p>
              </div>
            )}

            {/* State: Up to Date */}
            {state === 'up-to-date' && (
              <div className="flex flex-col items-center text-center py-6">
                <div className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-zinc-200 mb-3">
                  <Check className="w-5 h-5 stroke-[2.5]" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-100">Установлена актуальная версия</h3>
                <p className="text-xs text-zinc-500 mt-1">У вас уже стоит самая свежая версия Exilium Switch</p>
              </div>
            )}

            {/* State: Available */}
            {state === 'available' && (
              <div className="flex flex-col space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/10">
                  <div className="flex flex-col">
                    <span className="text-xs text-zinc-400">Доступна новая версия</span>
                    <span className="text-sm font-bold text-white font-mono mt-0.5">
                      v{updateInfo?.version || '1.4.0'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.08] text-zinc-300 border border-white/10">
                    GitHub Release
                  </span>
                </div>

                {/* Release Notes */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 max-h-36 overflow-y-auto text-xs text-zinc-300 leading-relaxed font-sans">
                  <p className="font-semibold text-zinc-100 mb-1 text-[11px] uppercase tracking-wider">Что нового:</p>
                  {updateInfo?.releaseNotes ? (
                    typeof updateInfo.releaseNotes === 'string' ? (
                      <div dangerouslySetInnerHTML={{ __html: updateInfo.releaseNotes }} />
                    ) : (
                      updateInfo.releaseNotes.map((n, i) => <p key={i}>{n.note}</p>)
                    )
                  ) : (
                    <p className="text-zinc-400">Прямой импорт VLESS из буфера, Real-IP DNS без утечек, поддержка Discord и корпоративных сервисов.</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={onClose}
                    className="px-3 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                  >
                    Позже
                  </button>
                  <button
                    onClick={handleStartDownload}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white text-black hover:bg-zinc-200 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <Download size={13} strokeWidth={2.5} />
                    <span>Обновить</span>
                  </button>
                </div>
              </div>
            )}

            {/* State: Downloading */}
            {state === 'downloading' && (
              <div className="flex flex-col space-y-3 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Download className="text-zinc-200 animate-pulse" size={16} />
                    <span className="text-xs font-medium text-zinc-200">Загрузка обновления...</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-white">{progress.percent}%</span>
                </div>

                {/* Progress Track */}
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    className="h-full bg-white rounded-full drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]"
                    style={{ width: `${progress.percent}%` }}
                    transition={{ ease: 'easeOut', duration: 0.2 }}
                  />
                </div>

                <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                  <span>{formatBytes(progress.transferred)} из {formatBytes(progress.total)}</span>
                  <span>{formatBytes(progress.bytesPerSecond)}/с</span>
                </div>
              </div>
            )}

            {/* State: Ready */}
            {state === 'ready' && (
              <div className="flex flex-col space-y-3">
                <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-start gap-2.5">
                  <div className="p-1 rounded-full bg-white text-black shrink-0 mt-0.5">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white">Обновление готово к установке</h4>
                    <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                      Приложение обновится в фоновом режиме до <span className="font-mono text-zinc-200 font-bold">v{updateInfo?.version || ''}</span> и автоматически перезапустится. Все профили сохранятся.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={onClose}
                    className="px-3 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                  >
                    Позже
                  </button>
                  <button
                    onClick={handleRestartNow}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white text-black hover:bg-zinc-200 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <ArrowUpCircle size={14} strokeWidth={2.5} />
                    <span>Перезапустить сейчас</span>
                  </button>
                </div>
              </div>
            )}

            {/* State: Error */}
            {state === 'error' && (
              <div className="flex flex-col space-y-3">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertCircle size={18} />
                  <h4 className="text-xs font-semibold">Ошибка обновления</h4>
                </div>
                <p className="text-[11px] text-zinc-400 bg-white/[0.02] border border-white/10 p-2.5 rounded-xl font-mono break-all leading-relaxed">
                  {errorMessage}
                </p>
                <div className="flex justify-end pt-1">
                  <button
                    onClick={onClose}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium bg-white/[0.06] hover:bg-white/10 text-zinc-200 transition-colors cursor-pointer"
                  >
                    Закрыть
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="p-3 border-t border-white/10 bg-[#0a0a0d] flex items-center justify-between text-[10px] text-zinc-500">
            <span>Exilium Switch Updater</span>
            <span className="font-mono text-[9px]">by Nostro</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
