import { app, ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { WindowManager } from '../core/window-manager'
import { SettingsService } from '../services/settings.service'

export function registerWindowIpc(): void {
  ipcMain.on(IPC_CHANNELS.WINDOW_MINIMIZE, () => {
    WindowManager.getInstance().getWindow()?.minimize()
  })

  ipcMain.on(IPC_CHANNELS.WINDOW_TOGGLE_MAXIMIZE, () => {
    const win = WindowManager.getInstance().getWindow()
    if (win && !win.isDestroyed()) {
      if (win.isMaximized()) {
        win.unmaximize()
      } else {
        win.maximize()
      }
    }
  })

  ipcMain.handle(IPC_CHANNELS.WINDOW_IS_MAXIMIZED, () => {
    const win = WindowManager.getInstance().getWindow()
    return win && !win.isDestroyed() ? win.isMaximized() : false
  })

  ipcMain.on(IPC_CHANNELS.WINDOW_CLOSE, () => {
    const settings = SettingsService.getInstance().loadSettings()
    const windowManager = WindowManager.getInstance()
    const window = windowManager.getWindow()

    if (settings.minimizeToTray) {
      window?.hide()
    } else {
      windowManager.setQuitting(true)
      app.quit()
    }
  })
}
