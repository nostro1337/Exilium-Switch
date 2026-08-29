import { app, ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { WindowManager } from '../core/window-manager'
import { SettingsService } from '../services/settings.service'
import { LogService } from '../services/log.service'

export function registerWindowIpc(): void {
  ipcMain.on(IPC_CHANNELS.WINDOW_MINIMIZE, () => {
    WindowManager.getInstance().getWindow()?.minimize()
    LogService.getInstance().addLog('Окно приложения свернуто.', 'info')
  })

  ipcMain.on(IPC_CHANNELS.WINDOW_TOGGLE_MAXIMIZE, () => {
    const win = WindowManager.getInstance().getWindow()
    if (win && !win.isDestroyed()) {
      if (win.isMaximized()) {
        win.unmaximize()
        LogService.getInstance().addLog('Окно восстановлено к стандартному размеру.', 'info')
      } else {
        win.maximize()
        LogService.getInstance().addLog('Окно развернуто на весь экран.', 'info')
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
      LogService.getInstance().addLog('Окно закрыто в фоновый режим (системный трей).', 'info')
      window?.hide()
    } else {
      LogService.getInstance().addLog('Завершение работы приложения...', 'info')
      windowManager.setQuitting(true)
      app.quit()
    }
  })
}
