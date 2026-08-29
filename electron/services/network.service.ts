import net from 'node:net'
import { execFileAsync } from '../utils/exec'
import { DEFAULT_PING_TARGET } from '../core/constants'

export class NetworkService {
  private static instance: NetworkService
  private physicalAdaptersCache: string[] | null = null
  private lastAdapterScan = 0
  private readonly adapterCacheTtl = 60000 // 1 minute

  private constructor() {}

  public static getInstance(): NetworkService {
    if (!NetworkService.instance) {
      NetworkService.instance = new NetworkService()
    }
    return NetworkService.instance
  }

  public async getPhysicalAdapters(forceRefresh = false): Promise<string[]> {
    const now = Date.now()
    if (!forceRefresh && this.physicalAdaptersCache && (now - this.lastAdapterScan < this.adapterCacheTtl)) {
      return this.physicalAdaptersCache
    }

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
    try {
      await execFileAsync('ipconfig.exe', ['/flushdns'])
    } catch {}
    try {
      await execFileAsync('powershell.exe', [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        'Clear-DnsClientCache -ErrorAction SilentlyContinue'
      ])
    } catch {}
    try {
      await execFileAsync('nbtstat.exe', ['-R'])
    } catch {}
  }

  public async testLatency(targetHost = DEFAULT_PING_TARGET, targetPort = 443): Promise<{ latencyMs: number | null; error?: string }> {
    const sampleLatency = (): Promise<number> => {
      return new Promise<number>((resolve, reject) => {
        const startTime = Date.now()
        const socket = net.createConnection({ host: targetHost, port: targetPort, timeout: 2500 }, () => {
          const latency = Date.now() - startTime
          socket.end()
          resolve(latency)
        })

        socket.on('timeout', () => {
          socket.destroy()
          reject(new Error('Таймаут соединения'))
        })

        socket.on('error', (err) => {
          reject(err)
        })
      })
    }

    try {
      const first = await sampleLatency()
      // Brief pause between samples
      await new Promise(r => setTimeout(r, 60))
      const second = await sampleLatency()
      const minLatency = Math.min(first, second)
      return { latencyMs: minLatency }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return { latencyMs: null, error: message }
    }
  }
}
