import { app, Tray, Menu, nativeImage } from 'electron'
import fs from 'node:fs'
import { ensureCachedIcons } from '../utils/paths'
import { WindowManager } from './window-manager'
import { SingBoxService } from '../services/singbox.service'
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
      const iconPath = fs.existsSync(icoPath) ? icoPath : pngPath
      const icon = nativeImage.createFromPath(iconPath).resize({ width: 24, height: 24 })

      this.tray = new Tray(icon)
      this.tray.setToolTip('Exilium Switch — Resident Shield (by Nostro)')

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

    const activeProfile = ProfileService.getInstance().getActiveProfile()
    const profileLabel = activeProfile ? `Профиль: ${activeProfile.name}` : 'Профиль: (не выбран)'

    const contextMenu = Menu.buildFromTemplate([
      { label: `Exilium Switch v${app.getVersion()} (by Nostro)`, enabled: false },
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
