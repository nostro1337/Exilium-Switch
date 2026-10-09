import net from 'node:net'
import fs from 'node:fs'
import path from 'node:path'
import { execFileAsync } from '../utils/exec'
import { DEFAULT_PING_TARGET } from '../core/constants'
import { LogService } from './log.service'

export class NetworkService {
  private static instance: NetworkService
  private physicalAdaptersCache: string[] | null = null
  private lastAdapterScan = 0
  private readonly adapterCacheTtl = 60000 // 1 minute
  private lastTunnelStartTime = 0

  private constructor() {}

  public static getInstance(): NetworkService {
    if (!NetworkService.instance) {
      NetworkService.instance = new NetworkService()
    }
    return NetworkService.instance
  }

  public notifyTunnelStarted(timestamp = Date.now()): void {
    this.lastTunnelStartTime = timestamp
  }

  public notifyTunnelStopped(): void {
    this.lastTunnelStartTime = 0
  }

  public getLastTunnelStartTime(): number {
    return this.lastTunnelStartTime
  }

  public async getPhysicalAdapters(forceRefresh = false): Promise<string[]> {
    const now = Date.now()
    if (!forceRefresh && this.physicalAdaptersCache && (now - this.lastAdapterScan < this.adapterCacheTtl)) {
      return this.physicalAdaptersCache
    }

    const virtualPattern = /sing-?box|wintun|tap|virtual|hyper-v|vethernet|loopback/i

    // 1. Ultra-fast detection via netsh interface show interface (~15ms)
    try {
      const { stdout } = await execFileAsync('netsh.exe', ['interface', 'show', 'interface'])
      const lines = stdout.split(/\r?\n/)
      const names: string[] = []

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('---') || trimmed.toLowerCase().includes('interface name') || trimmed.toLowerCase().includes('имя интерфейса')) {
          continue
        }
        let state = ''
        let name = ''
        const parts = trimmed.split(/\s{2,}/)
        if (parts.length >= 4) {
          state = parts[1].trim().toLowerCase()
          name = parts.slice(3).join('  ').trim()
        } else {
          const match = trimmed.match(/^\S+\s+(\S+)\s+\S+\s+(.+)$/)
          if (match) {
            state = match[1].toLowerCase()
            name = match[2].trim()
          }
        }
        if (name && state) {
          const isConnected = state === 'connected' || state === 'подключен' || state === 'подключено' || state === 'up'
          if (isConnected && !virtualPattern.test(name)) {
            names.push(name)
          }
        }
      }

      if (names.length > 0) {
        this.physicalAdaptersCache = names
        this.lastAdapterScan = now
        return names
      }
    } catch {}

    // 2. Fallback via PowerShell Get-NetAdapter
    try {
      const { stdout } = await execFileAsync('powershell.exe', [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        '(Get-NetAdapter -Physical | Where-Object Status -eq Up).Name'
      ])
      const names = stdout.trim().split(/\r?\n/).map(s => s.trim()).filter(Boolean)
      if (names.length > 0) {
        this.physicalAdaptersCache = names
        this.lastAdapterScan = now
        return names
      }

      const fallback = await execFileAsync('powershell.exe', [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        '(Get-NetAdapter | Where-Object Status -eq Up | Where-Object InterfaceDescription -notmatch "sing-box|Wintun|TAP|Virtual|Hyper-V").Name'
      ])
      const fallbackNames = fallback.stdout.trim().split(/\r?\n/).map(s => s.trim()).filter(Boolean)
      const result = fallbackNames.length > 0 ? fallbackNames : ['Ethernet', 'Ethernet 2', 'Wi-Fi']
      this.physicalAdaptersCache = result
      this.lastAdapterScan = now
      return result
    } catch {
      return ['Ethernet', 'Ethernet 2', 'Wi-Fi']
    }
  }

  public async flushDns(): Promise<void> {
    if (process.env.VITEST || process.env.NODE_ENV === 'test') {
      return
    }
    try {
      await execFileAsync('ipconfig.exe', ['/flushdns'])
    } catch {}
    try {
      await execFileAsync('nbtstat.exe', ['-R'])
    } catch {}
  }

  public async testLatency(targetHost = DEFAULT_PING_TARGET, targetPort = 443): Promise<{ latencyMs: number | null; error?: string }> {
    // 0. Ensure a brief stabilization delay (500-600ms) before the first latency test ping after tunnel start
    if (this.lastTunnelStartTime > 0) {
      const startTime = this.lastTunnelStartTime
      this.lastTunnelStartTime = 0
      const elapsed = Date.now() - startTime
      const convergenceDelay = 550
      if (elapsed < convergenceDelay) {
        await new Promise(resolve => setTimeout(resolve, convergenceDelay - elapsed))
      }
    }

    // 1. Try multi-sample physical ICMP ping via Windows ping.exe (2 packets, 1000ms timeout)
    try {
      const { stdout } = await execFileAsync('ping.exe', ['-n', '2', '-w', '1000', targetHost], { timeout: 2500 })
      
      // Look for Windows summary line first (Average = XXms / Среднее = XX мсек)
      const avgMatch = stdout.match(/(?:Average|Среднее)\s*=\s*(\d+)\s*(?:ms|мс)?/i)
      if (avgMatch && avgMatch[1]) {
        const avgVal = parseInt(avgMatch[1], 10)
        if (!isNaN(avgVal) && avgVal >= 1) {
          return { latencyMs: avgVal }
        }
      }

      // If summary is missing, parse individual reply lines
      const matches = Array.from(stdout.matchAll(/(?:time|время)[=<](\d+)\s*(?:ms|мс)?/gi))
      if (matches.length > 0) {
        const values = matches
          .map(m => parseInt(m[1], 10))
          .filter(v => !isNaN(v) && v >= 1)
        if (values.length > 0) {
          const minPing = Math.min(...values)
          return { latencyMs: minPing }
        }
      }
    } catch {}

    // 2. Fallback to raw TCP socket handshake measurement
    const sampleTcpLatency = (): Promise<number> => {
      return new Promise<number>((resolve, reject) => {
        const startTime = Date.now()
        const socket = net.createConnection({ host: targetHost, port: targetPort, timeout: 1500 }, () => {
          const latency = Date.now() - startTime
          socket.destroy()
          resolve(latency)
        })

        socket.on('timeout', () => {
          socket.destroy()
          reject(new Error('Таймаут соединения'))
        })

        socket.on('error', (err) => {
          socket.destroy()
          reject(err)
        })
      })
    }

    try {
      const tcpLatency = await sampleTcpLatency()
      return { latencyMs: Math.max(3, tcpLatency) }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return { latencyMs: null, error: message }
    }
  }
}

