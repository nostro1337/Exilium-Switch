import { app, Tray, Menu, nativeImage } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { ensureCachedIcons, isDevBuild } from '../utils/paths'
import { WindowManager } from './window-manager'
import { SingBoxService } from '../services/singbox.service'
import { NetworkService } from '../services/network.service'
import { ProfileService } from '../services/profile.service'
import { LogService } from '../services/log.service'

export class TrayManager {
  private static instance: TrayManager
  private tray: Tray | null = null

  private constructor() {}

  public static getInstance(): TrayManager {
    if (!TrayManager.instance) {
      TrayManager.instance = new TrayManager()
    }
    return TrayManager.instance
  }

  public createTray(): void {
    try {
      const { icoPath, pngPath } = ensureCachedIcons()
      const appPath = (app && typeof app.getAppPath === 'function') ? app.getAppPath() : process.cwd()
      const resPath = process.resourcesPath || ''

      const tryImage = (filePath: string, resize = false): Electron.NativeImage | null => {
        if (fs.existsSync(filePath)) {
          try {
            if (fs.statSync(filePath).size > 50) {
              const img = nativeImage.createFromPath(filePath)
              if (!img.isEmpty()) {
                return resize ? img.resize({ width: 16, height: 16 }) : img
              }
            }
          } catch {}
        }
        return null
      }

      // Priority 1: PNG resized to 16x16 (highest fidelity and reliable alpha on Windows Tray)
      let icon = tryImage(pngPath, true) ||
                 tryImage(path.join(resPath, 'icon.png'), true) ||
                 tryImage(path.join(appPath, 'build', 'icon.png'), true) ||
                 tryImage(path.resolve('build', 'icon.png'), true) ||
                 tryImage(path.join(appPath, 'public', 'ExiliumAppIcon.png'), true)

      // Priority 2: ICO without resize
      if (!icon) {
        icon = tryImage(icoPath, false) ||
               tryImage(path.join(resPath, 'icon.ico'), false) ||
               tryImage(path.join(appPath, 'build', 'icon.ico'), false) ||
               tryImage(path.resolve('build', 'icon.ico'), false)
      }

      const isDev = isDevBuild()
      const title = isDev ? 'Exilium Switch [DEV BUILD] (by Nostro)' : 'Exilium Switch — Resident Shield (by Nostro)'

      if (icon && !icon.isEmpty()) {
        this.tray = new Tray(icon)
      } else if (fs.existsSync(icoPath)) {
        this.tray = new Tray(icoPath)
      } else {
        const fallback = path.join(resPath, 'icon.ico')
        this.tray = new Tray(fallback)
      }

      this.tray.setToolTip(title)

      const showWindow = () => {
        WindowManager.getInstance().showAndFocus()
      }

      this.tray.on('click', showWindow)
      this.tray.on('double-click', showWindow)
      this.updateTrayMenu(false)
    } catch (err) {
      LogService.getInstance().addLog(`Ошибка создания системного трея: ${err}`, 'error')
    }
  }

  public updateTrayMenu(isRunning: boolean): void {
    if (!this.tray) return

    const isDev = isDevBuild()
    const version = (app && typeof app.getVersion === 'function') ? app.getVersion() : '1.5.1'
    const devLabel = isDev ? ' [DEV BUILD]' : ''
    const activeProfile = ProfileService.getInstance().getActiveProfile()
    const profileLabel = activeProfile ? `Профиль: ${activeProfile.name}` : 'Профиль: (не выбран)'

    const contextMenu = Menu.buildFromTemplate([
      { label: `Exilium Switch v${version}${devLabel} (by Nostro)`, enabled: false },
      { type: 'separator' },

      {
        label: isRunning ? '● Resident Mode: ВКЛЮЧЕН' : '○ Resident Mode: ВЫКЛЮЧЕН',
        enabled: false
      },
      {
        label: profileLabel,
        enabled: false
      },
      { type: 'separator' },
      {
        label: isRunning ? 'Отключить Resident Shield' : 'Включить Resident Shield',
        click: async () => {
          await SingBoxService.getInstance().toggle()
        }
      },
      {
        label: 'Сбросить кэш IDE и DNS',
        click: async () => {
          await NetworkService.getInstance().clearIdeAndDnsCache()
        }
      },
      { type: 'separator' },
      {
        label: 'Открыть панель управления',
        click: () => {
          WindowManager.getInstance().showAndFocus()
        }
      },
      {
        label: 'Выход',
        click: () => {
          WindowManager.getInstance().setQuitting(true)
          app.quit()
        }
      }
    ])

    this.tray.setContextMenu(contextMenu)
    this.tray.setToolTip(`Exilium Switch: ${isRunning ? '● Защищен' : '○ Ожидание'} [${activeProfile?.name || 'Нет профиля'}]`)
  }
}
