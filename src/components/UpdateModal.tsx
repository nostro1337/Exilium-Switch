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
    version: '1.5.7',
    date: '29.08.2026',
    highlights: [
      {
        icon: 'shield',
        title: 'Умное сосуществование с Zapret и GoodbyeDPI',
        desc: 'Автоматическая пауза winws.exe при включении VPN для кристально чистой передачи пакетов без искажений (YouTube 4K и голосовые каналы Discord Voice работают мгновенно) и авто-возобновление при отключении.'
      },
      {
        icon: 'sparkles',
        title: 'Всеядный поиск скриптов Zapret',
        desc: 'Инспекция дерева процессов Windows для извлечения точного запускающего .bat скрипта и многоуровневый поиск по Рабочему столу, Загрузкам и дискам.'
      },
      {
        icon: 'zap',
        title: 'Новая консоль логов с вкладками и разделением трафика',
        desc: 'Вкладки «Все», «Система», «Трафик», «Безопасность» и «Ошибки» с бейджами-счетчиками, фильтрацией в реальном времени, паузой автоскролла и копированием строки по клику.'
      },
      {
        icon: 'check',
        title: 'Полная изоляция хранилища настроек DEV и STABLE',
        desc: 'Строгое разделение папок %APPDATA%\\ExiliumSwitch-Dev и %APPDATA%\\ExiliumSwitch с реактивной сквозной синхронизацией галочек настроек через IPC.'
      },
      {
        icon: 'check',
        title: 'Устранение ложного переключения режима «Офис»',
        desc: 'Строгая изоляция профилей конфигураций: исключен самопроизвольный переход в режим «Офис» при удалении или импорте файлов.'
      }
    ]
  },
  {
    version: '1.5.6',
    date: '28.08.2026',
    highlights: [
      {
        icon: 'sparkles',
        title: 'Свободное масштабирование и управление окном',
        desc: 'Добавлена возможность ручного изменения размера окна, кнопка развертывания (Maximize/Restore) и адаптивное пропорциональное масштабирование всех интерфейсных модулей.'
      },
      {
        icon: 'zap',
        title: 'Строжайшая плавность 60+ FPS и аппаратное ускорение',
        desc: 'Внедрен аппаратный слой рендеринга Chromium GPU, оптимизированы физические пружинные анимации Framer Motion и отключен фоновый троттлинг.'
      },
      {
        icon: 'shield',
        title: 'Усиленная блокировка службы геолокации (lfsvc)',
        desc: 'Исправлена проблема повторного включения службы: автозапуск lfsvc отключается на уровне диспетчера служб Windows и реестра, предотвращая утечку координат.'
      },
      {
        icon: 'check',
        title: 'Стабильная маршрутизация Discord, YouTube и Gemini/AI',
        desc: 'Оптимизирован сетевой стек Wintun, устранены DNS-зависания, расширен список доменов и добавлена поддержка голосовых серверов Discord и Google AI API.'
      },
      {
        icon: 'check',
        title: 'Кристальная четкость текста и векторных иконок',
        desc: 'Полностью устранен эффект размытия («мыла»). Оптимизирован рендеринг шрифтов, убраны тяжелые растровые фильтры, повышена контрастность и четкость всех иконок.'
      },
      {
        icon: 'shield',
        title: 'Защита от спам-кликов и аварийное восстановление',
        desc: 'Все кнопки блокируются во время выполнения асинхронных операций; внедрен мгновенный откат часового пояса и сетевого стека при сбоях и аварийном закрытии.'
      }
    ]
  },
  {
    version: '1.5.5',
    date: '28.08.2026',
    highlights: [
      {
        icon: 'sparkles',
        title: 'Сквозная динамическая синхронизация версий',
        desc: 'Центр обновлений автоматически считывает актуальную версию из Electron runtime без статичной привязки.'
      },
      {
        icon: 'shield',
        title: 'Нативный рендеринг иконки в системном трее Windows',
        desc: 'Оптимизированный многоуровневый алгоритм загрузки 16x16 PNG/ICO с аппаратной валидацией альфа-канала.'
      },
      {
        icon: 'check',
        title: 'Очистка тестовых профилей и чистота папки Configs',
        desc: 'Удалены устаревшие тестовые конфигурации и автосидинг; оставлен единый чистый шаблон для удобства.'
      },
      {
        icon: 'sparkles',
        title: 'Массовое удаление профилей (Clear All)',
        desc: 'В менеджер профилей добавлена кнопка быстрой очистки всех конфигураций с подтверждением действия.'
      }
    ]
  },
  {
    version: '1.5.4',
    date: '28.08.2026',
    highlights: [
      {
        icon: 'shield',
        title: 'Гарантированный запуск от Администратора (UAC Elevation)',
        desc: 'Встроен манифест requireAdministrator для надежного управления системными службами (lfsvc), часовыми поясами и сетевым стеком.'
      },
      {
        icon: 'check',
        title: 'Фиксация часового пояса (Tomsk Standard Time)',
        desc: 'Реальный часовой пояс по умолчанию зафиксирован на Tomsk Standard Time с автоматической миграцией и надежным сохранением настроек.'
      },
      {
        icon: 'sparkles',
        title: 'Изоляция профилей Home / Office',
        desc: 'Строгое разделение активных профилей по режимам работы без пересечения данных.'
      }
    ]
  },
  {
    version: '1.5.3',
    date: '28.08.2026',
    highlights: [
      {
        icon: 'sparkles',
        title: 'Автоматическая санация и защита от дубликатов профилей',
        desc: 'Полная изоляция хранилища конфигураций. Автоматическое удаление паразитных тестовых профилей при запуске.'
      },
      {
        icon: 'shield',
        title: 'Надежная фиксация иконок приложения и трея',
        desc: 'Прямое внедрение иконки в PE-ресурсы сборщика, расширенный поиск кэшированных ассетов и гарантированное отображение значка в трее и на ярлыках Windows.'
      },
      {
        icon: 'check',
        title: 'Информативные уведомления проверки обновлений',
        desc: 'При отсутствии связи с GitHub без туннеля отображается понятная подсказка с рекомендацией включить Resident Shield (VPN).'
      }
    ]
  },
  {
    version: '1.5.2',
    date: '28.08.2026',
    isCurrent: false,
    highlights: [
      {
        icon: 'shield',
        title: 'Изолированная среда DEV BUILD (Sandbox Isolation)',
        desc: 'Полное разделение хранилищ данных (%APPDATA%\\ExiliumSwitch-Dev), независимый мьютекс и возможность параллельного запуска DEV-сборки и релизной версии.'
      },
      {
        icon: 'zap',
        title: 'Непрерывное поточное логирование на диск',
        desc: 'Все события жизненного цикла и sing-box теперь в реальном времени синхронно записываются в файл сессии exilium-session-*.log.'
      },
      {
        icon: 'sparkles',
        title: 'Сквозная синхронизация версий и DEV-брендинг',
        desc: 'Единый источник версии (v1.5.2) во всем стеке: окно, трей, сессионные логи. Яркие индикаторы DEV BUILD в шапке и консоли.'
      },
      {
        icon: 'check',
        title: 'Умная оптимизация модуля обновлений',
        desc: 'Интеллектуальная изоляция фоновых проверок GitHub Releases в DEV-режиме и исключение ложных таймаутов при тестировании без туннеля.'
      }
    ]
  },
  {
    version: '1.5.1',
    date: '27.08.2026',
    isCurrent: false,
    highlights: [
      {
        icon: 'shield',
        title: 'Ультимативный обход корпоративных DPI (Enterprise Stealth)',
        desc: 'Поддержка транспорта VLESS WebSocket + TLS с валидным сертификатом Let\'s Encrypt для обхода глубокой сигнатурной инспекции NGFW (UserGate, FortiGate, CheckPoint).'
      },
      {
        icon: 'briefcase',
        title: 'Синхронизация статусов режима «Офис»',
        desc: 'Плашки резидента («Часовой пояс» и «Служба гео») теперь явно отображают сохранение параметров системы без тревожных индикаторов.'
      },
      {
        icon: 'sparkles',
        title: 'Улучшенная эргономика главного экрана',
        desc: 'Увеличены отступы между селектором режимов и мастер-кнопкой подключения, исправлено позиционирование всплывающих подсказок.'
      },
      {
        icon: 'zap',
        title: 'Универсальный VLESS-парсер',
        desc: 'Парсер ссылок теперь нативно поддерживает как Reality (TCP/XTLS), так и чистый TLS/WSS с любыми путями и портами.'
      }
    ]
  },
  {
    version: '1.5.0',
    date: '27.08.2026',
    isCurrent: false,
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
      }
    ]
  }
]

