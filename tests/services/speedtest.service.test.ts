import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SpeedtestService } from '../../electron/services/speedtest.service'
import { NetworkService } from '../../electron/services/network.service'
import { WindowManager } from '../../electron/core/window-manager'

describe('SpeedtestService', () => {
  let service: SpeedtestService

  beforeEach(() => {
    service = SpeedtestService.getInstance()
    vi.restoreAllMocks()
  })

  it('should run speedtest and return metrics', async () => {
    vi.spyOn(NetworkService.getInstance(), 'testLatency').mockResolvedValue({ latencyMs: 95 })
    vi.spyOn(WindowManager.getInstance(), 'broadcast').mockImplementation(() => {})

    // Mock fetch for download and upload
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
      if (url.toString().includes('__down')) {
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array(1024 * 1024))
            controller.close()
          }
        })
        return {
          ok: true,
          status: 200,
          body: stream
        } as any
      }
      return {
        ok: true,
        status: 200
      } as any
    })

    const result = await service.runSpeedtest()
    expect(result).toBeDefined()
    expect(result.pingMs).toBe(95)
    expect(typeof result.downloadMbps).toBe('number')
    expect(typeof result.uploadMbps).toBe('number')
  })

  it('should allow cancelling speedtest', () => {
    service.cancel()
    expect(service.getLastResult()).toBeDefined()
  })

  it('should handle speedtest errors cleanly without crashing', async () => {
    vi.spyOn(NetworkService.getInstance(), 'testLatency').mockResolvedValue({ latencyMs: 100 })
    vi.spyOn(WindowManager.getInstance(), 'broadcast').mockImplementation(() => {})
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'))

    await expect(service.runSpeedtest()).rejects.toThrow('Network error')
  })

  it('should throttle frequent progress broadcasts', () => {
    const broadcastSpy = vi.spyOn(WindowManager.getInstance(), 'broadcast').mockImplementation(() => {})
    // Calling broadcastProgress multiple times in rapid succession (<100ms)
    // Access private broadcastProgress for testing throttle behavior
    const anyService = service as any
    anyService.lastBroadcastTime = Date.now()
    anyService.broadcastProgress({
      stage: 'download',
      progressPct: 50,
      currentSpeedMbps: 20,
      pingMs: 50,
      downloadMbps: 20,
      uploadMbps: null
    })
    // Since stage is 'download' and less than 100ms elapsed, broadcast should be throttled (not called)
    expect(broadcastSpy).not.toHaveBeenCalled()

    // But stage 'error' must NEVER be throttled even if <100ms
    anyService.broadcastProgress({
      stage: 'error',
      progressPct: 0,
      currentSpeedMbps: 0,
      pingMs: null,
      downloadMbps: null,
      uploadMbps: null,
      error: 'Test error'
    })
    expect(broadcastSpy).toHaveBeenCalledTimes(1)
  })
})
