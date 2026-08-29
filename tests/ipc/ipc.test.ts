import { describe, it, expect, vi } from 'vitest'

// Mock Electron ipcMain and dialog for headless test environment
vi.mock('electron', () => {
  const handlers: Record<string, Function> = {}
  const listeners: Record<string, Function> = {}

  return {
    ipcMain: {
      handle: vi.fn((channel: string, handler: Function) => {
        handlers[channel] = handler
      }),
      on: vi.fn((channel: string, listener: Function) => {
        listeners[channel] = listener
      })
    },
    dialog: {
      showOpenDialog: vi.fn(async () => ({ canceled: true, filePaths: [] })),
      showSaveDialog: vi.fn(async () => ({ canceled: true, filePath: '' }))
    },
    app: {
      getPath: vi.fn(() => 'C:\\MockAppData'),
      getAppPath: vi.fn(() => 'C:\\MockAppPath'),
      getVersion: vi.fn(() => '1.5.7'),
      quit: vi.fn()
    }
  }
})

import { registerAllIpcHandlers } from '../../electron/ipc'
import { registerVpnIpc } from '../../electron/ipc/vpn.ipc'
import { registerProfilesIpc } from '../../electron/ipc/profiles.ipc'
import { registerSettingsIpc } from '../../electron/ipc/settings.ipc'
import { registerSystemIpc } from '../../electron/ipc/system.ipc'
import { registerLogsIpc } from '../../electron/ipc/logs.ipc'
import { registerUpdaterIpc } from '../../electron/ipc/updater.ipc'
import { registerWindowIpc } from '../../electron/ipc/window.ipc'

describe('IPC Subsystem Registrars', () => {
  it('should register individual IPC submodules without throwing errors', () => {
    expect(() => registerVpnIpc()).not.toThrow()
    expect(() => registerProfilesIpc()).not.toThrow()
    expect(() => registerSettingsIpc()).not.toThrow()
    expect(() => registerSystemIpc()).not.toThrow()
    expect(() => registerLogsIpc()).not.toThrow()
    expect(() => registerUpdaterIpc()).not.toThrow()
    expect(() => registerWindowIpc()).not.toThrow()
  })

  it('should register master bundle registerAllIpcHandlers seamlessly', () => {
    expect(() => registerAllIpcHandlers()).not.toThrow()
  })
})
