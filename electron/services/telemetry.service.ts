import { WindowManager } from '../core/window-manager'
import { SingBoxService } from './singbox.service'
import { NetworkService } from './network.service'
import { SettingsService } from './settings.service'
import { LogService } from './log.service'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import type { LiveTelemetry } from '../../shared/types/ai.types'

const CANARY_TARGETS = [
  { key: 'google', name: 'Google Canary', url: 'https://www.google.com/generate_204' },
  { key: 'youtube', name: 'YouTube Probing', url: 'https://www.youtube.com' },
  { key: 'cloudflare', name: 'Cloudflare DNS', url: 'https://1.1.1.1' }
]

export class TelemetryService {
  private static instance: TelemetryService | null = null
  private timer: NodeJS.Timeout | null = null
  private isMonitoring = false
  private previousPing: number | null = null

  private currentTelemetry: LiveTelemetry = {
    pingMs: null,
    jitterMs: null,
    packetLossPct: 0,
    healthScore: 100,
    rttHistory: [],
    canaryResults: {
      google: true,
      youtube: true,
      cloudflare: true
    },
    activeDpiAnomalies: [],
    lastUpdated: new Date().toISOString()
  }

  private constructor() {}

  public static getInstance(): TelemetryService {
    if (!TelemetryService.instance) {
      TelemetryService.instance = new TelemetryService()
    }
    return TelemetryService.instance
  }

  public getTelemetry(): LiveTelemetry {
    return { ...this.currentTelemetry }
  }

  public recordDpiAnomaly(pattern: string): void {
    if (!this.currentTelemetry.activeDpiAnomalies.includes(pattern)) {
      this.currentTelemetry.activeDpiAnomalies.push(pattern)
      // Keep max 5 recent anomalies
      if (this.currentTelemetry.activeDpiAnomalies.length > 5) {
        this.currentTelemetry.activeDpiAnomalies.shift()
      }
      LogService.getInstance().addLog(`AI Sentinel: зафиксирована аномалия DPI: «${pattern}»`, 'warn', undefined, 'security')
      this.recomputeHealthScore()
      this.broadcastTelemetry()
    }
  }

  public clearAnomalies(): void {
    this.currentTelemetry.activeDpiAnomalies = []
    LogService.getInstance().addLog('AI Sentinel: история DPI-аномалий очищена', 'info', undefined, 'system')
    this.recomputeHealthScore()
    this.broadcastTelemetry()
  }

  public startMonitoring(): void {
    if (this.isMonitoring) return
    this.isMonitoring = true

    const settings = SettingsService.getInstance().loadSettings()
    const intervalMs = settings.aiTelemetryInterval || 5000

    LogService.getInstance().addLog('AI Sentinel: запущен фоновый мониторинг телеметрии канала (RTT, Jitter, Canaries)', 'info', undefined, 'system')

    // Initial check
    this.runSingleCheck().catch(() => {})

    this.timer = setInterval(() => {
      this.runSingleCheck().catch(() => {})
    }, intervalMs)
  }

  public stopMonitoring(): void {
    this.isMonitoring = false
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.currentTelemetry.pingMs = null
    this.currentTelemetry.jitterMs = null
    this.currentTelemetry.healthScore = 100
    LogService.getInstance().addLog('AI Sentinel: фоновый мониторинг телеметрии остановлен', 'info', undefined, 'system')
    this.broadcastTelemetry()
  }

  public async runSingleCheck(): Promise<LiveTelemetry> {
    const isVpnActive = await SingBoxService.getInstance().isRunning()

    if (!isVpnActive) {
      this.currentTelemetry.pingMs = null
      this.currentTelemetry.jitterMs = null
      this.currentTelemetry.packetLossPct = 0
      this.currentTelemetry.healthScore = 100
      this.currentTelemetry.lastUpdated = new Date().toISOString()
      this.broadcastTelemetry()
      return this.currentTelemetry
    }

    // 1. Measure Latency
    try {
      const netRes = await NetworkService.getInstance().testLatency()
      const currentPing = netRes.latencyMs

      if (currentPing !== null) {
        if (this.previousPing !== null) {
          this.currentTelemetry.jitterMs = Math.abs(currentPing - this.previousPing)
        } else {
          this.currentTelemetry.jitterMs = 0
        }
        this.previousPing = currentPing
        this.currentTelemetry.pingMs = currentPing

        // Add to history (max 30 data points)
        this.currentTelemetry.rttHistory.push(currentPing)
        if (this.currentTelemetry.rttHistory.length > 30) {
          this.currentTelemetry.rttHistory.shift()
        }
        this.currentTelemetry.packetLossPct = 0
      } else {
        this.currentTelemetry.packetLossPct = Math.min(100, this.currentTelemetry.packetLossPct + 10)
      }
    } catch {
      this.currentTelemetry.packetLossPct = Math.min(100, this.currentTelemetry.packetLossPct + 20)
    }

    // 2. Canary probes (lightweight parallel HEAD checks)
    const canaryMap: Record<string, boolean> = {}
    for (const target of CANARY_TARGETS) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000)
        const res = await fetch(target.url, {
          method: 'HEAD',
          signal: controller.signal
        }).catch(() => null)
        clearTimeout(timeoutId)
        canaryMap[target.key] = res ? res.ok || res.status < 500 : false
      } catch {
        canaryMap[target.key] = false
      }
    }
    this.currentTelemetry.canaryResults = canaryMap

    // 3. Recompute Health Score
    this.recomputeHealthScore()
    this.currentTelemetry.lastUpdated = new Date().toISOString()
    this.broadcastTelemetry()

    return this.currentTelemetry
  }

  private recomputeHealthScore(): void {
    let score = 100

    const ping = this.currentTelemetry.pingMs
    const jitter = this.currentTelemetry.jitterMs
    const loss = this.currentTelemetry.packetLossPct
    const anomalies = this.currentTelemetry.activeDpiAnomalies.length

    if (ping !== null) {
      if (ping > 300) score -= 30
      else if (ping > 180) score -= 15
      else if (ping > 100) score -= 5
    }

    if (jitter !== null) {
      if (jitter > 50) score -= 15
      else if (jitter > 20) score -= 8
    }

    score -= Math.round((loss / 100) * 40)
    score -= anomalies * 15

    // Check failed canaries
    const failedCanaries = Object.values(this.currentTelemetry.canaryResults).filter((v) => !v).length
    score -= failedCanaries * 10

    this.currentTelemetry.healthScore = Math.max(0, Math.min(100, score))
  }

  private broadcastTelemetry(): void {
    const win = WindowManager.getInstance().getWindow()
    if (win && !win.isDestroyed()) {
      try {
        win.webContents.send(IPC_CHANNELS.AI_TELEMETRY_UPDATED, this.currentTelemetry)
      } catch {}
    }
  }
}
