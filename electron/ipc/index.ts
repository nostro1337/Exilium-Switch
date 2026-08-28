import { registerVpnIpc } from './vpn.ipc'
import { registerProfilesIpc } from './profiles.ipc'
import { registerSettingsIpc } from './settings.ipc'
import { registerSystemIpc } from './system.ipc'
import { registerLogsIpc } from './logs.ipc'
import { registerUpdaterIpc } from './updater.ipc'
import { registerWindowIpc } from './window.ipc'

export function registerAllIpcHandlers(): void {
  registerVpnIpc()
  registerProfilesIpc()
  registerSettingsIpc()
  registerSystemIpc()
  registerLogsIpc()
  registerUpdaterIpc()
  registerWindowIpc()
}
