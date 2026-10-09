import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NetworkService } from '../../electron/services/network.service'
import * as execModule from '../../electron/utils/exec'

describe('NetworkService Engine', () => {
  let networkService: NetworkService

  beforeEach(() => {
    networkService = NetworkService.getInstance()
    vi.restoreAllMocks()
  })

  it('should return physical adapters list with default fallback', async () => {
    const adapters = await networkService.getPhysicalAdapters()
    expect(Array.isArray(adapters)).toBe(true)
    expect(adapters.length).toBeGreaterThan(0)
  }, 20000)

  it('should parse latency from ICMP ping output in english format', async () => {
    vi.spyOn(execModule, 'execFileAsync').mockResolvedValue({
      stdout: 'Reply from 89.124.94.246: bytes=32 time=95ms TTL=54',
      stderr: ''
    })

    const res = await networkService.testLatency('89.124.94.246')
    expect(res.latencyMs).toBe(95)
  })

  it('should parse latency from ICMP ping output in russian format', async () => {
    vi.spyOn(execModule, 'execFileAsync').mockResolvedValue({
      stdout: 'Ответ от 89.124.94.246: число байт=32 время=110мс TTL=54',
      stderr: ''
    })

    const res = await networkService.testLatency('89.124.94.246')
    expect(res.latencyMs).toBe(110)
  })

  it('should handle latency measurement without throwing uncaught exceptions', async () => {
    // Test to a non-existent or localhost port to check error handling
    const res = await networkService.testLatency('127.0.0.1', 65534)
    expect(res).toBeDefined()
    expect(res.latencyMs === null || typeof res.latencyMs === 'number').toBe(true)
  })

  it('should fallback to TCP handshake measurement when ICMP ping fails', async () => {
    vi.spyOn(execModule, 'execFileAsync').mockRejectedValueOnce(new Error('ICMP blocked'))
    const res = await networkService.testLatency('127.0.0.1', 65534)
    expect(res).toBeDefined()
    expect(res.latencyMs === null || typeof res.latencyMs === 'number').toBe(true)
  })

  it('should parse physical adapters from netsh output filtering virtual adapters', async () => {
    const netshOutput = `
Admin State    State          Type             Interface Name
-------------------------------------------------------------------------
Enabled        Disconnected   Dedicated        Подключение по локальной сети
Enabled        Connected      Dedicated        Ethernet
Enabled        Connected      Dedicated        singbox-tun0
Enabled        Connected      Dedicated        wintun
`
    vi.spyOn(execModule, 'execFileAsync').mockResolvedValueOnce({
      stdout: netshOutput,
      stderr: ''
    })

    const adapters = await networkService.getPhysicalAdapters(true)
    expect(adapters).toEqual(['Ethernet'])
  })

  it('should execute flushDns safely without uncaught errors', async () => {
    await expect(networkService.flushDns()).resolves.not.toThrow()
  })

  it('should record tunnel start time via notifyTunnelStarted', () => {
    const before = Date.now()
    networkService.notifyTunnelStarted()
    const recorded = networkService.getLastTunnelStartTime()
    expect(recorded).toBeGreaterThanOrEqual(before)
    expect(recorded).toBeLessThanOrEqual(Date.now())
  })

  it('should wait for route convergence stabilization on first ping after tunnel start and reset timer', async () => {
    vi.spyOn(execModule, 'execFileAsync').mockResolvedValue({
      stdout: 'Reply from 89.124.94.246: bytes=32 time=45ms TTL=54',
      stderr: ''
    })

    // Simulate tunnel started 500ms ago (50ms remaining out of 550ms delay)
    networkService.notifyTunnelStarted(Date.now() - 500)
    const t0 = Date.now()
    const res = await networkService.testLatency('89.124.94.246')
    const elapsed = Date.now() - t0

    expect(res.latencyMs).toBe(45)
    expect(elapsed).toBeGreaterThanOrEqual(20)
    expect(networkService.getLastTunnelStartTime()).toBe(0)

    // Immediate second ping should have no added convergence delay
    const t1 = Date.now()
    await networkService.testLatency('89.124.94.246')
    const secondElapsed = Date.now() - t1
    expect(secondElapsed).toBeLessThan(100)
  })

  it('should reset tunnel start time via notifyTunnelStopped', () => {
    networkService.notifyTunnelStarted()
    expect(networkService.getLastTunnelStartTime()).toBeGreaterThan(0)
    networkService.notifyTunnelStopped()
    expect(networkService.getLastTunnelStartTime()).toBe(0)
  })
})
