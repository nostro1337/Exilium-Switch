import { execFileAsync, execFileSyncSafe } from '../utils/exec'
import { LogService } from './log.service'
import { SettingsService } from './settings.service'
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

export class ZapretService {
  private static instance: ZapretService
  private wasRunningBeforeVpn = false
  private detectedScriptPath: string | null = null

  private constructor() {}

  public static getInstance(): ZapretService {
    if (!ZapretService.instance) {
      ZapretService.instance = new ZapretService()
    }
    return ZapretService.instance
  }

  /**
   * Check if winws.exe or goodbyedpi.exe is actively running
   */
  public async isZapretRunning(): Promise<boolean> {
    try {
      const { stdout } = await execFileAsync('tasklist.exe', [
        '/FI', 'IMAGENAME eq winws.exe',
        '/FO', 'CSV',
        '/NH'
      ], { timeout: 3000 })
      if (stdout.toLowerCase().includes('winws.exe')) return true

      const { stdout: gbdOut } = await execFileAsync('tasklist.exe', [
        '/FI', 'IMAGENAME eq goodbyedpi.exe',
        '/FO', 'CSV',
        '/NH'
      ], { timeout: 3000 })
      return gbdOut.toLowerCase().includes('goodbyedpi.exe')
    } catch {
      return false
    }
  }

  /**
   * Inspect running process tree to find the exact .bat file that launched winws.exe
   */
  public async detectRunningZapretCommand(): Promise<string | null> {
    try {
      // Query winws process to get its ParentProcessId and ExecutablePath
      const { stdout } = await execFileAsync('powershell.exe', [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        `
        $p = Get-CimInstance Win32_Process -Filter "Name = 'winws.exe'" | Select-Object -First 1
        if ($p) {
          if ($p.ParentProcessId) {
            $parent = Get-CimInstance Win32_Process -Filter "ProcessId = $($p.ParentProcessId)"
            if ($parent -and $parent.CommandLine) {
              Write-Output "PARENT_CMD:$($parent.CommandLine)"
            }
          }
          if ($p.ExecutablePath) {
            Write-Output "EXE_PATH:$($p.ExecutablePath)"
          }
        }
        `
      ], { timeout: 3500 })

      if (stdout) {
        const lines = stdout.split('\n').map(l => l.trim())
        for (const line of lines) {
          if (line.startsWith('PARENT_CMD:')) {
            const cmd = line.replace('PARENT_CMD:', '').trim()
            // Match any .bat in the command line
            const batMatch = cmd.match(/["']?([^"']+\.bat)["']?/i)
            if (batMatch && batMatch[1] && fs.existsSync(batMatch[1])) {
              return batMatch[1]
            }
          }
          if (line.startsWith('EXE_PATH:')) {
            const exePath = line.replace('EXE_PATH:', '').trim()
            if (exePath && fs.existsSync(exePath)) {
              // Usually in zapret/bin/winws.exe -> check zapret/ directory
              const binDir = path.dirname(exePath)
              const rootDir = path.dirname(binDir)
              const foundInRoot = this.scanDirForZapretBat(rootDir)
              if (foundInRoot) return foundInRoot
            }
          }
        }
      }
    } catch {}

    return null
  }

  /**
   * Helper to scan a directory for zapret bat files
   */
  private scanDirForZapretBat(dir: string): string | null {
    try {
      if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return null
      const files = fs.readdirSync(dir)

      // Priority list of common bat files
      const priorities = [
        'general (ALT11).bat',
        'general (ALT10).bat',
        'general (ALT9).bat',
        'general (ALT8).bat',
        'general (ALT7).bat',
        'general (ALT6).bat',
        'general (ALT5).bat',
        'general (ALT4).bat',
        'general (ALT3).bat',
        'general (ALT2).bat',
        'general (ALT).bat',
        'general.bat',
        'discord.bat',
        'youtube.bat',
        'service.bat'
      ]

      for (const p of priorities) {
        const full = path.join(dir, p)
        if (fs.existsSync(full)) return full
      }

      // Check any .bat starting with general or containing discord/youtube/zapret
      const anyBat = files.find(f =>
        f.toLowerCase().endsWith('.bat') &&
        (f.toLowerCase().startsWith('general') || f.toLowerCase().includes('discord') || f.toLowerCase().includes('youtube'))
      )
      if (anyBat) return path.join(dir, anyBat)

      // Any .bat at all in the directory
      const anyFirstBat = files.find(f => f.toLowerCase().endsWith('.bat') && !f.toLowerCase().includes('uninstall'))
      if (anyFirstBat) return path.join(dir, anyFirstBat)
    } catch {}

    return null
  }

