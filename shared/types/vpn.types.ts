export type AppMode = 'home' | 'office' | 'gaming'

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'disconnecting' | 'error'

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
