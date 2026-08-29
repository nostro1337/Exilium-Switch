import { execFileAsync, execFileSyncSafe, setRegistryDword } from '../utils/exec'
import { NetworkService } from './network.service'
import { LogService } from './log.service'
import { ZapretService } from './zapret.service'
import { AMSTERDAM_TIMEZONE, FALLBACK_TIMEZONE } from '../core/constants'

export class ResidentShieldService {
  private static instance: ResidentShieldService
  private originalTimezone: string | null = null

  private constructor() {}

  public static getInstance(): ResidentShieldService {
    if (!ResidentShieldService.instance) {
      ResidentShieldService.instance = new ResidentShieldService()
    }
    return ResidentShieldService.instance
  }

  // ============================================================
  // Timezone Management (tzutil.exe / PowerShell fallback)
  // ============================================================
  public async getSystemTimezone(): Promise<string> {
    try {
      const { stdout } = await execFileAsync('tzutil.exe', ['/g'])
      return stdout.trim()
    } catch {
      return 'Unknown'
    }
  }

  public async setSystemTimezone(zoneId: string): Promise<boolean> {
    const logService = LogService.getInstance()
    try {
      await execFileAsync('tzutil.exe', ['/s', zoneId])
      logService.addLog(`Часовой пояс изменён → ${zoneId}`, 'success')
      return true
    } catch (err: unknown) {
      try {
        await execFileAsync('powershell.exe', [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          `Set-TimeZone -Id '${zoneId}'`
        ])
        logService.addLog(`Часовой пояс изменён (PS) → ${zoneId}`, 'success')
        return true
      } catch (psErr: unknown) {
        const msg = psErr instanceof Error ? psErr.message : (err instanceof Error ? err.message : String(err))
        logService.addLog(`Ошибка смены часового пояса: ${msg}`, 'warn')
        return false
      }
    }
  }

  // ============================================================
  // Geolocation Service (lfsvc) & Windows Location Privacy
  // ============================================================
  public async getLfsvcStatus(): Promise<'Running' | 'Stopped' | 'Stopping' | 'Starting' | 'Unknown'> {
    try {
      const { stdout } = await execFileAsync('sc.exe', ['query', 'lfsvc'])
      const upper = stdout.toUpperCase()
      if (upper.includes('RUNNING')) return 'Running'
      if (upper.includes('STOPPED')) return 'Stopped'
      if (upper.includes('STOP_PENDING')) return 'Stopping'
      if (upper.includes('START_PENDING')) return 'Starting'
      return 'Unknown'
    } catch {
      return 'Stopped'
    }
  }

  public async stopLfsvc(): Promise<boolean> {
    const logService = LogService.getInstance()
    logService.addLog('Блокировка службы геолокации Windows (lfsvc) и системного реестра...', 'info')
    try {
      // 1. Deny user-level and system-wide location consent
      try {
        await execFileAsync('reg.exe', [
          'add',
          'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\location',
          '/v', 'Value',
          '/t', 'REG_SZ',
          '/d', 'Deny',
          '/f'
        ])
      } catch {}

      try {
        await execFileAsync('reg.exe', [
          'add',
          'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\location',
          '/v', 'Value',
          '/t', 'REG_SZ',
          '/d', 'Deny',
          '/f'
        ])
      } catch {}

      // 2. Disable service startup type so Windows triggers cannot auto-restart lfsvc
      try {
        await execFileAsync('sc.exe', ['config', 'lfsvc', 'start=', 'disabled'])
      } catch {
        try {
          await execFileAsync('powershell.exe', [
            '-NoProfile',
            '-NonInteractive',
            '-Command',
            'Set-Service -Name lfsvc -StartupType Disabled -ErrorAction SilentlyContinue'
          ])
        } catch {}
      }

      // 3. Stop the running service
      try {
        await execFileAsync('sc.exe', ['stop', 'lfsvc'])
      } catch {
        try {
          await execFileAsync('powershell.exe', [
            '-NoProfile',
            '-NonInteractive',
            '-Command',
            'Stop-Service -Name lfsvc -Force -ErrorAction SilentlyContinue'
          ])
        } catch {}
      }

      logService.addLog('✓ Служба геолокации (lfsvc) отключена, автозапуск заблокирован, доступ к координатам закрыт.', 'success')
      return true
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      logService.addLog(`Не удалось остановить lfsvc: ${msg}`, 'warn')
      return false
    }
  }

  public async startLfsvc(): Promise<boolean> {
    const logService = LogService.getInstance()
    logService.addLog('Восстановление службы геолокации Windows (lfsvc)...', 'info')
    try {
      // 1. Restore location consent
      try {
        await execFileAsync('reg.exe', [
          'add',
          'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\location',
          '/v', 'Value',
          '/t', 'REG_SZ',
          '/d', 'Allow',
          '/f'
        ])
      } catch {}

      try {
        await execFileAsync('reg.exe', [
          'add',
          'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\location',
          '/v', 'Value',
          '/t', 'REG_SZ',
          '/d', 'Allow',
          '/f'
        ])
      } catch {}

      // 2. Restore service startup type to demand (Manual trigger)
      try {
        await execFileAsync('sc.exe', ['config', 'lfsvc', 'start=', 'demand'])
      } catch {
        try {
          await execFileAsync('powershell.exe', [
            '-NoProfile',
            '-NonInteractive',
            '-Command',
            'Set-Service -Name lfsvc -StartupType Manual -ErrorAction SilentlyContinue'
          ])
        } catch {}
      }

      // 3. Start service
      try {
        await execFileAsync('sc.exe', ['start', 'lfsvc'])
      } catch {}

      logService.addLog('✓ Служба геолокации (lfsvc) и доступ приложений к координатам восстановлены.', 'success')
      return true
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      logService.addLog(`Не удалось восстановить lfsvc: ${msg}`, 'warn')
      return false
    }
  }

