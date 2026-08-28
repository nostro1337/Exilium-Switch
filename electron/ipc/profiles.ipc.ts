import { ipcMain, dialog } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { ProfileService } from '../services/profile.service'
import { SingBoxService } from '../services/singbox.service'
import { WindowManager } from '../core/window-manager'
import type { AppMode } from '../../shared/types'

export function registerProfilesIpc(): void {
  const profileService = ProfileService.getInstance()
  const singboxService = SingBoxService.getInstance()

  ipcMain.handle(IPC_CHANNELS.GET_PROFILES, (_event, mode?: AppMode) => {
    return profileService.getProfiles(mode)
  })

  ipcMain.handle(IPC_CHANNELS.IMPORT_PROFILE, async (_event, targetMode?: AppMode) => {
    const mainWindow = WindowManager.getInstance().getWindow()
    if (!mainWindow) return { success: false, error: 'Окно недоступно' }

    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'Выберите .json конфиг sing-box',
      filters: [{ name: 'sing-box Config (.json)', extensions: ['json'] }],
      properties: ['openFile']
    })

    if (res.canceled || !res.filePaths[0]) {
      return { success: false, error: 'Импорт отменен' }
    }

    const sourcePath = res.filePaths[0]
    const rawContent = fs.readFileSync(sourcePath, 'utf-8')
    const originalName = path.basename(sourcePath, '.json')

    const importRes = profileService.importJsonContent(rawContent, originalName, targetMode)

    if (importRes.success) {
      const window = WindowManager.getInstance().getWindow()
      if (window && !window.isDestroyed()) {
        const status = await singboxService.getStatus()
        window.webContents.send(IPC_CHANNELS.STATUS_UPDATED, status)
      }
    }

    return importRes
  })

  ipcMain.handle(IPC_CHANNELS.IMPORT_VLESS_LINK, async (_event, rawLink: string, targetMode?: AppMode) => {
    const importRes = profileService.importVlessLink(rawLink, targetMode)

    if (importRes.success) {
      const window = WindowManager.getInstance().getWindow()
      if (window && !window.isDestroyed()) {
        const status = await singboxService.getStatus()
        window.webContents.send(IPC_CHANNELS.STATUS_UPDATED, status)
      }
    }

    return importRes
  })

  ipcMain.handle(IPC_CHANNELS.SELECT_PROFILE, async (_event, profileId: string) => {
    const isRunning = await singboxService.isRunning()
    if (isRunning) {
      return { success: false, error: 'Нельзя сменить профиль при активном туннеле. Сначала отключите его.' }
    }

    const selectRes = profileService.selectProfile(profileId)

    if (selectRes.success) {
      const window = WindowManager.getInstance().getWindow()
      if (window && !window.isDestroyed()) {
        const status = await singboxService.getStatus()
        window.webContents.send(IPC_CHANNELS.STATUS_UPDATED, status)
      }
    }

    return selectRes
  })

  ipcMain.handle(IPC_CHANNELS.DELETE_PROFILE, async (_event, profileId: string) => {
    const isRunning = await singboxService.isRunning()
    if (isRunning) {
      return { success: false, error: 'Нельзя удалять профили при включенном VPN' }
    }

    const deleteRes = profileService.deleteProfile(profileId)

    if (deleteRes.success) {
      const window = WindowManager.getInstance().getWindow()
      if (window && !window.isDestroyed()) {
        const status = await singboxService.getStatus()
        window.webContents.send(IPC_CHANNELS.STATUS_UPDATED, status)
      }
    }

    return deleteRes
  })

  ipcMain.handle(IPC_CHANNELS.PROFILES_CLEAR_ALL, async (_event, targetMode?: AppMode) => {
    const isRunning = await singboxService.isRunning()
    if (isRunning) {
      return { success: false, error: 'Нельзя удалять профили при включенном VPN' }
    }

    const clearRes = profileService.clearAllProfiles(targetMode)

    if (clearRes.success) {
      const window = WindowManager.getInstance().getWindow()
      if (window && !window.isDestroyed()) {
        const status = await singboxService.getStatus()
        window.webContents.send(IPC_CHANNELS.STATUS_UPDATED, status)
      }
    }

    return clearRes
  })
}
