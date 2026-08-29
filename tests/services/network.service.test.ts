import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NetworkService } from '../../electron/services/network.service'

describe('NetworkService Engine', () => {
  let networkService: NetworkService

  beforeEach(() => {
    networkService = NetworkService.getInstance()
  })

  it('should return physical adapters list with default fallback', async () => {
    const adapters = await networkService.getPhysicalAdapters()
    expect(Array.isArray(adapters)).toBe(true)
    expect(adapters.length).toBeGreaterThan(0)
  }, 20000)

  it('should handle latency measurement without throwing uncaught exceptions', async () => {
    // Test to a non-existent or localhost port to check error handling
    const res = await networkService.testLatency('127.0.0.1', 65534)
    expect(res).toBeDefined()
    expect(res.latencyMs === null || typeof res.latencyMs === 'number').toBe(true)
  })

  it('should execute clearIdeAndDnsCache safely without uncaught errors', async () => {
    const res = await networkService.clearIdeAndDnsCache()
    expect(res).toBeDefined()
    expect(res.success).toBe(true)
  })
})
