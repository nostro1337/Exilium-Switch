import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc-channels'
import type {
  AppMode,
  AppSettings,
  ConfigProfile,
  AuditDiagnosisResult,
  VpnStatus,
  LogEntry,
  UpdateInfo,
  UpdateProgress
} from '../shared/types'

// Re-export for renderer backward compatibility
export type {
  AppMode,
  AppSettings,
  ConfigProfile,
  AuditDiagnosisResult,
  VpnStatus,
  LogEntry,
  UpdateInfo,
  UpdateProgress
}

export interface IpcApi {
  getStatus: () => Promise<VpnStatus>
  toggleVpn: (enable?: boolean) => Promise<{ success: boolean; isRunning: boolean; error?: string }>
  getSettings: () => Promise<AppSettings>
  saveSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>
  setAppMode: (mode: AppMode) => Promise<{ success: boolean; mode: AppMode }>
  runSystemAudit: () => Promise<AuditDiagnosisResult>
  testLatency: () => Promise<{ latencyMs: number | null; error?: string }>
  minimizeWindow: () => void
  closeWindow: () => void
  onLog: (callback: (log: LogEntry) => void) => () => void
  onStatusChange: (callback: (status: VpnStatus) => void) => () => void
  getRecentLogs: () => Promise<LogEntry[]>
  
  // Profile Management
  getProfiles: (mode?: AppMode) => Promise<ConfigProfile[]>
  importProfile: (mode?: AppMode) => Promise<{ success: boolean; profile?: ConfigProfile; error?: string }>
  importVlessLink: (vlessUrl: string, mode?: AppMode) => Promise<{ success: boolean; profile?: ConfigProfile; error?: string }>
  selectProfile: (profileId: string) => Promise<{ success: boolean; error?: string }>
  deleteProfile: (profileId: string) => Promise<{ success: boolean; error?: string }>
  
  // Log Export & File Operations
  exportLogs: () => Promise<{ success: boolean; savedPath?: string; error?: string }>
  openLogsFolder: () => Promise<void>

  // Auto Updater
  getAppVersion: () => Promise<string>
  checkForUpdates: () => Promise<{ success: boolean; updateAvailable?: boolean; version?: string; error?: string }>
  startUpdateDownload: () => Promise<{ success: boolean; error?: string }>
  quitAndInstallUpdate: () => Promise<void>
  onUpdateChecking: (callback: () => void) => () => void
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => () => void
  onUpdateNotAvailable: (callback: () => void) => () => void
  onUpdateProgress: (callback: (progress: UpdateProgress) => void) => () => void
  onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => () => void
  onUpdateError: (callback: (err: { message: string }) => void) => () => void
  onOpenUpdateModal: (callback: () => void) => () => void
}

const api: IpcApi = {
  getStatus: () => ipcRenderer.invoke(IPC_CHANNELS.GET_STATUS),
  toggleVpn: (enable) => ipcRenderer.invoke(IPC_CHANNELS.TOGGLE_VPN, enable),
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS),
  saveSettings: (settings) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_SETTINGS, settings),
  setAppMode: (mode) => ipcRenderer.invoke(IPC_CHANNELS.SET_APP_MODE, mode),
  runSystemAudit: () => ipcRenderer.invoke(IPC_CHANNELS.RUN_SYSTEM_AUDIT),
  testLatency: () => ipcRenderer.invoke(IPC_CHANNELS.TEST_LATENCY),
  minimizeWindow: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_MINIMIZE),
  closeWindow: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_CLOSE),
  onLog: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, log: LogEntry) => callback(log)
    ipcRenderer.on(IPC_CHANNELS.SING_BOX_LOG, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.SING_BOX_LOG, handler)
  },
  onStatusChange: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, status: VpnStatus) => callback(status)
    ipcRenderer.on(IPC_CHANNELS.STATUS_UPDATED, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.STATUS_UPDATED, handler)
  },
  getRecentLogs: () => ipcRenderer.invoke(IPC_CHANNELS.GET_RECENT_LOGS),
  
  // Profiles
  getProfiles: (mode) => ipcRenderer.invoke(IPC_CHANNELS.GET_PROFILES, mode),
  importProfile: (mode) => ipcRenderer.invoke(IPC_CHANNELS.IMPORT_PROFILE, mode),
  importVlessLink: (vlessUrl, mode) => ipcRenderer.invoke(IPC_CHANNELS.IMPORT_VLESS_LINK, vlessUrl, mode),
  selectProfile: (profileId) => ipcRenderer.invoke(IPC_CHANNELS.SELECT_PROFILE, profileId),
  deleteProfile: (profileId) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_PROFILE, profileId),
  
  // Export Logs
  exportLogs: () => ipcRenderer.invoke(IPC_CHANNELS.EXPORT_LOGS),
  openLogsFolder: () => ipcRenderer.invoke(IPC_CHANNELS.OPEN_LOGS_FOLDER),

  // Auto Updater
  getAppVersion: () => ipcRenderer.invoke(IPC_CHANNELS.GET_APP_VERSION),
  checkForUpdates: () => ipcRenderer.invoke(IPC_CHANNELS.CHECK_FOR_UPDATES),
  startUpdateDownload: () => ipcRenderer.invoke(IPC_CHANNELS.START_UPDATE_DOWNLOAD),
  quitAndInstallUpdate: () => ipcRenderer.invoke(IPC_CHANNELS.QUIT_AND_INSTALL_UPDATE),
  onUpdateChecking: (callback) => {
    const handler = () => callback()
    ipcRenderer.on(IPC_CHANNELS.UPDATER_CHECKING, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.UPDATER_CHECKING, handler)
  },
  onUpdateAvailable: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, info: UpdateInfo) => callback(info)
    ipcRenderer.on(IPC_CHANNELS.UPDATER_AVAILABLE, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.UPDATER_AVAILABLE, handler)
  },
  onUpdateNotAvailable: (callback) => {
    const handler = () => callback()
    ipcRenderer.on(IPC_CHANNELS.UPDATER_NOT_AVAILABLE, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.UPDATER_NOT_AVAILABLE, handler)
  },
  onUpdateProgress: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: UpdateProgress) => callback(progress)
    ipcRenderer.on(IPC_CHANNELS.UPDATER_PROGRESS, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.UPDATER_PROGRESS, handler)
  },
  onUpdateDownloaded: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, info: UpdateInfo) => callback(info)
    ipcRenderer.on(IPC_CHANNELS.UPDATER_DOWNLOADED, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.UPDATER_DOWNLOADED, handler)
  },
  onUpdateError: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, err: { message: string }) => callback(err)
    ipcRenderer.on(IPC_CHANNELS.UPDATER_ERROR, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.UPDATER_ERROR, handler)
  },
  onOpenUpdateModal: (callback) => {
    const handler = () => callback()
    ipcRenderer.on(IPC_CHANNELS.OPEN_UPDATE_MODAL, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.OPEN_UPDATE_MODAL, handler)
  }
}

contextBridge.exposeInMainWorld('electronAPI', api)

declare global {
  interface Window {
    electronAPI: IpcApi
  }
}
