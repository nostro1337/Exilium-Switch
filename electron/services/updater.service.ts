import { app, BrowserWindow, Notification } from 'electron'
import { autoUpdater } from 'electron-updater'
import { LogService } from './log.service'
import { SingBoxService } from './singbox.service'
import { ensureCachedIcons, isDevBuild } from '../utils/paths'
import { IPC_CHANNELS } from '../../shared/ipc-channels'

export class UpdaterService {
  private static instance: UpdaterService
  private getMainWindow: (() => BrowserWindow | null) | null = null
  private lastNotifiedVersion: string | null = null
  private isInitialized = false

  private constructor() {}

  public static getInstance(): UpdaterService {
    if (!UpdaterService.instance) {
      UpdaterService.instance = new UpdaterService()
    }
    return UpdaterService.instance
  }

  public init(windowResolver: () => BrowserWindow | null): void {
    if (this.isInitialized) return
    this.isInitialized = true
    this.getMainWindow = windowResolver

    try {
      if (app && typeof app.getVersion === 'function') {
        autoUpdater.autoDownload = false
        autoUpdater.autoInstallOnAppQuit = false

        autoUpdater.setFeedURL({
          provider: 'github',
          owner: 'nostro1337',
          repo: 'Exilium-Switch'
        })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn('[Updater] setFeedURL fallback notice:', msg)
    }

    const logService = LogService.getInstance()

    autoUpdater.on('checking-for-update', () => {
      logService.addLog('[Updater] Проверка наличия обновлений на GitHub Releases...', 'info')
      this.getMainWindow?.()?.webContents.send(IPC_CHANNELS.UPDATER_CHECKING)
    })

    autoUpdater.on('update-available', (info) => {
      logService.addLog(`[Updater] Найдена новая версия: v${info.version}`, 'success')
      this.getMainWindow?.()?.webContents.send(IPC_CHANNELS.UPDATER_AVAILABLE, {
        version: info.version,
        releaseNotes: info.releaseNotes,
        releaseDate: info.releaseDate
      })

      // Show native Windows notification if not notified for this version yet
      if (this.lastNotifiedVersion !== info.version) {
        this.lastNotifiedVersion = info.version
        if (Notification.isSupported()) {
          try {
            const { pngPath, icoPath } = ensureCachedIcons()
            const icon = pngPath || icoPath || undefined
            const notification = new Notification({
              title: 'Доступно обновление Exilium Switch',
              body: `Вышла новая версия v${info.version}! Нажмите, чтобы открыть окно обновления.`,
              icon
            })
            notification.on('click', () => {
              const mainWindow = this.getMainWindow?.()
              if (mainWindow && !mainWindow.isDestroyed()) {
                if (mainWindow.isMinimized()) mainWindow.restore()
                mainWindow.show()
                mainWindow.focus()
                mainWindow.webContents.send(IPC_CHANNELS.OPEN_UPDATE_MODAL)
              }
            })
            notification.show()
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err)
            console.warn('[Updater Notification Error]', msg)
          }
        }
      }
    })

    autoUpdater.on('update-not-available', () => {
      logService.addLog('[Updater] Установлена актуальная версия Exilium Switch.', 'info')
      this.getMainWindow?.()?.webContents.send(IPC_CHANNELS.UPDATER_NOT_AVAILABLE)
    })

    autoUpdater.on('error', (err) => {
      logService.addLog(`[Updater] Ошибка модуля обновлений: ${err.message}`, 'warn')
      this.getMainWindow?.()?.webContents.send(IPC_CHANNELS.UPDATER_ERROR, { message: err.message })
    })

    autoUpdater.on('download-progress', (progressObj) => {
      this.getMainWindow?.()?.webContents.send(IPC_CHANNELS.UPDATER_PROGRESS, {
        percent: Math.round(progressObj.percent),
        bytesPerSecond: progressObj.bytesPerSecond,
        transferred: progressObj.transferred,
        total: progressObj.total
      })
    })

    autoUpdater.on('update-downloaded', (info) => {
      logService.addLog(`[Updater] Обновление v${info.version} успешно скачано и готово к установке.`, 'success')
      this.getMainWindow?.()?.webContents.send(IPC_CHANNELS.UPDATER_DOWNLOADED, {
        version: info.version,
        releaseNotes: info.releaseNotes,
        releaseDate: info.releaseDate
      })
    })

    // Start background check only in packaged Production Stable mode
    if (app.isPackaged && !isDevBuild()) {
      const runCheck = () => {
        autoUpdater.checkForUpdates().catch(() => {
          // Handled in autoUpdater 'error' event without duplicate logging
        })
      }
      setTimeout(runCheck, 8000)
      setInterval(runCheck, 30 * 60 * 1000) // Every 30 minutes
    } else if (isDevBuild()) {
      logService.addLog('[Updater] Автоматическая проверка обновлений отключена для DEV-билда.', 'info')
    }
  }

  public async checkForUpdates(): Promise<{ success: boolean; updateAvailable?: boolean; version?: string; error?: string }> {
    const logService = LogService.getInstance()
    try {
      if (app.isPackaged) {
        logService.addLog('[Updater] Запрос проверки обновлений на GitHub Releases...', 'info')
        const result = await autoUpdater.checkForUpdates()
        return { success: true, updateAvailable: !!result?.updateInfo, version: result?.updateInfo?.version }
      } else {
        logService.addLog('[Updater] Проверка обновлений отключена в режиме разработки (Dev mode).', 'info')
        return { success: true, updateAvailable: false, error: 'Dev mode' }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      logService.addLog(`[Updater] Ошибка при проверке обновлений: ${msg}`, 'warn')
      return { success: false, error: msg }
    }
  }

  public async downloadUpdate(): Promise<{ success: boolean; error?: string }> {
    const logService = LogService.getInstance()
    try {
      logService.addLog('[Updater] Начат процесс загрузки обновления...', 'info')
      await autoUpdater.downloadUpdate()
      return { success: true }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      logService.addLog(`[Updater] Ошибка скачивания обновления: ${msg}`, 'error')
      return { success: false, error: msg }
    }
  }

  public async quitAndInstall(): Promise<void> {
    const logService = LogService.getInstance()
    try {
      logService.addLog('[Updater] Запрос на установку обновления. Подготовка к безопасному перезапуску...', 'info')
      const singboxService = SingBoxService.getInstance()
      const isRunning = await singboxService.isRunning()
      if (isRunning) {
        logService.addLog('[Updater] Корректное отключение Resident Shield перед установкой...', 'info')
        await singboxService.toggle(false)
      }
      autoUpdater.quitAndInstall(true, true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      logService.addLog(`[Updater] Ошибка перезапуска и установки: ${msg}`, 'error')
    }
  }
}
