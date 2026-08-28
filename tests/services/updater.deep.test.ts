import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockSend = vi.fn()
const mockWin: any = {
  isDestroyed: () => false,
  webContents: { send: mockSend }
}

vi.mock('electron-updater', () => {
  return {
    autoUpdater: {
      autoDownload: false,
      autoInstallOnAppQuit: false,
      setFeedURL: vi.fn(),
      on: vi.fn(),
      checkForUpdates: vi.fn(async () => ({
        updateInfo: {
          version: '1.6.0',
          releaseDate: '2026-08-28',
          releaseNotes: 'Update notes'
        }
      })),
      downloadUpdate: vi.fn(async () => {}),
      quitAndInstall: vi.fn()
    }
  }
})

vi.mock('electron', () => ({
  app: {
    getVersion: vi.fn(() => '1.5.1'),
    isPackaged: true
  },
  BrowserWindow: vi.fn(),
  Notification: {
    isSupported: vi.fn(() => false)
  }
}))

import { UpdaterService } from '../../electron/services/updater.service'

describe('UpdaterService Deep Testing Suite', () => {
  let updaterService: UpdaterService

  beforeEach(() => {
    updaterService = UpdaterService.getInstance()
    updaterService.init(() => mockWin)
  })

  it('should check for updates and return update result object', async () => {
    const res = await updaterService.checkForUpdates()
    expect(res.success).toBe(true)
    expect(res.updateAvailable).toBe(true)
    expect(res.version).toBe('1.6.0')
  })

  it('should download update successfully', async () => {
    const res = await updaterService.downloadUpdate()
    expect(res.success).toBe(true)
  })
})
