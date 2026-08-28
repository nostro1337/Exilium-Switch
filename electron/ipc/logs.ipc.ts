import { ipcMain, dialog } from 'electron'
import fs from 'node:fs'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { LogService } from '../services/log.service'
import { WindowManager } from '../core/window-manager'

export function registerLogsIpc(): void {
  const logService = LogService.getInstance()

  ipcMain.handle(IPC_CHANNELS.GET_RECENT_LOGS, () => {
    return logService.getRecentLogs()
  })

  ipcMain.handle(IPC_CHANNELS.EXPORT_LOGS, async () => {
    try {
      const mainWindow = WindowManager.getInstance().getWindow()
      if (!mainWindow) return { success: false, error: 'Окно приложения недоступно' }

      const dateStr = new Date().toISOString().slice(0, 10)
      const saveResult = await dialog.showSaveDialog(mainWindow, {
        title: 'Экспорт логов сессии Exilium Switch',
        defaultPath: `exilium-logs-${dateStr}.log`,
        filters: [{ name: 'Log Files', extensions: ['log', 'txt'] }]
      })

      if (saveResult.canceled || !saveResult.filePath) {
        return { success: false, error: 'Отменено пользователем' }
      }

      const buffer = logService.getRecentLogs()
      const content = buffer.map(l => `[${l.time}] [${l.type.toUpperCase()}] ${l.text}`).join('\n')
      fs.writeFileSync(saveResult.filePath, content, 'utf-8')
      logService.addLog(`Логи сессии экспортированы: ${saveResult.filePath}`, 'success')
      return { success: true, savedPath: saveResult.filePath }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      logService.addLog(`Ошибка экспорта логов: ${msg}`, 'error')
      return { success: false, error: msg }
    }
  })

  ipcMain.handle(IPC_CHANNELS.OPEN_LOGS_FOLDER, async () => {
    logService.openLogsFolder()
  })
}
