import { shell } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { getAppDataDir } from '../utils/paths'
import type { LogEntry, LogType } from '../../shared/types'

type LogListener = (entry: LogEntry) => void

export class LogService {
  private static instance: LogService
  private buffer: LogEntry[] = []
  private readonly maxBufferSize = 1000
  private listeners: Set<LogListener> = new Set()

  private constructor() {}

  public static getInstance(): LogService {
    if (!LogService.instance) {
      LogService.instance = new LogService()
    }
    return LogService.instance
  }

  public addListener(listener: LogListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  public addLog(text: string, type: LogType = 'info', templateId?: string): LogEntry {
    const time = new Date().toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    })

    const entry: LogEntry = { time, text, type, templateId }

    this.buffer.push(entry)
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift()
    }

    // Notify active listeners
    for (const listener of this.listeners) {
      try {
        listener(entry)
      } catch (err) {
        console.error('Log listener error:', err)
      }
    }

    return entry
  }

  public getRecentLogs(): LogEntry[] {
    return [...this.buffer]
  }

  public clearLogs(): void {
    this.buffer = []
  }

  public parseSingBoxLine(rawLine: string): LogEntry {
    const line = rawLine.trim()
    let type: LogType = 'info'

    if (line.includes('ERROR') || line.includes('FATAL') || line.includes('[ERR]') || line.includes('panic:')) {
      type = 'error'
    } else if (line.includes('WARN') || line.includes('[WARN]')) {
      type = 'warn'
    } else if (line.includes('DEBUG') || line.includes('TRACE')) {
      type = 'dev'
    } else if (line.includes('started') || line.includes('connected') || line.includes('ready')) {
      type = 'success'
    }

    // Clean timestamp prefixes if sing-box already outputs them
    const cleanText = line.replace(/^\[.*?\]\s*/, '')
    return this.addLog(cleanText || line, type)
  }

  public exportLogs(): { success: boolean; savedPath?: string; error?: string } {
    try {
      const appData = getAppDataDir()
      const logsDir = path.join(appData, 'logs')
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true })
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const savedPath = path.join(logsDir, `exilium-logs-${timestamp}.log`)
      const content = this.buffer.map(l => `[${l.time}] [${l.type.toUpperCase()}] ${l.text}`).join('\n')

      fs.writeFileSync(savedPath, content, 'utf-8')
      return { success: true, savedPath }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, error: message }
    }
  }

  public openLogsFolder(): void {
    const appData = getAppDataDir()
    const logsDir = path.join(appData, 'logs')
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true })
    }
    if (shell && typeof shell.openPath === 'function') {
      shell.openPath(logsDir).catch(console.error)
    }
  }
}
