import { app, shell } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { getAppDataDir, isDevBuild } from '../utils/paths'
import type { LogEntry, LogType } from '../../shared/types'

type LogListener = (entry: LogEntry) => void

export class LogService {
  private static instance: LogService
  private buffer: LogEntry[] = []
  private readonly maxBufferSize = 1000
  private listeners: Set<LogListener> = new Set()
  private sessionFilePath: string | null = null

  private constructor() {}

  public static getInstance(): LogService {
    if (!LogService.instance) {
      LogService.instance = new LogService()
    }
    return LogService.instance
  }

  public initSessionFile(): string {
    if (this.sessionFilePath) return this.sessionFilePath

    try {
      const appData = getAppDataDir()
      const logsDir = path.join(appData, 'logs')
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true })
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      this.sessionFilePath = path.join(logsDir, `exilium-session-${timestamp}.log`)

      const isDev = isDevBuild()
      const version = (app && typeof app.getVersion === 'function') ? app.getVersion() : '1.5.1'
      const sessionStart = new Date().toISOString()
      const modeBadge = isDev ? ' [DEV BUILD]' : ''
      const header = `=== EXILIUM SWITCH v${version}${modeBadge} SESSION STARTED [${sessionStart}] (by Nostro) ===\n`

      fs.writeFileSync(this.sessionFilePath, header, 'utf-8')
      return this.sessionFilePath
    } catch (err) {
      console.error('Failed to init live session log file:', err)
      return ''
    }
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

    // Live continuous append to session log file on disk
    try {
      if (!this.sessionFilePath) {
        this.initSessionFile()
      }
      if (this.sessionFilePath) {
        const line = `[${time}] [${type.toUpperCase().padEnd(3)}] ${text}\n`
        fs.appendFileSync(this.sessionFilePath, line, 'utf-8')
      }
    } catch {}

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
    const lower = line.toLowerCase()
    let type: LogType = 'info'
    if (line.includes('ERROR') || line.includes('FATAL') || line.includes('[ERR]') || lower.includes('panic:')) {
      type = 'error'
    } else if (line.includes('WARN') || line.includes('[WARN]')) {
      type = 'warn'
    } else if (line.includes('DEBUG') || line.includes('TRACE')) {
      type = 'dev'
    } else if (lower.includes('started') || lower.includes('connected') || lower.includes('ready')) {
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
      const savedPath = path.join(logsDir, `exilium-session-${timestamp}.log`)
      const version = (app && typeof app.getVersion === 'function') ? app.getVersion() : 'unknown'
      const sessionStart = new Date().toISOString()
      const header = `=== EXILIUM SWITCH v${version} SESSION STARTED [${sessionStart}] (by Nostro) ===\n`
      const content = header + this.buffer.map(l => `[${l.time}] [${l.type.toUpperCase().padEnd(3)}] ${l.text}`).join('\n')


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
