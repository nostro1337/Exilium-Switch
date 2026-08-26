import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Download, CheckCircle2, AlertCircle, RefreshCw, X, ArrowUpCircle } from 'lucide-react'
import type { UpdateInfo, UpdateProgress } from '../../electron/preload'

interface UpdateModalProps {
  isOpen: boolean
  onClose: () => void
  manualCheck?: boolean
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
        if (state === 'up-to-date') onClose()
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
  }, [state, onClose])

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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#10121a] p-6 shadow-2xl text-white overflow-hidden"
        >
          {/* Subtle Ambient Accent Glow */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Close button (allowed when not downloading or installing) */}
          {state !== 'downloading' && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
          )}

          {/* State: Checking */}
          {state === 'checking' && (
            <div className="flex flex-col items-center text-center py-6">
              <RefreshCw className="animate-spin text-blue-400 mb-4" size={36} />
              <h3 className="text-base font-medium">Поиск обновлений...</h3>
              <p className="text-xs text-white/50 mt-1">Проверяем наличие новой версии на сервере</p>
            </div>
          )}

          {/* State: Up to Date */}
          {state === 'up-to-date' && (
            <div className="flex flex-col items-center text-center py-6">
              <CheckCircle2 className="text-emerald-400 mb-3" size={40} />
              <h3 className="text-base font-semibold">Установлена актуальная версия</h3>
              <p className="text-xs text-white/60 mt-1">У вас уже стоит самая свежая версия Exilium Switch</p>
            </div>
          )}

          {/* State: Available */}
          {state === 'available' && (
            <div className="flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Доступно обновление</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      v{updateInfo?.version || '1.3.1'}
                    </span>
                    <span className="text-xs text-white/50">Рекомендуется к установке</span>
                  </div>
                </div>
              </div>

              {/* Release Notes */}
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 max-h-36 overflow-y-auto mb-5 text-xs text-white/80 leading-relaxed font-sans">
                <p className="font-semibold text-white/90 mb-1">Что нового:</p>
                {updateInfo?.releaseNotes ? (
                  typeof updateInfo.releaseNotes === 'string' ? (
                    <div dangerouslySetInnerHTML={{ __html: updateInfo.releaseNotes }} />
                  ) : (
                    updateInfo.releaseNotes.map((n, i) => <p key={i}>{n.note}</p>)
                  )
                ) : (
                  <p className="text-white/60">Улучшена стабильность соединения, оптимизирован сетевой стек и безопасность.</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Напомнить позже
                </button>
                <button
                  onClick={handleStartDownload}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Download size={14} />
                  Обновить
                </button>
              </div>
            </div>
          )}

          {/* State: Downloading */}
          {state === 'downloading' && (
            <div className="flex flex-col py-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Download className="text-blue-400 animate-bounce" size={18} />
                  <span className="text-sm font-semibold">Загрузка обновления...</span>
                </div>
                <span className="text-sm font-mono font-bold text-blue-400">{progress.percent}%</span>
              </div>

              {/* Progress Track */}
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden mb-3">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                  style={{ width: `${progress.percent}%` }}
                  transition={{ ease: 'easeOut', duration: 0.2 }}
                />
              </div>

              <div className="flex justify-between items-center text-[11px] text-white/50 font-mono">
                <span>{formatBytes(progress.transferred)} из {formatBytes(progress.total)}</span>
                <span>{formatBytes(progress.bytesPerSecond)}/с</span>
              </div>
            </div>
          )}

          {/* State: Ready (Downloaded -> User choice to restart) */}
          {state === 'ready' && (
            <div className="flex flex-col text-left py-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Обновление готово к установке</h3>
                  <p className="text-xs text-white/60">Все файлы успешно скачаны и проверены</p>
                </div>
              </div>

              <p className="text-xs text-white/70 leading-relaxed mb-5 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                Приложение закроется, за 2 секунды применит новую версию <span className="font-mono text-emerald-400 font-semibold">v{updateInfo?.version || ''}</span> и перезапустится. Все ваши профили и настройки сохранятся.
              </p>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Перезапустить позже
                </button>
                <button
                  onClick={handleRestartNow}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <ArrowUpCircle size={15} />
                  Перезапустить сейчас
                </button>
              </div>
            </div>
          )}

          {/* State: Error */}
          {state === 'error' && (
            <div className="flex flex-col text-left py-1">
              <div className="flex items-center gap-3 mb-3 text-rose-400">
                <AlertCircle size={24} />
                <h3 className="text-base font-semibold text-white">Ошибка обновления</h3>
              </div>
              <p className="text-xs text-white/70 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl mb-4 font-mono break-all">
                {errorMessage}
              </p>
              <div className="flex justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  Закрыть
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
