import React, { useEffect, useRef, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Terminal,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  Filter,
  Shield,
  Download,
  FolderOpen,
  Pause,
  Play,
  Activity,
  AlertTriangle,
  Server,
  Lock,
  Layers,
  X
} from 'lucide-react'
import type { LogEntry, LogCategory } from '../../shared/types'

interface LogConsoleProps {
  isOpen: boolean
  onClose: () => void
}

type TabType = 'all' | 'system' | 'traffic' | 'security' | 'error'

export const LogConsole: React.FC<LogConsoleProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [copied, setCopied] = useState(false)
  const [exported, setExported] = useState(false)
  const [filter, setFilter] = useState('')
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [autoScroll, setAutoScroll] = useState(true)
  const [isDev, setIsDev] = useState(false)
  const [copiedLineIndex, setCopiedLineIndex] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    window.electronAPI?.getRecentLogs().then((recent) => {
      if (recent) setLogs(recent)
    })
    window.electronAPI?.isDevBuild?.().then((dev) => {
      setIsDev(Boolean(dev))
    })

    const unsubscribe = window.electronAPI?.onLog((log) => {
      setLogs((prev) => [...prev.slice(-1000), log])
    })

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs, isOpen, autoScroll, activeTab])

  const [exporting, setExporting] = useState(false)

  // Tab counts
  const counts = useMemo(() => {
    const res = { all: logs.length, system: 0, traffic: 0, security: 0, error: 0 }
    for (const l of logs) {
      const cat = l.category || 'system'
      if (cat === 'traffic') res.traffic++
      else if (cat === 'security') res.security++
      else if (cat === 'error' || l.type === 'error' || l.type === 'warn') res.error++
      else res.system++
    }
    return res
  }, [logs])

  // Filtered by tab and search text
  const filteredLogs = useMemo(() => {
    let list = logs
    if (activeTab === 'system') {
      list = list.filter((l) => (l.category || 'system') === 'system')
    } else if (activeTab === 'traffic') {
      list = list.filter((l) => l.category === 'traffic')
    } else if (activeTab === 'security') {
      list = list.filter((l) => l.category === 'security')
    } else if (activeTab === 'error') {
      list = list.filter((l) => l.category === 'error' || l.type === 'error' || l.type === 'warn')
    }

    if (filter.trim()) {
      const q = filter.toLowerCase().trim()
      list = list.filter((l) => l.text.toLowerCase().includes(q) || l.time.includes(q))
    }
    return list
  }, [logs, activeTab, filter])

  const handleCopy = () => {
    const raw = filteredLogs.map((l) => `[${l.time}] [${(l.category || 'SYS').toUpperCase()}] [${l.type.toUpperCase()}] ${l.text}`).join('\n')
    navigator.clipboard.writeText(raw)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyLine = (text: string, index: number) => {
    navigator.clipboard.writeText(text)
    setCopiedLineIndex(index)
    setTimeout(() => setCopiedLineIndex(null), 1500)
  }

  const handleExport = async () => {
    if (exporting) return
    setExporting(true)
    try {
      const res = await window.electronAPI?.exportLogs()
      if (res && res.success) {
        setExported(true)
        setTimeout(() => setExported(false), 2500)
      }
    } finally {
      setExporting(false)
    }
  }

  const handleOpenFolder = () => {
    window.electronAPI?.openLogsFolder()
  }

  const handleClear = () => {
    setLogs([])
  }

  if (!isOpen) return null

  const tabs: { id: TabType; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'all', label: 'Все', icon: <Layers className="w-3 h-3" />, count: counts.all },
    { id: 'system', label: 'Система', icon: <Server className="w-3 h-3" />, count: counts.system },
    { id: 'traffic', label: 'Трафик', icon: <Activity className="w-3 h-3" />, count: counts.traffic },
    { id: 'security', label: 'Безопасность', icon: <Lock className="w-3 h-3" />, count: counts.security },
    { id: 'error', label: 'Ошибки', icon: <AlertTriangle className="w-3 h-3" />, count: counts.error }
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 30, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 450, damping: 30 }}
      className="fixed inset-x-2.5 bottom-2.5 top-[44px] bg-[#0c0c0e] border border-white/15 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex flex-col z-40 overflow-hidden"
    >
      {/* Console Header Bar */}
      <div className="h-11 px-3 border-b border-white/10 flex items-center justify-between bg-[#131317] shrink-0 select-none gap-3">
        {/* Left: Title & Badge */}
        <div className="flex items-center gap-2 shrink-0">
          <Terminal className="w-3.5 h-3.5 text-zinc-300" strokeWidth={2} />
          <span className="text-xs font-semibold text-zinc-100">Консоль логов</span>
          {isDev && (
            <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
              DEV
            </span>
          )}
        </div>

        {/* Right: Actions Group */}
        <div className="flex items-center gap-1.5 ml-auto overflow-x-auto">
          {/* Quick Filter */}
          <div className="relative flex items-center mr-1">
            <Filter className="w-3 h-3 text-zinc-500 absolute left-2 pointer-events-none" />
            <input
              type="text"
              placeholder="Поиск..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-black/60 border border-white/10 rounded-md pl-6 pr-6 py-1 text-[11px] text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-white/40 w-24 focus:w-36 transition-all font-mono"
            />
            {filter && (
              <button
                onClick={() => setFilter('')}
                className="absolute right-1.5 p-0.5 text-zinc-500 hover:text-white"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>

          {/* Auto-Scroll Toggle Button */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            title={autoScroll ? 'Приостановить автоскролл' : 'Включить автоскролл'}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border transition-all cursor-pointer ${
              autoScroll
                ? 'bg-white/5 hover:bg-white/15 text-zinc-300 border-white/10'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            }`}
          >
            {autoScroll ? (
              <>
                <Pause className="w-3 h-3 text-zinc-400" />
                <span className="font-sans hidden sm:inline">Скролл: Вкл</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 text-amber-300" />
                <span className="font-sans">Пауза</span>
              </>
            )}
          </button>

          {/* Export Full Session File Button */}
          <button
            onClick={handleExport}
            title="Экспортировать весь лог сессии в файл"
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white border border-white/10 text-[11px] font-medium transition-all cursor-pointer"
          >
            {exported ? (
              <>
                <Check className="w-3 h-3 text-white" strokeWidth={2.5} />
                <span className="font-sans">Сохранено</span>
              </>
            ) : (
              <>
                <Download className="w-3 h-3 text-zinc-400" strokeWidth={2} />
                <span className="font-sans hidden sm:inline">Экспорт</span>
              </>
            )}
          </button>

          {/* Open Logs Folder */}
          <button
            onClick={handleOpenFolder}
            title="Открыть папку с файлами логов"
            className="p-1.5 rounded-md bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white border border-white/10 transition-all cursor-pointer"
          >
            <FolderOpen className="w-3 h-3" strokeWidth={2} />
          </button>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            title="Скопировать логи из окна"
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white border border-white/10 text-[11px] font-medium transition-all cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-white" strokeWidth={2.5} />
                <span className="font-sans">Скопировано</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-zinc-400" strokeWidth={2} />
                <span className="font-sans hidden sm:inline">Копия</span>
              </>
            )}
          </button>

          {/* Clear Button */}
          <button
            onClick={handleClear}
            title="Очистить текущее окно логов"
            className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/15 transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>

          {/* Minimize / Close Console */}
          <button
            onClick={onClose}
            title="Свернуть консоль"
            className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/15 transition-all cursor-pointer ml-0.5"
          >
            <ChevronDown className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Tabs Navigation Sub-Header */}
      <div className="h-9 px-3 border-b border-white/[0.08] bg-[#0e0e11] flex items-center gap-1.5 shrink-0 overflow-x-auto select-none">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          const hasErrors = tab.id === 'error' && tab.count > 0
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-white text-black font-semibold shadow-sm'
                  : hasErrors
                  ? 'bg-red-950/50 text-red-300 border border-red-800/40 hover:bg-red-900/50'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              <span
                className={`text-[9.5px] font-mono px-1 py-0.2 rounded-full font-bold ${
                  isActive
                    ? 'bg-black/20 text-black'
                    : hasErrors
                    ? 'bg-red-800/50 text-red-200'
                    : 'bg-white/10 text-zinc-400'
                }`}
              >
                {tab.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Logs Window */}
      <div
        ref={scrollRef}
        className="flex-1 p-3 overflow-y-auto font-mono text-[11px] space-y-1 select-text leading-relaxed bg-[#08080a]"
      >
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600 text-xs font-sans gap-2 py-8">
            <Shield className="w-6 h-6 text-zinc-700 stroke-[1.5]" />
            <span>
              {filter ? 'Ничего не найдено по вашему запросу.' : 'В этой вкладке пока нет записей.'}
            </span>
          </div>
        ) : (
          filteredLogs.map((log, index) => {
            const isJustCopied = copiedLineIndex === index
            const isTraffic = log.category === 'traffic'
            return (
              <div
                key={index}
                onClick={() => handleCopyLine(log.text, index)}
                title="Нажмите, чтобы скопировать строку"
                className="group flex items-start gap-2 break-all hover:bg-white/[0.04] px-1.5 py-0.5 rounded cursor-pointer transition-colors"
              >
                <span className="text-zinc-600 shrink-0 select-none text-[10px]">[{log.time}]</span>

                {/* Category Badge */}
                {activeTab === 'all' && (
                  <span
                    className={`font-bold text-[9px] px-1 py-0.2 rounded shrink-0 select-none ${
                      log.category === 'traffic'
                        ? 'bg-sky-950/80 text-sky-300 border border-sky-800/40'
                        : log.category === 'security'
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/40'
                        : log.category === 'error'
                        ? 'bg-red-950/80 text-red-300 border border-red-800/40'
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700/50'
                    }`}
                  >
                    {log.category === 'traffic'
                      ? 'NET'
                      : log.category === 'security'
                      ? 'SEC'
                      : log.category === 'error'
                      ? 'ERR'
                      : 'SYS'}
                  </span>
                )}

                {/* Type Badge */}
                <span
                  className={`font-bold text-[9.5px] px-1.5 py-0.2 rounded shrink-0 select-none ${
                    log.type === 'error'
                      ? 'bg-red-950/90 text-red-200 border border-red-800/60'
                      : log.type === 'warn'
                      ? 'bg-amber-950/90 text-amber-200 border border-amber-800/60'
                      : log.type === 'success'
                      ? 'bg-emerald-950/80 text-emerald-200 border border-emerald-700/50'
                      : log.type === 'dev'
                      ? 'bg-indigo-950/90 text-indigo-300 border border-indigo-600/50 font-bold tracking-wider'
                      : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                  }`}
                >
                  {log.type === 'error'
                    ? 'ERR'
                    : log.type === 'warn'
                    ? 'WRN'
                    : log.type === 'success'
                    ? 'OK '
                    : log.type === 'dev'
                    ? 'DEV'
                    : 'INF'}
                </span>

                {/* Text Content */}
                <span
                  className={`flex-1 ${
                    log.type === 'error'
                      ? 'text-red-200 font-medium'
                      : log.type === 'warn'
                      ? 'text-amber-200/90'
                      : log.type === 'success'
                      ? 'text-emerald-100'
                      : log.type === 'dev'
                      ? 'text-indigo-200/90 font-mono text-[10.5px]'
                      : isTraffic
                      ? 'text-zinc-400 text-[10.5px]'
                      : 'text-zinc-200'
                  }`}
                >
                  {log.text}
                </span>

                {/* Click to copy feedback */}
                {isJustCopied && (
                  <span className="text-[9px] font-sans px-1.5 py-0.2 rounded bg-white text-black font-semibold shrink-0">
                    Скопировано!
                  </span>
                )}
              </div>
            )
          })
        )}
      </div>
    </motion.div>
  )
}
