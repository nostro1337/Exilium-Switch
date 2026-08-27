import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Download,
  Check,
  AlertCircle,
  RefreshCw,
  X,
  History,
  Tag,
  ShieldCheck,
  Briefcase,
  Home,
  CheckCircle2
} from 'lucide-react'
import type { UpdateInfo, UpdateProgress } from '../../electron/preload'

interface UpdateModalProps {
  isOpen: boolean
  currentVersion: string
  onClose: () => void
}

type UpdateState = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'up-to-date' | 'error'

interface ChangelogItem {
  version: string
  date: string
  isCurrent?: boolean
  highlights: {
    icon: string
    title: string
    desc: string
  }[]
}

const CHANGELOG_DATA: ChangelogItem[] = [
  {
    version: '1.5.0',
    date: '27.08.2026',
    isCurrent: true,
    highlights: [
      {
        icon: 'briefcase',
        title: 'Режим «Офис» (Work Mode)',
        desc: 'Деликатный сплит-туннель для рабочих ПК в Active Directory: не сбрасывает DNS контроллера, не меняет системный часовой пояс, сохраняет связь с AnyDesk и локальными ресурсами.'
      },
      {
        icon: 'home',
        title: 'Режим «Дом» (Resident Shield)',
        desc: 'Тотальная маскировка в лоб под резидента Амстердама с блокировкой утечек DNS, отключением телеметрии геолокации Windows и Real-IP маршрутизацией.'
      },
      {
        icon: 'scan',
        title: 'Авто-диагностика окружения',
        desc: 'Встроенное экспресс-сканирование сети в реальном времени: определение домена, шлюза, DNS и автоматический подбор оптимального режима (Дом / Офис).'
      },
      {
        icon: 'sparkles',
        title: 'Умный VLESS-конвертер',
        desc: 'Импорт ссылки vless:// с автоматической сборкой правил маршрутизации под выбранный режим и присвоением суффиксов _OFFICE / _HOME.'
      },
      {
        icon: 'center',
        title: 'Интерактивный Центр обновлений',
        desc: 'Кликабельный заголовок версии, просмотр истории версий и прямая ручная проверка релизов с GitHub.'
      }
    ]
  },
  {
    version: '1.4.3',
    date: '25.08.2026',
    highlights: [
      {
        icon: 'check',
        title: 'Стабильность ядра',
        desc: 'Оптимизирована фоновая проверка статуса sing-box, тихий откат адаптера при непредвиденном завершении.'
      }
    ]
  },
  {
    version: '1.4.0',
    date: '20.08.2026',
    highlights: [
      {
        icon: 'check',
        title: 'Real-IP Split DNS & VLESS Reality',
        desc: 'Поддержка профилей VLESS с маскировкой Reality и перенаправлением трафика Discord/Telegram.'
      }
    ]
  }
]

export const UpdateModal: React.FC<UpdateModalProps> = ({ isOpen, currentVersion, onClose }) => {
  const [state, setState] = useState<UpdateState>('idle')
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [progress, setProgress] = useState<UpdateProgress>({
    percent: 0,
    bytesPerSecond: 0,
    transferred: 0,
    total: 0
  })
  const [errorMessage, setErrorMessage] = useState<string>('')

  const checkForUpdates = async () => {
    setState('checking')
    setErrorMessage('')
    try {
      await window.electronAPI?.checkForUpdates()
    } catch (err: any) {
      setErrorMessage(err.message || 'Ошибка проверки обновлений')
      setState('error')
    }
  }

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
  }, [])

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
          className="relative w-full max-w-md rounded-2xl border border-white/15 bg-[#0e0e11] shadow-2xl text-white overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="h-12 px-4 border-b border-white/10 flex items-center justify-between bg-[#141418] shrink-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
              <Sparkles className="w-4 h-4 text-zinc-300" strokeWidth={2} />
              <span>Центр обновлений Exilium Switch</span>
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

          {/* Version Status Card */}
          <div className="p-4 border-b border-white/10 bg-white/[0.02] shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 block">
                  Текущая версия
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-base font-bold text-white font-mono">
                    v{currentVersion}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 border border-white/15 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                    {state === 'up-to-date' ? 'Актуальна' : 'Установлена'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={checkForUpdates}
                disabled={state === 'checking' || state === 'downloading'}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white text-black hover:bg-zinc-200 active:scale-95 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_12px_rgba(255,255,255,0.2)]"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${state === 'checking' ? 'animate-spin' : ''}`} />
                <span>{state === 'checking' ? 'Проверка...' : 'Проверить'}</span>
              </button>
            </div>

            {/* Error banner */}
            {state === 'error' && errorMessage && (
              <div className="mt-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="truncate">{errorMessage}</span>
              </div>
            )}

            {/* Available Update banner */}
            {state === 'available' && updateInfo && (
              <div className="mt-3 p-3 rounded-xl bg-white/[0.06] border border-white/20 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-zinc-400 block font-mono">Доступна новая версия</span>
                  <span className="text-sm font-bold text-white font-mono">v{updateInfo.version}</span>
                </div>
                <button
                  onClick={handleStartDownload}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white text-black hover:bg-zinc-200 active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Скачать</span>
                </button>
              </div>
            )}

            {/* Downloading progress */}
            {state === 'downloading' && (
              <div className="mt-3 space-y-2">
                <div className="flex justify-between text-xs font-mono text-zinc-300">
                  <span>Загрузка обновления...</span>
                  <span>{progress.percent.toFixed(0)}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-200"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                  <span>{formatBytes(progress.transferred)} / {formatBytes(progress.total)}</span>
                  <span>{formatBytes(progress.bytesPerSecond)}/с</span>
                </div>
              </div>
            )}

            {/* Ready to install */}
            {state === 'ready' && (
              <div className="mt-3 p-3 rounded-xl bg-white/[0.08] border border-white/25 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-zinc-300 block font-mono">Обновление готово к установке</span>
                  <span className="text-xs text-zinc-400">Требуется перезапуск</span>
                </div>
                <button
                  onClick={handleRestartNow}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white text-black hover:bg-zinc-200 active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Перезапустить</span>
                </button>
              </div>
            )}
          </div>

          {/* Changelog Section */}
          <div className="p-4 flex-1 overflow-y-auto space-y-4">
            <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-zinc-400">
              <History className="w-3.5 h-3.5" />
              <span>История изменений (Changelog)</span>
            </div>

            <div className="space-y-3">
              {CHANGELOG_DATA.map((item) => (
                <div
                  key={item.version}
                  className={`p-3.5 rounded-xl border transition-all ${
                    item.isCurrent
                      ? 'bg-white/[0.04] border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.05)]'
                      : 'bg-white/[0.02] border-white/[0.08]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="text-xs font-bold text-white font-mono">
                        v{item.version}
                      </span>
                      {item.isCurrent && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-white border border-white/20">
                          Текущая
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono">{item.date}</span>
                  </div>

                  <div className="space-y-2">
                    {item.highlights.map((h, idx) => (
                      <div key={idx} className="text-xs">
                        <div className="font-semibold text-zinc-200 flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-white inline-block" />
                          <span>{h.title}</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed pl-2.5">
                          {h.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer note */}
          <div className="p-3 border-t border-white/10 bg-[#0a0a0d] flex items-center justify-between text-[11px] text-zinc-500 shrink-0">
            <span>Exilium Switch by Nostro</span>
            <span className="font-mono text-[10px]">GitHub Releases</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