export const UpdateModal: React.FC<UpdateModalProps> = ({ isOpen, currentVersion, onClose }) => {
  const [displayVersion, setDisplayVersion] = useState(currentVersion || '1.5.6')
  const [state, setState] = useState<UpdateState>('idle')
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [progress, setProgress] = useState<UpdateProgress>({
    percent: 0,
    bytesPerSecond: 0,
    transferred: 0,
    total: 0
  })
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [isRestarting, setIsRestarting] = useState(false)
  const [downloadStarting, setDownloadStarting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      window.electronAPI?.getAppVersion().then((v) => {
        if (v) setDisplayVersion(v)
      }).catch(() => {})
    }
  }, [isOpen, currentVersion])

  const checkForUpdates = async () => {
    setState('checking')
    setErrorMessage('')
    try {
      const res = await window.electronAPI?.checkForUpdates()
      if (res && !res.success && res.error) {
        setErrorMessage(res.error)
        setState('error')
      }
    } catch (err: any) {
      const msg = err?.message || 'Ошибка проверки обновлений'
      if (msg.includes('timed') || msg.includes('ERR_') || msg.includes('GitHub')) {
        setErrorMessage('Не удалось подключиться к серверу обновлений (GitHub). Для проверки и загрузки обновлений включите Resident Shield (VPN-соединение).')
      } else {
        setErrorMessage(msg)
      }
      setState('error')
    }
  }

  const handleStartDownload = async () => {
    if (downloadStarting || state === 'downloading') return
    setDownloadStarting(true)
    setState('downloading')
    try {
      const res = await window.electronAPI?.startUpdateDownload()
      if (!res?.success) {
        setErrorMessage(res?.error || 'Ошибка начала загрузки')
        setState('error')
      }
    } finally {
      setDownloadStarting(false)
    }
  }

  const handleRestartNow = () => {
    if (isRestarting) return
    setIsRestarting(true)
    window.electronAPI?.quitAndInstallUpdate()
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Б'
    const k = 1024
    const sizes = ['Б', 'КБ', 'МБ', 'ГБ']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
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
      setDownloadStarting(false)
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

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none cursor-default"
        onClick={() => {
          if (state !== 'downloading' && !isRestarting) onClose()
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
            <button
              onClick={onClose}
              disabled={state === 'downloading' || isRestarting}
              className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-40"
            >
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
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
                    v{displayVersion}
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
                disabled={state === 'checking' || state === 'downloading' || downloadStarting || isRestarting}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white text-black hover:bg-zinc-200 active:scale-95 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_12px_rgba(255,255,255,0.2)]"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${state === 'checking' ? 'animate-spin' : ''}`} />
                <span>{state === 'checking' ? 'Проверка...' : 'Проверить'}</span>
              </button>
            </div>

            {/* Error banner */}
            {state === 'error' && errorMessage && (
              <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs flex items-start gap-2.5 leading-relaxed">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <div className="flex-1">
                  <span className="font-semibold block mb-0.5 text-amber-300">Внимание</span>
                  <span>{errorMessage}</span>
                </div>
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
                  disabled={downloadStarting || isRestarting}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white text-black hover:bg-zinc-200 active:scale-95 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1"
                >
                  <Download className={`w-3.5 h-3.5 ${downloadStarting ? 'animate-bounce' : ''}`} />
                  <span>{downloadStarting ? 'Запуск...' : 'Скачать'}</span>
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
              {CHANGELOG_DATA.map((item, idx) => {
                const isCurrent = item.version === displayVersion || (!CHANGELOG_DATA.some(x => x.version === displayVersion) && idx === 0)
                return (
                  <div
                    key={item.version}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isCurrent
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
                        {isCurrent && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white border border-white/20">
                            Текущая
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono">{item.date}</span>
                    </div>

                    <div className="space-y-2">
                      {item.highlights.map((h, hIdx) => (
                        <div key={hIdx} className="text-xs">
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
                )
              })}
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
