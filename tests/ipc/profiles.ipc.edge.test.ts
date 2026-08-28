import { describe, it, expect, beforeEach, vi } from 'vitest'

const handlers: Record<string, Function> = {}

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: Function) => {
      handlers[channel] = handler
    }),
    on: vi.fn()
  },
  dialog: {
    showOpenDialog: vi.fn(async () => ({ canceled: true, filePaths: [] })),
    showSaveDialog: vi.fn(async () => ({ canceled: true, filePath: '' }))
  },
  app: {
    getPath: vi.fn(() => 'C:\\MockAppData'),
    getAppPath: vi.fn(() => 'C:\\MockAppPath'),
    getVersion: vi.fn(() => '1.5.1'),
    quit: vi.fn()
  },
  BrowserWindow: vi.fn()
}))

import { registerProfilesIpc } from '../../electron/ipc/profiles.ipc'
import { IPC_CHANNELS } from '../../shared/ipc-channels'

describe('Profiles IPC Edge Handlers', () => {
  beforeEach(() => {
    registerProfilesIpc()
  })

  it('should handle selecting invalid profile ID gracefully', async () => {
    const res = await handlers[IPC_CHANNELS.SELECT_PROFILE]({}, '')
    expect(res.success).toBe(false)
  })

  it('should handle deleting invalid profile ID gracefully', async () => {
    const res = await handlers[IPC_CHANNELS.DELETE_PROFILE]({}, '')
    expect(res.success).toBe(false)
  })
})
