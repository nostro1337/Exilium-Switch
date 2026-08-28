import { describe, it, expect, beforeEach } from 'vitest'
import { LogService } from '../../electron/services/log.service'

describe('LogService Deep Parsing & Colors', () => {
  let logService: LogService

  beforeEach(() => {
    logService = LogService.getInstance()
    logService.clearLogs()
  })

  it('should parse various singbox log formats', () => {
    const l1 = logService.parseSingBoxLine('DEBUG [router] matched rule direct')
    expect(l1.type).toBe('dev')

    const l2 = logService.parseSingBoxLine('INFO [inbound] connection open')
    expect(l2.type).toBe('info')

    const l3 = logService.parseSingBoxLine('WARN [dns] timeout querying nameserver')
    expect(l3.type).toBe('warn')

    const l4 = logService.parseSingBoxLine('ERROR [outbound] connection refused')
    expect(l4.type).toBe('error')

    const l5 = logService.parseSingBoxLine('Ready on tun0')
    expect(l5.type).toBe('success')
  })
})
