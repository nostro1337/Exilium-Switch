import { describe, it, expect, beforeEach } from 'vitest'
import { AuditService } from '../../electron/services/audit.service'

describe('AuditService System & Domain Analyzer', () => {
  let auditService: AuditService

  beforeEach(() => {
    auditService = AuditService.getInstance()
  })

  it('should perform system audit and return comprehensive result object', async () => {
    const result = await auditService.performAudit()

    expect(result).toBeDefined()
    expect(typeof result.hostname).toBe('string')
    expect(typeof result.currentUser).toBe('string')
    expect(typeof result.domainName).toBe('string')
    expect(['home', 'office']).toContain(result.recommendedMode)
    expect(typeof result.recommendationReason).toBe('string')
    expect(Array.isArray(result.domainControllers)).toBe(true)
    expect(Array.isArray(result.dnsServers)).toBe(true)
    expect(Array.isArray(result.dnsSuffixes)).toBe(true)
  }, 20000)
})
