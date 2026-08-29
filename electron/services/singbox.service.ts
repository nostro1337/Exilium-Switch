import { app } from 'electron'
import { spawn, type ChildProcess } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileAsync } from '../utils/exec'
import { LogService } from './log.service'
import { ProfileService } from './profile.service'
import { SettingsService } from './settings.service'
import { ResidentShieldService } from './resident-shield.service'
import { ZapretService } from './zapret.service'
import { NetworkService } from './network.service'
import { NotificationService } from './notification.service'
import { StateMachine } from '../core/state-machine'
import type { VpnStatus } from '../../shared/types'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export class SingBoxService {
  private static instance: SingBoxService
  private childProcess: ChildProcess | null = null
  private startTime: number | null = null

  private constructor() {}

  public static getInstance(): SingBoxService {
    if (!SingBoxService.instance) {
      SingBoxService.instance = new SingBoxService()
    }
    return SingBoxService.instance
  }

  public getBinaryPath(): { exePath: string; dir: string } | null {
    const appPath = (app && typeof app.getAppPath === 'function') ? app.getAppPath() : process.cwd()
    const resPath = process.resourcesPath || process.cwd()

    const candidates = [
      'C:\\sing-box',
      path.join(resPath, 'sing-box'),
      path.join(appPath, 'sing-box'),
      path.join(__dirname, '..', '..', 'sing-box'),
      path.resolve('sing-box')
    ]

    for (const candidate of candidates) {
      const exe = path.join(candidate, 'sing-box.exe')
      if (fs.existsSync(exe)) {
        return { exePath: exe, dir: candidate }
      }
    }

    LogService.getInstance().addLog('sing-box.exe НЕ найден в директориях поиска!', 'error')
    return null
  }

  /**
   * Ultra-fast PID-based process check (0.01ms, 0% CPU) with tasklist fallback
   */
  public async isRunning(): Promise<boolean> {
    if (this.childProcess && this.childProcess.pid) {
      try {
        // Signal 0 tests for process existence in OS without killing it
        process.kill(this.childProcess.pid, 0)
        return true
      } catch {
        this.childProcess = null
      }
    }

    try {
      const { stdout } = await execFileAsync('tasklist.exe', [
        '/FI', 'IMAGENAME eq sing-box.exe',
        '/FO', 'CSV',
        '/NH'
      ])
      return stdout.toLowerCase().includes('sing-box.exe')
    } catch {
      return false
    }
  }

  public async start(): Promise<boolean> {
    const logService = LogService.getInstance()
    const profileService = ProfileService.getInstance()
    const activeProfile = profileService.getActiveProfile()

    if (!activeProfile || !fs.existsSync(activeProfile.path)) {
      logService.addLog('Ошибка старта: активный профиль отсутствует или файл не найден.', 'error')
      return false
    }

    const binary = this.getBinaryPath()
    if (!binary) {
      logService.addLog('sing-box.exe не найден!', 'error')
      return false
    }

    // Stop existing instance if any
    const alreadyRunning = await this.isRunning()
    if (alreadyRunning) {
      await this.stop()
      await new Promise(r => setTimeout(r, 500))
    }

    return new Promise((resolve) => {
      try {
        logService.addLog(`Запуск ядра sing-box [${activeProfile.name}]...`, 'info')

        const child = spawn(binary.exePath, ['run', '-c', activeProfile.path], {
          cwd: binary.dir,
          windowsHide: true,
          stdio: ['ignore', 'pipe', 'pipe']
        })

        child.stdout?.on('data', (data: Buffer) => {
          data.toString().split('\n').forEach(line => {
            if (line.trim()) logService.parseSingBoxLine(line)
          })
        })

        child.stderr?.on('data', (data: Buffer) => {
          data.toString().split('\n').forEach(line => {
            if (line.trim()) logService.parseSingBoxLine(line)
          })
        })

        child.on('error', (err) => {
          logService.addLog(`Ошибка процесса sing-box: ${err.message}`, 'error')
          NotificationService.getInstance().showNotification('Exilium Switch', `Ошибка запуска sing-box: ${err.message}`, true)
          this.childProcess = null
          resolve(false)
        })

        child.on('exit', (code) => {
          if (code !== null && code !== 0) {
            logService.addLog(`Процесс sing-box завершился с кодом ${code}`, 'error')
            NotificationService.getInstance().showNotification('Exilium Switch', 'Процесс ядра sing-box был неожиданно прерван.', true)
          }
          this.childProcess = null
          this.startTime = null
        })

        child.unref()
        this.childProcess = child

        // Verify startup after 1.2s
        setTimeout(async () => {
          const alive = await this.isRunning()
          if (alive) {
            this.startTime = Date.now()
            logService.addLog(`sing-box активен (PID: ${child.pid}, Профиль: "${activeProfile.name}").`, 'success')
            await NetworkService.getInstance().flushDns()
            resolve(true)
          } else {
            logService.addLog('sing-box завершился сразу после старта. Проверьте JSON-конфиг.', 'error')
            this.childProcess = null
            this.startTime = null
            resolve(false)
          }
        }, 1200)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        logService.addLog(`Исключение при старте sing-box: ${msg}`, 'error')
        resolve(false)
      }
    })
  }

  public async stop(): Promise<boolean> {
    const logService = LogService.getInstance()
    logService.addLog('Остановка процесса sing-box...', 'info')

    if (this.childProcess && !this.childProcess.killed) {
      try {
        this.childProcess.kill('SIGTERM')
      } catch {}
    }

    try {
      await execFileAsync('taskkill.exe', ['/F', '/IM', 'sing-box.exe', '/T'])
    } catch {}

    this.childProcess = null
    this.startTime = null
    await new Promise(r => setTimeout(r, 400))

    const stillRunning = await this.isRunning()
    if (stillRunning) {
      try {
        await execFileAsync('powershell.exe', [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          'Stop-Process -Name sing-box -Force -ErrorAction SilentlyContinue'
        ])
      } catch {}
    }

    const finalCheck = await this.isRunning()
    if (!finalCheck) {
      await NetworkService.getInstance().flushDns()
      logService.addLog('Процесс sing-box успешно остановлен.', 'info')
      return true
    } else {
      logService.addLog('Предупреждение: процесс sing-box не отвечает на сигналы остановки.', 'warn')
      return false
    }
  }

  public async toggle(enable?: boolean): Promise<{ success: boolean; isRunning: boolean; error?: string }> {
    const stateMachine = StateMachine.getInstance()
    const logService = LogService.getInstance()
    const settingsService = SettingsService.getInstance()
    const residentService = ResidentShieldService.getInstance()
    const profileService = ProfileService.getInstance()
    const notifService = NotificationService.getInstance()

    return stateMachine.withLock(async () => {
      const running = await this.isRunning()
      const shouldRun = enable !== undefined ? enable : !running

      if (shouldRun === running) {
        return { success: true, isRunning: running }
      }

      const settings = settingsService.loadSettings()
      const isOffice = settings.appMode === 'office'

      if (shouldRun) {
        stateMachine.setState('connecting')
        logService.addLog(`━━━ АКТИВАЦИЯ ТУННЕЛЯ [${isOffice ? 'РЕЖИМ ОФИС' : 'RESIDENT SHIELD (Amsterdam)'}] ━━━`, 'info')

        const activeProfile = profileService.getActiveProfile()
        if (!activeProfile) {
          stateMachine.setState('error')
          logService.addLog('Отсутствует профиль конфигурации! Добавьте .json конфиг перед запуском.', 'error')
          notifService.showNotification('Exilium Switch', 'Пожалуйста, добавьте .json конфигурацию перед запуском.')
          return { success: false, isRunning: false, error: 'Сначала добавьте .json конфиг' }
        }

        if (!isOffice) {
          await residentService.enableResidentMode(settings.fakeZone)
        } else {
          logService.addLog(`Запуск ядра sing-box в режиме «Офис» [${activeProfile.name}] (сетевые адаптеры ОС не изменяются)...`, 'info')
        }

        // Suspend zapret (winws) before tunnel start to ensure zero packet corruption for YouTube/Discord
        await ZapretService.getInstance().pauseZapretIfRunning()

        const started = await this.start()
        if (started) {
          stateMachine.setState('connected')
          if (isOffice) {
            logService.addLog('✓ OFFICE TUNNEL АКТИВЕН (Корпоративный сплит-туннель активен)', 'success')
            notifService.showNotification(
              'Exilium Switch — Режим Офис',
              `Офисный сплит-туннель включен [${activeProfile.name}]. Домен и локальная сеть защищены.`
            )
          } else {
            logService.addLog('✓ RESIDENT SHIELD АКТИВЕН (Amsterdam / NL Resident Masking Active)', 'success')
            notifService.showNotification(
              'Exilium Switch — Защита активна',
              `Resident Shield включен [${activeProfile.name}]. Часовой пояс, DNS и геолокация защищены.`
            )
          }
          return { success: true, isRunning: true }
        } else {
          stateMachine.setState('error')
          logService.addLog('✗ Ошибка старта sing-box — откат...', 'error')
          if (!isOffice) {
            await residentService.disableResidentMode(settings.realZone)
          }
          await ZapretService.getInstance().resumeZapretIfPaused()
          notifService.showNotification('Exilium Switch — Ошибка старта', 'Не удалось запустить sing-box.', true)
          return { success: false, isRunning: false, error: 'sing-box start failed' }
        }
      } else {
        stateMachine.setState('disconnecting')
        logService.addLog(`━━━ ДЕАКТИВАЦИЯ [${isOffice ? 'РЕЖИМ ОФИС' : 'RESIDENT SHIELD'}] ━━━`, 'info')
        await this.stop()

        if (!isOffice) {
          await residentService.disableResidentMode(settings.realZone)
        }

        // Resume zapret automatically if it was active before VPN
        await ZapretService.getInstance().resumeZapretIfPaused()

        stateMachine.setState('disconnected')
        logService.addLog('✓ Туннель успешно отключен.', 'info')
        notifService.showNotification('Exilium Switch', 'Туннель отключен. Защита деактивирована.')
        return { success: true, isRunning: false }
      }
    })
  }

  public async getStatus(): Promise<VpnStatus> {
    const running = await this.isRunning()
    const residentService = ResidentShieldService.getInstance()
    const currentZone = await residentService.getSystemTimezone()
    const lfsvcStatus = await residentService.getLfsvcStatus()
    const settings = SettingsService.getInstance().loadSettings()
    const activeProfile = ProfileService.getInstance().getActiveProfile()

    const uptimeSeconds = running && this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0

    return {
      isRunning: running,
      pid: this.childProcess?.pid,
      currentZone,
      lfsvcStatus,
      uptimeSeconds,
      startTime: this.startTime || undefined,
      activeProfileName: activeProfile?.name,
      appMode: settings.appMode
    }
  }
}
