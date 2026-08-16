import { contextBridge, ipcRenderer } from 'electron'

export interface AppSettings {
  realZone: string
  fakeZone: string
  autoStart: boolean
  minimizeToTray: boolean
  startMinimized: boolean
  activeProfileId?: string
}

export interface ConfigProfile {
  id: string
  name: string
  filename: string
  path: string
  createdAt: number
  isDefault?: boolean
  isActive?: boolean
}

export interface VpnStatus {
  isRunning: boolean
  pid?: number
  currentZone: string
  lfsvcStatus: string
  uptimeSeconds: number
  startTime?: number
  activeProfileName?: string
}

export interface IpcApi {
  getStatus: () => Promise<VpnStatus>
  toggleVpn: (enable?: boolean) => Promise<{ success: boolean; isRunning: boolean; error?: string }>
  getSettings: () => Promise<AppSettings>
  saveSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>
  testLatency: () => Promise<{ latencyMs: number | null; error?: string }>
  minimizeWindow: () => void
  closeWindow: () => void
  onLog: (callback: (log: { time: string; text: string; type: 'info' | 'warn' | 'error' | 'success' | 'dev' }) => void) => () => void
  onStatusChange: (callback: (status: VpnStatus) => void) => () => void
  getRecentLogs: () => Promise<Array<{ time: string; text: string; type: 'info' | 'warn' | 'error' | 'success' | 'dev' }>>
  
  // Profile Management
  getProfiles: () => Promise<ConfigProfile[]>
  importProfile: () => Promise<{ success: boolean; profile?: ConfigProfile; error?: string }>
  selectProfile: (profileId: string) => Promise<{ success: boolean; error?: string }>
  deleteProfile: (profileId: string) => Promise<{ success: boolean; error?: string }>
  
  // Log Export & File Operations
  exportLogs: () => Promise<{ success: boolean; savedPath?: string; error?: string }>
  openLogsFolder: () => Promise<void>
}

const api: IpcApi = {
  getStatus: () => ipcRenderer.invoke('get-status'),
  toggleVpn: (enable) => ipcRenderer.invoke('toggle-vpn', enable),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
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
  getProfiles: () => ipcRenderer.invoke('get-profiles'),
  importProfile: () => ipcRenderer.invoke('import-profile'),
  selectProfile: (profileId) => ipcRenderer.invoke('select-profile', profileId),
  deleteProfile: (profileId) => ipcRenderer.invoke('delete-profile', profileId),
  
  // Export Logs
  exportLogs: () => ipcRenderer.invoke('export-logs'),
  openLogsFolder: () => ipcRenderer.invoke('open-logs-folder')
}

contextBridge.exposeInMainWorld('electronAPI', api)

declare global {
  interface Window {
    electronAPI: IpcApi
  }
}
