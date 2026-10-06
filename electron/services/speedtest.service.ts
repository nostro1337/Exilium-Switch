import { WindowManager } from '../core/window-manager'
import { NetworkService } from './network.service'
import { LogService } from './log.service'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import type { SpeedtestProgress, SpeedtestResult } from '../../shared/types/speedtest.types'

const DOWNLOAD_ENDPOINT = 'https://speed.cloudflare.com/__down?bytes=10000000'
const UPLOAD_ENDPOINT = 'https://speed.cloudflare.com/__up'

export class SpeedtestService {
  private static instance: SpeedtestService | null = null
  private abortController: AbortController | null = null
  private isRunning = false
  private lastResult: SpeedtestResult | null = null
  private lastBroadcastTime = 0

  private constructor() {}

  public static getInstance(): SpeedtestService {
    if (!SpeedtestService.instance) {
      SpeedtestService.instance = new SpeedtestService()
    }
    return SpeedtestService.instance
  }

  public getLastResult(): SpeedtestResult | null {
    return this.lastResult
  }

  public cancel(): void {
    if (this.isRunning && this.abortController) {
      this.abortController.abort()
      this.isRunning = false
      LogService.getInstance().addLog('Замер скорости отменен пользователем', 'info', undefined, 'traffic')
      this.broadcastProgress({
        stage: 'idle',
        progressPct: 0,
        currentSpeedMbps: 0,
        pingMs: null,
        downloadMbps: null,
        uploadMbps: null
      })
    }
  }

  public async runSpeedtest(): Promise<SpeedtestResult> {
    if (this.isRunning) {
      if (this.lastResult) return this.lastResult
      throw new Error('Speedtest уже запущен')
    }

    this.isRunning = true
    this.abortController = new AbortController()
    const signal = this.abortController.signal
    const logService = LogService.getInstance()

    logService.addLog('Запуск комплексного замера скорости канала (Ping, Download, Upload)...', 'info', undefined, 'traffic')

    let pingMs: number | null = null
    let downloadMbps: number | null = null
    let uploadMbps: number | null = null

    try {
      // 1. Stage: Ping
      this.broadcastProgress({
        stage: 'ping',
        progressPct: 15,
        currentSpeedMbps: 0,
        pingMs: null,
        downloadMbps: null,
        uploadMbps: null
      })

      const netRes = await NetworkService.getInstance().testLatency()
      pingMs = netRes.latencyMs
      logService.addLog(`Speedtest: Ping зафиксирован на уровне ${pingMs !== null ? pingMs + ' ms' : '—'}`, 'info', undefined, 'traffic')

      if (signal.aborted) throw new Error('Замер отменен')

      // 2. Stage: Download Speed
      this.broadcastProgress({
        stage: 'download',
        progressPct: 25,
        currentSpeedMbps: 0,
        pingMs,
        downloadMbps: null,
        uploadMbps: null
      })

      downloadMbps = await this.measureDownload(signal, (currentSpeed, pct) => {
        this.broadcastProgress({
          stage: 'download',
          progressPct: 25 + Math.round(pct * 0.4),
          currentSpeedMbps: currentSpeed,
          pingMs,
          downloadMbps: currentSpeed,
          uploadMbps: null
        })
      })

      logService.addLog(`Speedtest: Входящая скорость: ${downloadMbps} Mbps`, 'info', undefined, 'traffic')

      if (signal.aborted) throw new Error('Замер отменен')

      // 3. Stage: Upload Speed
      this.broadcastProgress({
        stage: 'upload',
        progressPct: 65,
        currentSpeedMbps: 0,
        pingMs,
        downloadMbps,
        uploadMbps: null
      })

      uploadMbps = await this.measureUpload(signal, (currentSpeed, pct) => {
        this.broadcastProgress({
          stage: 'upload',
          progressPct: 65 + Math.round(pct * 0.35),
          currentSpeedMbps: currentSpeed,
          pingMs,
          downloadMbps,
          uploadMbps: currentSpeed
        })
      })

      logService.addLog(`Speedtest: Исходящая скорость: ${uploadMbps} Mbps`, 'info', undefined, 'traffic')

      // 4. Completed
      const result: SpeedtestResult = {
        pingMs,
        downloadMbps,
        uploadMbps,
        timestamp: new Date().toISOString()
      }
      this.lastResult = result

      this.broadcastProgress({
        stage: 'completed',
        progressPct: 100,
        currentSpeedMbps: 0,
        pingMs,
        downloadMbps,
        uploadMbps
      }, true)

      logService.addLog(`✓ Speedtest завершен: Ping ${pingMs ?? 0}ms | Вх: ${downloadMbps} Mbps | Исх: ${uploadMbps} Mbps`, 'success', undefined, 'traffic')
      return result
    } catch (err: any) {
      const errorMsg = err?.message || 'Ошибка тестирования скорости'
      if (!signal.aborted) {
        logService.addLog(`Speedtest ошибка: ${errorMsg}`, 'warn', undefined, 'traffic')
      }
      this.broadcastProgress({
        stage: 'error',
        progressPct: 0,
        currentSpeedMbps: 0,
        pingMs,
        downloadMbps,
        uploadMbps,
        error: errorMsg
      }, true)
      throw err
    } finally {
      this.isRunning = false
      this.abortController = null
    }
  }