  /**
   * Locate the zapret batch script on Desktop, Downloads, User dir, or root drives
   */
  public findZapretScript(): string | null {
    const settings = SettingsService.getInstance().loadSettings()
    if (settings.zapretScriptPath && fs.existsSync(settings.zapretScriptPath)) {
      return settings.zapretScriptPath
    }

    if (this.detectedScriptPath && fs.existsSync(this.detectedScriptPath)) {
      return this.detectedScriptPath
    }

    const userProfile = process.env.USERPROFILE || 'C:\\Users\\' + (process.env.USERNAME || 'User')
    const searchRoots = [
      path.join(userProfile, 'Desktop'),
      path.join(userProfile, 'Downloads'),
      path.join(userProfile, 'Documents'),
      userProfile,
      'C:\\zapret',
      'C:\\tools\\zapret',
      'D:\\zapret',
      'E:\\zapret'
    ]

    for (const root of searchRoots) {
      try {
        if (!fs.existsSync(root)) continue

        // If root itself is a zapret folder
        const directBat = this.scanDirForZapretBat(root)
        if (directBat) return directBat

        // Check immediate subdirectories (e.g. ~/Desktop/zapret-discord-youtube-1.10.1)
        const entries = fs.readdirSync(root)
        for (const entry of entries) {
          if (entry.toLowerCase().includes('zapret') || entry.toLowerCase().includes('goodbyedpi') || entry.toLowerCase().includes('byedpi')) {
            const folder = path.join(root, entry)
            const found = this.scanDirForZapretBat(folder)
            if (found) return found
          }
        }
      } catch {}
    }

    return null
  }

  /**
   * Pause winws.exe if running before VPN connects to eliminate packet corruption
   */
  public async pauseZapretIfRunning(): Promise<boolean> {
    const settingsService = SettingsService.getInstance()
    const settings = settingsService.loadSettings()
    const logService = LogService.getInstance()

    if (settings.coexistWithZapret === false) {
      return false
    }

    const isRunning = await this.isZapretRunning()
    if (!isRunning) {
      this.wasRunningBeforeVpn = false
      return false
    }

    this.wasRunningBeforeVpn = true

    // Detect exact running script from process tree before killing
    const runningScript = await this.detectRunningZapretCommand()
    const scriptPath = runningScript || this.findZapretScript()
    if (scriptPath) {
      this.detectedScriptPath = scriptPath
    }

    settingsService.saveSettings({
      wasZapretActive: true,
      ...(scriptPath ? { zapretScriptPath: scriptPath } : {})
    })

    const scriptLabel = scriptPath ? `(${path.basename(scriptPath)})` : ''
    logService.addLog(`[Zapret] Обнаружен активный zapret ${scriptLabel}. Приостановка на время сессии VPN...`, 'info', 'zapret')

    try {
      await execFileAsync('taskkill.exe', ['/F', '/IM', 'winws.exe', '/T'], { timeout: 4000 })
    } catch {}

    try {
      await execFileAsync('taskkill.exe', ['/F', '/IM', 'goodbyedpi.exe', '/T'], { timeout: 4000 })
    } catch {}

    logService.addLog('✓ Zapret временно выключен. Трафик через VLESS направлен в чистом виде.', 'success', 'zapret')
    return true
  }

  /**
   * Resume zapret when VPN is disconnected
   */
  public async resumeZapretIfPaused(): Promise<boolean> {
    const settingsService = SettingsService.getInstance()
    const settings = settingsService.loadSettings()
    const logService = LogService.getInstance()

    if (settings.coexistWithZapret === false) {
      return false
    }

    if (!this.wasRunningBeforeVpn && !settings.wasZapretActive) {
      return false
    }

    this.wasRunningBeforeVpn = false
    settingsService.saveSettings({ wasZapretActive: false })

    const scriptPath = this.findZapretScript()
    if (!scriptPath || !fs.existsSync(scriptPath)) {
      logService.addLog('Zapret: исполняемый .bat скрипт не найден для авто-перезапуска.', 'warn')
      return false
    }

    logService.addLog(`Возобновление работы zapret (${path.basename(scriptPath)})...`, 'info')

    try {
      const scriptDir = path.dirname(scriptPath)
      const child = spawn('cmd.exe', ['/c', 'start', '""', '/min', path.basename(scriptPath)], {
        cwd: scriptDir,
        detached: true,
        stdio: 'ignore',
        windowsHide: false
      })
      child.unref()

      logService.addLog('✓ Zapret успешно перезапущен в фоновом режиме.', 'success')
      return true
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      logService.addLog(`Не удалось перезапустить zapret: ${msg}`, 'warn')
      return false
    }
  }

  /**
   * Instant emergency resumption on crash or exit
   */
  public syncEmergencyResume(): void {
    try {
      const settings = SettingsService.getInstance().loadSettings()
      if (settings.coexistWithZapret === false || (!this.wasRunningBeforeVpn && !settings.wasZapretActive)) {
        return
      }

      const scriptPath = this.findZapretScript()
      if (scriptPath && fs.existsSync(scriptPath)) {
        const scriptDir = path.dirname(scriptPath)
        execFileSyncSafe('cmd.exe', ['/c', 'start', '""', '/min', path.basename(scriptPath)], 3000)
      }
    } catch {}
  }
}
