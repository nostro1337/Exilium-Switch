import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { TelemetryService } from '../../electron/services/telemetry.service'
import { SingBoxService } from '../../electron/services/singbox.service'
import { NetworkService } from '../../electron/services/network.service'

describe('TelemetryService', () => {
  let telemetryService: TelemetryService

  beforeEach(() => {
    telemetryService = TelemetryService.getInstance()
    telemetryService.stopMonitoring()
    telemetryService.clearAnomalies()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    telemetryService.stopMonitoring()
    vi.restoreAllMocks()
  })

  it('should initialize with default telemetry state', () => {
    const data = telemetryService.getTelemetry()
    expect(data.healthScore).toBe(100)
    expect(data.activeDpiAnomalies).toEqual([])
  })

  it('should record and clear DPI anomalies, affecting Health Score', () => {
    telemetryService.recordDpiAnomaly('RST Injection: <IP>')
    let data = telemetryService.getTelemetry()
    expect(data.activeDpiAnomalies).toContain('RST Injection: <IP>')
    expect(data.healthScore).toBeLessThan(100)

    telemetryService.clearAnomalies()
    data = telemetryService.getTelemetry()
    expect(data.activeDpiAnomalies.length).toBe(0)
    expect(data.healthScore).toBe(100)
  })

  it('should run single check when VPN is active', async () => {
    vi.spyOn(SingBoxService.getInstance(), 'isRunning').mockResolvedValue(true)
    vi.spyOn(NetworkService.getInstance(), 'testLatency').mockResolvedValue({
      latencyMs: 45
    })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 204
    } as any)

    const data = await telemetryService.runSingleCheck()
    expect(data.pingMs).toBe(45)
    expect(data.rttHistory.length).toBeGreaterThan(0)
    expect(data.healthScore).toBeGreaterThanOrEqual(90)
  })

  it('should reset ping and return 100 health score when VPN is not running', async () => {
    vi.spyOn(SingBoxService.getInstance(), 'isRunning').mockResolvedValue(false)

    const data = await telemetryService.runSingleCheck()
    expect(data.pingMs).toBeNull()
    expect(data.jitterMs).toBeNull()
    expect(data.healthScore).toBe(100)
  })

  it('should start and stop background monitoring timer cleanly', () => {
    telemetryService.startMonitoring()
    // Starting again should be idempotent
    telemetryService.startMonitoring()
    telemetryService.stopMonitoring()
    expect(telemetryService.getTelemetry().pingMs).toBeNull()
  })
})
