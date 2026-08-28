import { SingBoxService } from './singbox.service'
import { ResidentShieldService } from './resident-shield.service'
import { LogService } from './log.service'
import { SettingsService } from './settings.service'

export class FailsafeService {
  private static instance: FailsafeService

  private constructor() {}

  public static getInstance(): FailsafeService {
    if (!FailsafeService.instance) {
      FailsafeService.instance = new FailsafeService()
    }
    return FailsafeService.instance
  }

  /**
   * Run on application launch to detect unclean shutdowns and repair network stack if necessary
   */
  public async runStartupSanitation(): Promise<void> {
    const logService = LogService.getInstance()
    const singboxService = SingBoxService.getInstance()
    const residentService = ResidentShieldService.getInstance()
    const settingsService = SettingsService.getInstance()

    try {
      const isRunning = await singboxService.isRunning()
      if (!isRunning) {
        const settings = settingsService.loadSettings()
        // If sing-box is not running, ensure physical network is in clean state
        logService.addLog('Санация при старте: проверка чистоты сетевого стека Windows...', 'info')
        await residentService.restoreRegularNetwork()

        const currentTz = await residentService.getSystemTimezone()
        if (currentTz === settings.fakeZone && settings.realZone) {
          logService.addLog(`Восстановление исходной часовой зоны после предыдущей сессии → ${settings.realZone}`, 'info')
          await residentService.setSystemTimezone(settings.realZone)
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      logService.addLog(`Предупреждение при проверке сетевого стека: ${msg}`, 'warn')
    }
  }
}
