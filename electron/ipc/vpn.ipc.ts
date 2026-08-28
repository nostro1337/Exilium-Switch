import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { SingBoxService } from '../services/singbox.service'
import { SettingsService } from '../services/settings.service'
import { TrayManager } from '../core/tray-manager'
import { WindowManager } from '../core/window-manager'
import type { AppMode } from '../../shared/types'

export function registerVpnIpc(): void {
  const singboxService = SingBoxService.getInstance()
  const settingsService = SettingsService.getInstance()

  ipcMain.handle(IPC_CHANNELS.GET_STATUS, async () => {
    return await singboxService.getStatus()
  })

  ipcMain.handle(IPC_CHANNELS.TOGGLE_VPN, async (_event, enable?: boolean) => {
    const res = await singboxService.toggle(enable)
    TrayManager.getInstance().updateTrayMenu(res.isRunning)
    return res
  })

  ipcMain.handle(IPC_CHANNELS.SET_APP_MODE, async (_event, mode: AppMode) => {
    const isRunning = await singboxService.isRunning()
    if (isRunning) {
      // Gracefully switch mode: stop current tunnel, update mode, restart
      await singboxService.toggle(false)
      settingsService.saveSettings({ appMode: mode })
      await singboxService.toggle(true)
    } else {
      settingsService.saveSettings({ appMode: mode })
    }

    const window = WindowManager.getInstance().getWindow()
    if (window && !window.isDestroyed()) {
      const status = await singboxService.getStatus()
      window.webContents.send(IPC_CHANNELS.STATUS_UPDATED, status)
    }

    return { success: true, mode }
  })
}
