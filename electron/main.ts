import { app } from 'electron'
import path from 'node:path'
import { APP_AUMID, STATUS_BROADCAST_INTERVAL_MS } from './core/constants'
import { WindowManager } from './core/window-manager'
import { TrayManager } from './core/tray-manager'
import { NotificationService } from './services/notification.service'
import { SingBoxService } from './services/singbox.service'
import { FailsafeService } from './services/failsafe.service'
import { UpdaterService } from './services/updater.service'
import { LogService } from './services/log.service'
import { SettingsService } from './services/settings.service'
import { ensureCachedIcons, isDevBuild } from './utils/paths'
import { registerAllIpcHandlers } from './ipc'
import { IPC_CHANNELS } from '../shared/ipc-channels'

// ============================================================
// Environment & App Data Isolation (Dev vs Production)
// ============================================================
const isDev = isDevBuild()
const APP_NAME = isDev ? 'Exilium Switch (Dev)' : APP_AUMID
const AUMID = isDev ? 'com.nostro.exiliumswitch.dev' : APP_AUMID

app.setName(APP_NAME)
try {
  app.setAppUserModelId(AUMID)
} catch {}

try {
  if (app && typeof app.getPath === 'function') {
    const baseAppData = app.getPath('appData')
    app.setPath('userData', path.join(baseAppData, isDev ? 'ExiliumSwitch-Dev' : 'ExiliumSwitch'))
  }
} catch {}

// ============================================================
// Single Instance Lock (Scoped to userData directory)
// ============================================================
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    WindowManager.getInstance().showAndFocus()
  })
}

// ============================================================
// Application Bootstrap
// ============================================================
app.whenReady().then(async () => {
  // 0. Initialize Live Continuous Session Log File on Disk
  LogService.getInstance().initSessionFile()

  ensureCachedIcons()

  // 1. Startup Sanitation & Network Stack Failsafe
  await FailsafeService.getInstance().runStartupSanitation()

  // 2. Windows Integration & Notification Setup
  const notifService = NotificationService.getInstance()
  notifService.registerWindowsIntegration()
  notifService.setMainWindowResolver(() => WindowManager.getInstance().getWindow())

  // 3. Register Modular IPC Subsystems
  registerAllIpcHandlers()

  // 4. Initialize Core Window and Tray
  const trayManager = TrayManager.getInstance()
  const windowManager = WindowManager.getInstance()
  trayManager.createTray()
  const mainWindow = windowManager.createWindow()

  // Ensure window is shown & focused on launch if not configured to start hidden
  if (!windowManager.shouldStartHidden()) {
    windowManager.showAndFocus()
  }

  // 5. Connect Real-time Log Streaming to Renderer
  LogService.getInstance().addListener((entry) => {
    const win = windowManager.getWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send(IPC_CHANNELS.SING_BOX_LOG, entry)
    }
  })

  // 6. Initialize Auto-Updater
  UpdaterService.getInstance().init(() => windowManager.getWindow())

  // 7. Ultra-lightweight Periodic Status Broadcast (0% CPU PID check)
  setInterval(async () => {
    const win = windowManager.getWindow()
    if (win && !win.isDestroyed()) {
      const status = await SingBoxService.getInstance().getStatus()
      win.webContents.send(IPC_CHANNELS.STATUS_UPDATED, status)
      trayManager.updateTrayMenu(status.isRunning)
    }
  }, STATUS_BROADCAST_INTERVAL_MS)

  LogService.getInstance().addLog('Exilium Switch успешно запущен и готов к работе.', 'success')
})

// ============================================================
// Application Lifecycle
// ============================================================
app.on('before-quit', () => {
  WindowManager.getInstance().setQuitting(true)
})

app.on('window-all-closed', () => {
  const settings = SettingsService.getInstance().loadSettings()
  const windowManager = WindowManager.getInstance()
  if (!settings.minimizeToTray || windowManager.isAppQuitting()) {
    app.quit()
  }
})
