import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('electron', () => ({
  app: {
    getVersion: vi.fn(() => '1.5.2'),
    isPackaged: false
  },
  BrowserWindow: vi.fn(),
  Notification: {
    isSupported: vi.fn(() => false)
  }
}))

vi.mock('electron-updater', () => {
  const listeners: Record<string, Function> = {}
  return {
    autoUpdater: {
      autoDownload: false,
      autoInstallOnAppQuit: false,
      setFeedURL: vi.fn(),
      on: vi.fn((event: string, cb: Function) => {
        listeners[event] = cb
      }),
      checkForUpdates: vi.fn(async () => ({ updateInfo: { version: '1.5.2' } })),
      downloadUpdate: vi.fn(async () => {}),
      quitAndInstall: vi.fn()
    }
  }
})

import { UpdaterService } from '../../electron/services/updater.service'

describe('UpdaterService GitHub Releases Manager', () => {
  let updaterService: UpdaterService

  beforeEach(() => {
    updaterService = UpdaterService.getInstance()
  })

  it('should initialize with window resolver', () => {
    const dummyWindowResolver = vi.fn(() => null)
    expect(() => updaterService.init(dummyWindowResolver)).not.toThrow()
  })

  it('should return dev mode response or status on manual check in dev environment', async () => {
    const res = await updaterService.checkForUpdates()
    expect(res).toBeDefined()
    expect(typeof res.success).toBe('boolean')
  })

  it('should handle downloadUpdate call safely', async () => {
    const res = await updaterService.downloadUpdate()
    expect(res).toBeDefined()
    expect(typeof res.success).toBe('boolean')
  })
})
