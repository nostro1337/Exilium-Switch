import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Terminal, Trash2, Copy, Check, ChevronDown, Filter, Shield, Download, FolderOpen } from 'lucide-react'

interface LogEntry {
  time: string
  text: string
  type: 'info' | 'warn' | 'error' | 'success' | 'dev'
}

interface LogConsoleProps {
  isOpen: boolean
  onClose: () => void
}

export const LogConsole: React.FC<LogConsoleProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [copied, setCopied] = useState(false)
  const [exported, setExported] = useState(false)
  const [filter, setFilter] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    window.electronAPI?.getRecentLogs().then((recent) => {
      if (recent) setLogs(recent)
    })

    const unsubscribe = window.electronAPI?.onLog((log) => {
      setLogs((prev) => [...prev.slice(-300), log])
    })

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs, isOpen])

  const handleCopy = () => {
    const raw = logs.map((l) => `[${l.time}] [${l.type.toUpperCase()}] ${l.text}`).join('\n')
    navigator.clipboard.writeText(raw)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleExport = async () => {
    const res = await window.electronAPI?.exportLogs()
    if (res && res.success) {
      setExported(true)
      setTimeout(() => setExported(false), 2500)
    }
  }

  const handleOpenFolder = () => {
    window.electronAPI?.openLogsFolder()
  }

  const handleClear = () => {
    setLogs([])
  }

  const filteredLogs = filter
    ? logs.filter((l) => l.text.toLowerCase().includes(filter.toLowerCase()))
    : logs

  if (!isOpen) return null

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
        <div className="flex items-center gap-2.5 shrink-0">
          <Terminal className="w-3.5 h-3.5 text-zinc-300" strokeWidth={2} />
          <span className="text-xs font-semibold text-zinc-100">Консоль логов</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-zinc-300 font-mono font-medium border border-white/5">
            {logs.length}
          </span>
        </div>

        {/* Right: Actions Group with generous gaps */}
        <div className="flex items-center gap-1.5 ml-auto overflow-x-auto">
          {/* Quick Filter */}
          <div className="relative flex items-center mr-1">
            <Filter className="w-3 h-3 text-zinc-500 absolute left-2 pointer-events-none" />
            <input
              type="text"
              placeholder="Фильтр..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-black/60 border border-white/10 rounded-md pl-6 pr-2 py-1 text-[11px] text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-white/40 w-20 focus:w-28 transition-all font-mono"
            />
          </div>

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
                <span className="font-sans">Экспорт</span>
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
                <span className="font-sans">Копия</span>
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

      {/* Logs Window */}
      <div
        ref={scrollRef}
        className="flex-1 p-3 overflow-y-auto font-mono text-[11px] space-y-1 select-text leading-relaxed bg-[#08080a]"
      >
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600 text-xs font-sans gap-2 py-8">
            <Shield className="w-6 h-6 text-zinc-700 stroke-[1.5]" />
            <span>Логи пусты. Нажмите кнопку включения для запуска Shield.</span>
          </div>
        ) : (
          filteredLogs.map((log, index) => (
            <div key={index} className="flex items-start gap-2 break-all hover:bg-white/[0.02] px-1 py-0.5 rounded">
              <span className="text-zinc-600 shrink-0 select-none">[{log.time}]</span>
              <span
                className={`font-bold text-[10px] px-1.5 py-0.2 rounded shrink-0 select-none ${
                  log.type === 'error'
                    ? 'bg-red-950/80 text-red-200 border border-red-800/50'
                    : log.type === 'warn'
                    ? 'bg-amber-950/80 text-amber-200 border border-amber-800/50'
                    : log.type === 'success'
                    ? 'bg-white/15 text-white border border-white/20'
                    : log.type === 'dev'
                    ? 'bg-indigo-950/90 text-indigo-300 border border-indigo-600/50 font-bold tracking-wider'
                    : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                }`}
              >
                {log.type === 'error' ? 'ERR' : log.type === 'warn' ? 'WRN' : log.type === 'success' ? 'OK ' : log.type === 'dev' ? 'DEV' : 'INF'}
              </span>
              <span className={`flex-1 ${
                log.type === 'error'
                  ? 'text-red-200 font-medium'
                  : log.type === 'warn'
                  ? 'text-amber-200/90'
                  : log.type === 'success'
                  ? 'text-white'
                  : log.type === 'dev'
                  ? 'text-indigo-200/90 font-mono text-[10.5px]'
                  : 'text-zinc-300'
              }`}>
                {log.text}
              </span>
            </div>
          ))
        )}
      </div>
    </motion.div>
  )
}
