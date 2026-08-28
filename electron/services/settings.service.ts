import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { getAppDataDir } from '../utils/paths'
import { DEFAULT_SETTINGS, type AppSettings } from '../../shared/types'
import { LogService } from './log.service'

export class SettingsService {
  private static instance: SettingsService
  private cachedSettings: AppSettings | null = null
  private readonly configPath: string

  private constructor() {
    this.configPath = path.join(getAppDataDir(), 'settings.json')
  }

  public static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService()
    }
    return SettingsService.instance
  }

  public loadSettings(): AppSettings {
    if (this.cachedSettings) return this.cachedSettings

    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf-8')
        const parsed = JSON.parse(raw)
        this.cachedSettings = { ...DEFAULT_SETTINGS, ...parsed }
        return this.cachedSettings!
      }
    } catch (err) {
      LogService.getInstance().addLog(`Ошибка чтения settings.json, используем дефолтные: ${err}`, 'warn')
    }

    this.cachedSettings = { ...DEFAULT_SETTINGS }
    return this.cachedSettings
  }

  public saveSettings(partial: Partial<AppSettings>): AppSettings {
    const current = this.loadSettings()
    const updated: AppSettings = { ...current, ...partial }

    try {
      const dir = path.dirname(this.configPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(this.configPath, JSON.stringify(updated, null, 2), 'utf-8')
      this.cachedSettings = updated

      // Sync autostart with OS
      if (partial.autoStart !== undefined) {
        this.syncAutoStartWithOS(updated.autoStart)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      LogService.getInstance().addLog(`Ошибка сохранения настроек: ${message}`, 'error')
    }

    return updated
  }

  private syncAutoStartWithOS(enable: boolean): void {
    try {
      app.setLoginItemSettings({
        openAtLogin: enable,
        openAsHidden: this.loadSettings().startMinimized
      })
    } catch (err) {
      console.error('syncAutoStartWithOS error:', err)
    }
  }
}
