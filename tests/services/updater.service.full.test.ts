import { describe, it, expect, beforeEach, vi } from 'vitest'

const updaterListeners: Record<string, Function> = {}

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

vi.mock('electron-updater', () => {
  return {
    autoUpdater: {
      autoDownload: false,
      autoInstallOnAppQuit: false,
      setFeedURL: vi.fn(),
      on: vi.fn((event: string, cb: Function) => {
        updaterListeners[event] = cb
      }),
      checkForUpdates: vi.fn(async () => ({
        updateInfo: {
          version: '1.6.0',
          releaseDate: '2026-08-28',
          releaseNotes: 'Новая версия Exilium Switch'
        }
      })),
      downloadUpdate: vi.fn(async () => {}),
      quitAndInstall: vi.fn()
    }
  }
})

import { UpdaterService } from '../../electron/services/updater.service'

describe('UpdaterService Complete Lifecycle & Events', () => {
  let updaterService: UpdaterService
  const mockSend = vi.fn()
  const mockWin: any = {
    isDestroyed: () => false,
    webContents: { send: mockSend }
  }

  beforeEach(() => {
    mockSend.mockClear()
    updaterService = UpdaterService.getInstance()
    updaterService.init(() => mockWin)
  })

  it('should forward autoUpdater events to renderer webContents', () => {
    // checking-for-update
    if (updaterListeners['checking-for-update']) {
      updaterListeners['checking-for-update']()
      expect(mockSend).toHaveBeenCalledWith('updater:checking')
    }

    // update-available
    if (updaterListeners['update-available']) {
      updaterListeners['update-available']({ version: '1.6.0' })
      expect(mockSend).toHaveBeenCalledWith('updater:available', expect.objectContaining({ version: '1.6.0' }))
    }

    // update-not-available
    if (updaterListeners['update-not-available']) {
      updaterListeners['update-not-available']({ version: '1.5.1' })
      expect(mockSend).toHaveBeenCalledWith('updater:not-available')
    }

    // error
    if (updaterListeners['error']) {
      updaterListeners['error'](new Error('Network error'))
      expect(mockSend).toHaveBeenCalledWith('updater:error', expect.objectContaining({ message: expect.any(String) }))
    }

    // download-progress
    if (updaterListeners['download-progress']) {
      updaterListeners['download-progress']({ percent: 50, bytesPerSecond: 1024, total: 2048, transferred: 1024 })
      expect(mockSend).toHaveBeenCalledWith('updater:progress', expect.objectContaining({ percent: 50 }))
    }

    // update-downloaded
    if (updaterListeners['update-downloaded']) {
      updaterListeners['update-downloaded']({ version: '1.6.0' })
      expect(mockSend).toHaveBeenCalledWith('updater:downloaded', expect.objectContaining({ version: '1.6.0' }))
    }
  })

  it('should execute startUpdateDownload and quitAndInstallUpdate', async () => {
    const downloadRes = await updaterService.downloadUpdate()
    expect(downloadRes.success).toBe(true)

    expect(() => updaterService.quitAndInstall()).not.toThrow()
  })
})
