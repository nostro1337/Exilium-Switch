import { describe, it, expect, beforeEach, vi } from 'vitest'

const listeners: Record<string, Function> = {}
const handlers: Record<string, Function> = {}

let mockMaximized = false
const mockWindow = {
  isDestroyed: vi.fn(() => false),
  minimize: vi.fn(),
  maximize: vi.fn(() => { mockMaximized = true }),
  unmaximize: vi.fn(() => { mockMaximized = false }),
  isMaximized: vi.fn(() => mockMaximized),
  hide: vi.fn()
}

vi.mock('electron', () => ({
  ipcMain: {
    on: vi.fn((channel: string, cb: Function) => {
      listeners[channel] = cb
    }),
    handle: vi.fn((channel: string, cb: Function) => {
      handlers[channel] = cb
    })
  },
  app: {
    quit: vi.fn(),
    getPath: vi.fn(() => 'C:\\MockAppData'),
    getAppPath: vi.fn(() => 'C:\\MockAppPath'),
    getVersion: vi.fn(() => '1.5.6')
  }
}))

vi.mock('../../electron/core/window-manager', () => ({
  WindowManager: {
    getInstance: vi.fn(() => ({
      getWindow: vi.fn(() => mockWindow),
      setQuitting: vi.fn()
    }))
  }
}))

vi.mock('../../electron/services/settings.service', () => ({
  SettingsService: {
    getInstance: vi.fn(() => ({
      loadSettings: vi.fn(() => ({ minimizeToTray: false }))
    }))
  }
}))

import { registerWindowIpc } from '../../electron/ipc/window.ipc'
import { IPC_CHANNELS } from '../../shared/ipc-channels'

describe('Window IPC Handlers Suite', () => {
  beforeEach(() => {
    registerWindowIpc()
  })

  it('should handle WINDOW_MINIMIZE', () => {
    listeners[IPC_CHANNELS.WINDOW_MINIMIZE]()
    expect(mockWindow.minimize).toHaveBeenCalled()
  })

  it('should handle WINDOW_TOGGLE_MAXIMIZE when not maximized', () => {
    mockMaximized = false
    listeners[IPC_CHANNELS.WINDOW_TOGGLE_MAXIMIZE]()
    expect(mockWindow.maximize).toHaveBeenCalled()
  })

  it('should handle WINDOW_TOGGLE_MAXIMIZE when already maximized', () => {
    mockMaximized = true
    listeners[IPC_CHANNELS.WINDOW_TOGGLE_MAXIMIZE]()
    expect(mockWindow.unmaximize).toHaveBeenCalled()
  })

  it('should handle WINDOW_IS_MAXIMIZED query', async () => {
    mockMaximized = true
    const res = await handlers[IPC_CHANNELS.WINDOW_IS_MAXIMIZED]()
    expect(res).toBe(true)
  })

  it('should handle WINDOW_CLOSE when minimizeToTray is false', () => {
    listeners[IPC_CHANNELS.WINDOW_CLOSE]()
    expect(mockWindow.hide).not.toHaveBeenCalled()
  })
})
