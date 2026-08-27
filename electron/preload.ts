import { contextBridge, ipcRenderer } from 'electron'

export type AppMode = 'home' | 'office' | 'gaming'

export interface AppSettings {
  realZone: string
  fakeZone: string
  autoStart: boolean
  minimizeToTray: boolean
  startMinimized: boolean
  activeProfileId?: string
  appMode?: AppMode
  activeProfileIdByMode?: Record<string, string>
}

export interface ConfigProfile {
  id: string
  name: string
  filename: string
  path: string
  createdAt: number
  isDefault?: boolean
  isActive?: boolean
  mode?: AppMode
}

export interface AuditDiagnosisResult {
  hostname: string
  currentUser: string
  isAdministrator: boolean
  domainJoined: boolean
  domainName: string
  domainControllers: Array<{ name: string; ip: string }>
  dnsServers: string[]
  dnsSuffixes: string[]
  defaultGateway: string
  ipAddress: string
  vpsReachable: boolean
  vpsLatencyMs: number
  recommendedMode: AppMode
  recommendationReason: string
}

export interface VpnStatus {
  isRunning: boolean
  pid?: number
  currentZone: string
  lfsvcStatus: string
  uptimeSeconds: number
  startTime?: number
  activeProfileName?: string
  appMode?: AppMode
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
  onLog: (callback: (log: { time: string; text: string; type: 'info' | 'warn' | 'error' | 'success' | 'dev' }) => void) => () => void
  onStatusChange: (callback: (status: VpnStatus) => void) => () => void
  getRecentLogs: () => Promise<Array<{ time: string; text: string; type: 'info' | 'warn' | 'error' | 'success' | 'dev' }>>
  
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

export interface UpdateInfo {
  version: string
  releaseNotes?: string | Array<{ version: string; note: string }>
  releaseDate?: string
}

export interface UpdateProgress {
  percent: number
  bytesPerSecond: number
  transferred: number
  total: number
}

const api: IpcApi = {
  getStatus: () => ipcRenderer.invoke('get-status'),
  toggleVpn: (enable) => ipcRenderer.invoke('toggle-vpn', enable),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  setAppMode: (mode) => ipcRenderer.invoke('set-app-mode', mode),
  runSystemAudit: () => ipcRenderer.invoke('run-system-audit'),
  testLatency: () => ipcRenderer.invoke('test-latency'),
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  onLog: (callback) => {
    const handler = (_event: any, log: any) => callback(log)
    ipcRenderer.on('sing-box-log', handler)
    return () => ipcRenderer.removeListener('sing-box-log', handler)
  },
  onStatusChange: (callback) => {
    const handler = (_event: any, status: VpnStatus) => callback(status)
    ipcRenderer.on('status-updated', handler)
    return () => ipcRenderer.removeListener('status-updated', handler)
  },
  getRecentLogs: () => ipcRenderer.invoke('get-recent-logs'),
  
  // Profiles
  getProfiles: (mode) => ipcRenderer.invoke('get-profiles', mode),
  importProfile: (mode) => ipcRenderer.invoke('import-profile', mode),
  importVlessLink: (vlessUrl, mode) => ipcRenderer.invoke('import-vless-link', vlessUrl, mode),
  selectProfile: (profileId) => ipcRenderer.invoke('select-profile', profileId),
  deleteProfile: (profileId) => ipcRenderer.invoke('delete-profile', profileId),
  
  // Export Logs
  exportLogs: () => ipcRenderer.invoke('export-logs'),
  openLogsFolder: () => ipcRenderer.invoke('open-logs-folder'),

  // Auto Updater
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  startUpdateDownload: () => ipcRenderer.invoke('updater:start-download'),
  quitAndInstallUpdate: () => ipcRenderer.invoke('updater:quit-and-install'),
  onUpdateChecking: (callback) => {
    const handler = () => callback()
    ipcRenderer.on('updater:checking', handler)
    return () => ipcRenderer.removeListener('updater:checking', handler)
  },
  onUpdateAvailable: (callback) => {
    const handler = (_event: any, info: UpdateInfo) => callback(info)
    ipcRenderer.on('updater:available', handler)
    return () => ipcRenderer.removeListener('updater:available', handler)
  },
  onUpdateNotAvailable: (callback) => {
    const handler = () => callback()
    ipcRenderer.on('updater:not-available', handler)
    return () => ipcRenderer.removeListener('updater:not-available', handler)
  },
  onUpdateProgress: (callback) => {
    const handler = (_event: any, progress: UpdateProgress) => callback(progress)
    ipcRenderer.on('updater:progress', handler)
    return () => ipcRenderer.removeListener('updater:progress', handler)
  },
  onUpdateDownloaded: (callback) => {
    const handler = (_event: any, info: UpdateInfo) => callback(info)
    ipcRenderer.on('updater:downloaded', handler)
    return () => ipcRenderer.removeListener('updater:downloaded', handler)
  },
  onUpdateError: (callback) => {
    const handler = (_event: any, err: any) => callback(err)
    ipcRenderer.on('updater:error', handler)
    return () => ipcRenderer.removeListener('updater:error', handler)
  },
  onOpenUpdateModal: (callback) => {
    const handler = () => callback()
    ipcRenderer.on('open-update-modal', handler)
    return () => ipcRenderer.removeListener('open-update-modal', handler)
  }
}

contextBridge.exposeInMainWorld('electronAPI', api)

declare global {
  interface Window {
    electronAPI: IpcApi
  }
}
