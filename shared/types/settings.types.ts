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
  coexistWithZapret?: boolean
  zapretScriptPath?: string
  wasZapretActive?: boolean
  geminiApiKey?: string
  aiEnabled?: boolean
  aiTelemetryInterval?: number // in ms (e.g. 5000)
}

export const DEFAULT_SETTINGS: AppSettings = {
  realZone: 'Tomsk Standard Time',
  fakeZone: 'W. Europe Standard Time',
  autoStart: false,
  minimizeToTray: true,
  startMinimized: false,
  activeProfileId: undefined,
  appMode: 'home',
  activeProfileIdByMode: {},
  coexistWithZapret: true,
  zapretScriptPath: undefined,
  wasZapretActive: false,
  geminiApiKey: '',
  aiEnabled: true,
  aiTelemetryInterval: 5000
}

