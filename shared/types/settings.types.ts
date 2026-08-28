import type { AppMode } from './vpn.types'

export interface AppSettings {
  realZone: string
  fakeZone: string
  autoStart: boolean
  minimizeToTray: boolean
  startMinimized: boolean
  activeProfileId?: string
  appMode?: AppMode
  activeProfileIdByMode?: Partial<Record<AppMode, string>> | Record<string, string>
}

export const DEFAULT_SETTINGS: AppSettings = {
  realZone: 'Russian Standard Time',
  fakeZone: 'W. Europe Standard Time',
  autoStart: false,
  minimizeToTray: true,
  startMinimized: false,
  activeProfileId: undefined,
  appMode: 'home',
  activeProfileIdByMode: {}
}
