import { app, ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { UpdaterService } from '../services/updater.service'

export function registerUpdaterIpc(): void {
  const updaterService = UpdaterService.getInstance()

  ipcMain.handle(IPC_CHANNELS.GET_APP_VERSION, () => {
    return app.getVersion()
  })

  ipcMain.handle(IPC_CHANNELS.CHECK_FOR_UPDATES, async () => {
    return await updaterService.checkForUpdates()
  })

  ipcMain.handle(IPC_CHANNELS.START_UPDATE_DOWNLOAD, async () => {
    return await updaterService.downloadUpdate()
  })

  ipcMain.handle(IPC_CHANNELS.QUIT_AND_INSTALL_UPDATE, async () => {
    await updaterService.quitAndInstall()
  })
}
