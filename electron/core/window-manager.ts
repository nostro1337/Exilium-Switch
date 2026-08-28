import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { ensureCachedIcons } from '../utils/paths'
import { SettingsService } from '../services/settings.service'
import { LogService } from '../services/log.service'
import { IPC_CHANNELS } from '../../shared/ipc-channels'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export class WindowManager {
  private static instance: WindowManager
  private mainWindow: BrowserWindow | null = null
  private isQuitting = false

  private constructor() {}

  public static getInstance(): WindowManager {
    if (!WindowManager.instance) {
      WindowManager.instance = new WindowManager()
    }
    return WindowManager.instance
  }

  public getWindow(): BrowserWindow | null {
    return this.mainWindow
  }

  public setQuitting(val: boolean): void {
    this.isQuitting = val
  }

  public isAppQuitting(): boolean {
    return this.isQuitting
  }

  public shouldStartHidden(): boolean {
    if (process.argv.includes('--hidden') || process.argv.includes('--minimized')) {
      return true
    }
    const settings = SettingsService.getInstance().loadSettings()
    return Boolean(settings.startMinimized)
  }

  public createWindow(): BrowserWindow {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      if (this.mainWindow.isMinimized()) this.mainWindow.restore()
      if (!this.mainWindow.isVisible()) this.mainWindow.show()
      this.mainWindow.focus()
      return this.mainWindow
    }

    const startHidden = this.shouldStartHidden()

    let preloadPath = path.join(__dirname, 'preload.cjs')
    if (!fs.existsSync(preloadPath)) {
      preloadPath = path.join(app.getAppPath(), 'dist-electron', 'preload.cjs')
    }
    if (!fs.existsSync(preloadPath)) {
      preloadPath = path.join(__dirname, 'preload.js')
    }

    const { pngPath, icoPath } = ensureCachedIcons()
    const iconFile = fs.existsSync(icoPath) ? icoPath : (fs.existsSync(pngPath) ? pngPath : undefined)

    this.mainWindow = new BrowserWindow({
      width: 450,
      height: 740,
      minWidth: 420,
      minHeight: 680,
      frame: false,
      show: !startHidden,
      center: true,
      icon: iconFile,
      backgroundColor: '#09090b',
      paintWhenInitiallyHidden: true,
      resizable: true,
      maximizable: true,
      webPreferences: {
        preload: preloadPath,
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
        backgroundThrottling: false
      }
    })

    this.mainWindow.on('maximize', () => {
      this.mainWindow?.webContents.send(IPC_CHANNELS.WINDOW_MAXIMIZED_CHANGED, true)
    })

    this.mainWindow.on('unmaximize', () => {
      this.mainWindow?.webContents.send(IPC_CHANNELS.WINDOW_MAXIMIZED_CHANGED, false)
    })

    this.mainWindow.once('ready-to-show', () => {
      if (!startHidden && this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.show()
        this.mainWindow.focus()
      }
    })

    const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

    if (isDev && process.env.VITE_DEV_SERVER_URL) {
      this.mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    } else {
      let htmlPath = path.join(__dirname, '../dist/index.html')
      if (!fs.existsSync(htmlPath)) {
        htmlPath = path.join(app.getAppPath(), 'dist', 'index.html')
      }
      this.mainWindow.loadFile(htmlPath)
    }

    this.mainWindow.on('close', (event) => {
      const settings = SettingsService.getInstance().loadSettings()
      if (settings.minimizeToTray && !this.isQuitting) {
        event.preventDefault()
        this.mainWindow?.hide()
      }
    })

    this.mainWindow.on('closed', () => {
      this.mainWindow = null
    })

    LogService.getInstance().addLog('Окно интерфейса успешно создано.', 'info')
    return this.mainWindow
  }

  public showAndFocus(): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      if (this.mainWindow.isMinimized()) this.mainWindow.restore()
      if (!this.mainWindow.isVisible()) this.mainWindow.show()
      this.mainWindow.focus()
    } else {
      const win = this.createWindow()
      win.show()
      win.focus()
    }
  }
}
