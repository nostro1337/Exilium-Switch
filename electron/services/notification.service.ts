import { app, shell, Notification, BrowserWindow } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { APP_AUMID } from '../core/constants'
import { getRealExePath, ensureCachedIcons } from '../utils/paths'

export class NotificationService {
  private static instance: NotificationService
  private getMainWindow: (() => BrowserWindow | null) | null = null

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  public setMainWindowResolver(resolver: () => BrowserWindow | null): void {
    this.getMainWindow = resolver
  }

  public registerWindowsIntegration(): void {
    try {
      const exePath = getRealExePath()
      const { icoPath } = ensureCachedIcons()
      const appData = (app && typeof app.getPath === 'function') ? app.getPath('appData') : (process.env.APPDATA || '.')
      const shortcutDir = path.join(appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs')
      if (!fs.existsSync(shortcutDir)) {
        fs.mkdirSync(shortcutDir, { recursive: true })
      }
      const shortcutPath = path.join(shortcutDir, 'Exilium Switch.lnk')
      const iconTarget = fs.existsSync(icoPath) ? icoPath : exePath

      const exists = fs.existsSync(shortcutPath)
      shell.writeShortcutLink(shortcutPath, exists ? 'update' : 'create', {
        target: exePath,
        cwd: path.dirname(exePath),
        description: 'Exilium Switch — Resident Shield (by Nostro)',
        icon: iconTarget,
        iconIndex: 0,
        appUserModelId: APP_AUMID
      })
    } catch (err) {
      console.error('registerWindowsIntegration error:', err)
    }
  }

  public showNotification(title: string, body: string, isUrgent = false): void {
    try {
      const { pngPath, icoPath } = ensureCachedIcons()
      const iconFile = fs.existsSync(pngPath) ? pngPath : (fs.existsSync(icoPath) ? icoPath : undefined)

      if (Notification && typeof Notification.isSupported === 'function' && Notification.isSupported()) {
        const notif = new Notification({
          title,
          body,
          icon: iconFile,
          urgency: isUrgent ? 'critical' : 'normal',
          silent: false
        })

        notif.on('click', () => {
          try {
            const mainWindow = this.getMainWindow ? this.getMainWindow() : null
            if (mainWindow) {
              if (typeof (mainWindow as any).isDestroyed === 'function' && (mainWindow as any).isDestroyed()) {
                return
              }
              if (typeof (mainWindow as any).showAndFocus === 'function') {
                (mainWindow as any).showAndFocus()
              } else {
                if (mainWindow.isMinimized()) mainWindow.restore()
                if (!mainWindow.isVisible()) mainWindow.show()
                mainWindow.focus()
              }
            }
          } catch (e) {
            console.error('[Notification Click Error]', e)
          }
        })

        notif.show()
      }
    } catch (err) {
      console.error('Notification error:', err)
    }
  }
}
