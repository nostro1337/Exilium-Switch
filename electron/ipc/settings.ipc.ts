import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { SettingsService } from '../services/settings.service'
import { WindowManager } from '../core/window-manager'
import type { AppSettings } from '../../shared/types'

export function registerSettingsIpc(): void {
  const settingsService = SettingsService.getInstance()

  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, () => {
    return settingsService.loadSettings()
  })

  ipcMain.handle(IPC_CHANNELS.SAVE_SETTINGS, (_event, partial: Partial<AppSettings>) => {
    const updated = settingsService.saveSettings(partial)
    const window = WindowManager.getInstance().getWindow()
    if (window && !window.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.SETTINGS_UPDATED, updated)
    }
    return updated
  })
}
