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
    for (let i = 0; i < 1100; i++) {
      logService.addLog(`Строка лога #${i}`, 'info')
    }

    const logs = logService.getRecentLogs()
    expect(logs.length).toBeLessThanOrEqual(1000)
    expect(logs[logs.length - 1].text).toBe('Строка лога #1099')
  })
})
