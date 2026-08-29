import { describe, it, expect, beforeEach } from 'vitest'
import { LogService } from '../../electron/services/log.service'
import type { LogEntry } from '../../shared/types'

describe('LogService Ring Buffer & Parser', () => {
  let logService: LogService

  beforeEach(() => {
    logService = LogService.getInstance()
    logService.clearLogs()
  })

  it('should add logs and format timestamps', () => {
    const entry = logService.addLog('Тестовое сообщение', 'info')
    expect(entry.text).toBe('Тестовое сообщение')
    expect(entry.type).toBe('info')
    expect(entry.time).toBeDefined()

    const recent = logService.getRecentLogs()
    expect(recent).toHaveLength(1)
    expect(recent[0].text).toBe('Тестовое сообщение')
  })

  it('should notify registered listeners when new log is added', () => {
    const received: LogEntry[] = []
    const unsubscribe = logService.addListener((entry) => {
      received.push(entry)
    })

    logService.addLog('Сообщение для слушателя', 'success')
    expect(received).toHaveLength(1)
    expect(received[0].text).toBe('Сообщение для слушателя')
    expect(received[0].type).toBe('success')

    unsubscribe()
    logService.addLog('Второе сообщение после отписки', 'warn')
    expect(received).toHaveLength(1) // Still 1 because unsubscribed
  })

  it('should classify sing-box log lines by level correctly', () => {
    const errLog = logService.parseSingBoxLine('[FATAL] connection failed to remote: handshake timeout')
    expect(errLog.type).toBe('error')

    const warnLog = logService.parseSingBoxLine('[WARN] interface MTU lower than expected')
    expect(warnLog.type).toBe('warn')

    const debugLog = logService.parseSingBoxLine('[DEBUG] inbound/mixed: router matching domain')
    expect(debugLog.type).toBe('dev')

    const successLog = logService.parseSingBoxLine('sing-box started and ready on tun0')
    expect(successLog.type).toBe('success')
  })

  it('should maintain max buffer capacity without unbounded memory growth', () => {
    for (let i = 0; i < 1600; i++) {
      logService.addLog(`Строка лога #${i}`, 'info')
    }

    const logs = logService.getRecentLogs()
    expect(logs.length).toBeLessThanOrEqual(1500)
    expect(logs[logs.length - 1].text).toBe('Строка лога #1599')
  })

  it('should assign categories based on content and level', () => {
    const netLog = logService.parseSingBoxLine('inbound/tun[tun-in]: connection to 1.1.1.1:443')
    expect(netLog.category).toBe('traffic')

    const secLog = logService.addLog('Resident Shield активирован, fakeZone установлен', 'info')
    expect(secLog.category).toBe('security')

    const errLog = logService.addLog('Критическая ошибка DNS', 'error')
    expect(errLog.category).toBe('error')
  })

  it('should export logs and open logs folder without exceptions', () => {
    logService.addLog('Строка для экспорта', 'info')
    const res = logService.exportLogs()
    expect(res).toBeDefined()
    expect(res.success).toBe(true)
    expect(res.savedPath).toBeDefined()

    expect(() => logService.openLogsFolder()).not.toThrow()
  })

  it('should initialize live session file and write headers properly', () => {
    const sessionFile = logService.initSessionFile()
    expect(sessionFile).toBeDefined()
    expect(typeof sessionFile).toBe('string')
    expect(sessionFile.length).toBeGreaterThan(0)
  })
})
