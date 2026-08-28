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
        const targetRealZone = settings.realZone || 'Tomsk Standard Time'

        logService.addLog('Санация при старте: проверка сетевого стека Windows и часового пояса...', 'info')
        await residentService.restoreRegularNetwork()

        const currentTz = await residentService.getSystemTimezone()
        if (currentTz && currentTz !== 'Unknown' && currentTz !== targetRealZone) {
          logService.addLog(`Восстановление реального часового пояса (${currentTz} → ${targetRealZone})...`, 'info')
          await residentService.setSystemTimezone(targetRealZone)
        }

        // Restore lfsvc in case of past unclean termination
        await residentService.startLfsvc()
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      logService.addLog(`Предупреждение при проверке сетевого стека: ${msg}`, 'warn')
    }
  }
}