  private async measureDownload(
    signal: AbortSignal,
    onProgress: (currentMbps: number, pct: number) => void
  ): Promise<number> {
    const startTime = Date.now()
    let totalBytes = 0
    const targetBytes = 10000000 // 10MB

    try {
      const response = await fetch(DOWNLOAD_ENDPOINT, { signal })
      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body.getReader()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) {
          totalBytes += value.length
          const elapsedSec = Math.max(0.05, (Date.now() - startTime) / 1000)
          const currentMbps = Math.round(((totalBytes * 8) / (elapsedSec * 1000000)) * 10) / 10
          const pct = Math.min(1, totalBytes / targetBytes)
          onProgress(currentMbps, pct)
        }
      }

      const totalElapsedSec = Math.max(0.05, (Date.now() - startTime) / 1000)
      const finalMbps = Math.round(((totalBytes * 8) / (totalElapsedSec * 1000000)) * 10) / 10
      return Math.max(0.1, finalMbps)
    } catch (err: any) {
      if (signal.aborted) throw err
      if (totalBytes > 100000) {
        const elapsedSec = Math.max(0.1, (Date.now() - startTime) / 1000)
        return Math.round(((totalBytes * 8) / (elapsedSec * 1000000)) * 10) / 10
      }
      throw err
    }
  }

  private async measureUpload(
    signal: AbortSignal,
    onProgress: (currentMbps: number, pct: number) => void
  ): Promise<number> {
    const uploadBytes = 2500000 // 2.5MB payload
    const buffer = Buffer.alloc(uploadBytes, 0x61)
    const startTime = Date.now()

    try {
      onProgress(0, 0.1)
      const response = await fetch(UPLOAD_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream'
        },
        body: buffer,
        signal
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const totalElapsedSec = Math.max(0.05, (Date.now() - startTime) / 1000)
      const finalMbps = Math.round(((uploadBytes * 8) / (totalElapsedSec * 1000000)) * 10) / 10
      onProgress(finalMbps, 1)
      return Math.max(0.1, finalMbps)
    } catch (err: any) {
      if (signal.aborted) throw err
      throw err
    }
  }

  private broadcastProgress(progress: SpeedtestProgress, force = false): void {
    const now = Date.now()
    if (!force && progress.stage !== 'idle' && progress.stage !== 'completed' && progress.stage !== 'error' && (now - this.lastBroadcastTime < 100)) {
      return
    }
    this.lastBroadcastTime = now
    WindowManager.getInstance().broadcast(IPC_CHANNELS.SPEEDTEST_PROGRESS, progress)
  }
}