  // ============================================================
  // Dynamic Physical Adapter Discovery & Anti-Leak Lockdown
  // ============================================================
  public async applyAntiLeakLockdown(): Promise<void> {
    const logService = LogService.getInstance()
    const networkService = NetworkService.getInstance()
    logService.addLog('Применение защиты от утечек DNS и изоляции IPv6...', 'info')
    const adapters = await networkService.getPhysicalAdapters()

    for (const name of adapters) {
      // 1. Disable IPv6 on physical adapter
      try {
        await execFileAsync('powershell.exe', [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          `Disable-NetAdapterBinding -Name '${name}' -ComponentID ms_tcpip6 -ErrorAction SilentlyContinue`
        ])
      } catch {}

      // 2. Set secure public fallback DNS on physical adapter so Windows never leaks to ISP but never hangs on loopback
      try {
        await execFileAsync('powershell.exe', [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          `Set-DnsClientServerAddress -InterfaceAlias '${name}' -ServerAddresses ("8.8.8.8","1.1.1.1") -ErrorAction SilentlyContinue`
        ])
      } catch {}
    }

    // 3. Fast Registry Tweaks: Disable Smart Multi-Homed Name Resolution (SMHNR) & Parallel A/AAAA
    await setRegistryDword('HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows NT\\DNSClient', 'DisableSmartNameResolution', 1)
    await setRegistryDword('HKLM\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters', 'DisableParallelAandAAAA', 1)

    // 4. Flush DNS cache
    await networkService.flushDns()

    logService.addLog(`✓ Защита от утечек DNS активна для адаптеров: [${adapters.join(', ')}].`, 'success')
  }

  public async restoreRegularNetwork(): Promise<void> {
    const logService = LogService.getInstance()
    const networkService = NetworkService.getInstance()
    logService.addLog('Восстановление стандартных настроек DNS и сетевых адаптеров...', 'info')
    const adapters = await networkService.getPhysicalAdapters()

    for (const name of adapters) {
      // 1. Reset physical adapter DNS back to DHCP / automatic ISP DNS
      try {
        await execFileAsync('powershell.exe', [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          `Set-DnsClientServerAddress -InterfaceAlias '${name}' -ResetServerAddresses -ErrorAction SilentlyContinue`
        ])
      } catch {}

      // 2. Re-enable IPv6 on physical adapter
      try {
        await execFileAsync('powershell.exe', [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          `Enable-NetAdapterBinding -Name '${name}' -ComponentID ms_tcpip6 -ErrorAction SilentlyContinue`
        ])
      } catch {}

      // 3. Restore Automatic Metric on physical adapter
      try {
        await execFileAsync('powershell.exe', [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          `Set-NetIPInterface -InterfaceAlias '${name}' -AddressFamily IPv4 -AutomaticMetric Enabled -ErrorAction SilentlyContinue; Set-NetIPInterface -InterfaceAlias '${name}' -AddressFamily IPv6 -AutomaticMetric Enabled -ErrorAction SilentlyContinue`
        ])
      } catch {}
    }

    // 4. Flush DNS cache
    await networkService.flushDns()

    logService.addLog('✓ Сетевой стек и DNS восстановлены в штатный режим.', 'success')
  }

  // ============================================================
  // Full Resident Mode Orchestration (Home / Office)
  // ============================================================
  public async enableResidentMode(targetFakeZone = AMSTERDAM_TIMEZONE): Promise<void> {
    const logService = LogService.getInstance()
    logService.addLog('Активация Resident Shield (Подмена геолокации и временной зоны)...', 'info')

    const currentTz = await this.getSystemTimezone()
    if (currentTz && currentTz !== 'Unknown' && currentTz !== targetFakeZone) {
      this.originalTimezone = currentTz
    }

    if (currentTz !== targetFakeZone) {
      await this.setSystemTimezone(targetFakeZone)
    }

    await this.stopLfsvc()
    await this.applyAntiLeakLockdown()
    logService.addLog('✓ Режим Resident Shield успешно активирован!', 'success')
  }

  public async disableResidentMode(targetRealZone?: string): Promise<void> {
    const logService = LogService.getInstance()
    logService.addLog('Деактивация Resident Shield...', 'info')

    const restoreTz = targetRealZone || this.originalTimezone || FALLBACK_TIMEZONE
    const currentTz = await this.getSystemTimezone()
    if (currentTz !== restoreTz) {
      await this.setSystemTimezone(restoreTz)
    }

    await this.startLfsvc()
    await this.restoreRegularNetwork()
    logService.addLog('✓ Режим Resident Shield выключен, реальная геолокация и таймзона восстановлены.', 'success')
  }

  /**
   * Instant fail-safe rollback for application crashes, force kills, or unhandled exceptions
   */
  public syncEmergencyCleanup(realZone = FALLBACK_TIMEZONE): void {
    try {
      execFileSyncSafe('tzutil.exe', ['/s', realZone])
    } catch {}
    try {
      execFileSyncSafe('sc.exe', ['config', 'lfsvc', 'start=', 'demand'])
      execFileSyncSafe('sc.exe', ['start', 'lfsvc'])
    } catch {}
    try {
      execFileSyncSafe('reg.exe', [
        'add',
        'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\location',
        '/v', 'Value',
        '/t', 'REG_SZ',
        '/d', 'Allow',
        '/f'
      ])
    } catch {}
    try {
      ZapretService.getInstance().syncEmergencyResume()
    } catch {}
  }
}
