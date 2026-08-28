import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>()
  return {
    ...actual,
    spawn: vi.fn(() => ({
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn(),
      pid: 8888,
      kill: vi.fn()
    }))
  }
})

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => 'C:\\MockAppData'),
    getAppPath: vi.fn(() => 'C:\\MockAppPath'),
    getVersion: vi.fn(() => '1.5.3'),
    quit: vi.fn()
  },
  BrowserWindow: vi.fn(),
  Notification: {
    isSupported: vi.fn(() => false)
  }
}))

import { SingBoxService } from '../../electron/services/singbox.service'
import { ProfileService } from '../../electron/services/profile.service'

describe('SingBoxService Start/Stop Unit Execution', () => {
  let singboxService: SingBoxService

  beforeEach(() => {
    singboxService = SingBoxService.getInstance()
  })

  it('should return false on singbox start when binary is missing or profile is not chosen', async () => {
    vi.spyOn(singboxService, 'getBinaryPath').mockReturnValueOnce(null)
    const res = await singboxService.start()
    expect(res).toBe(false)
  })

  it('should return false on singbox start when active profile has invalid config file', async () => {
    vi.spyOn(singboxService, 'getBinaryPath').mockReturnValueOnce({
      exePath: 'C:\\sing-box\\sing-box.exe',
      dir: 'C:\\sing-box'
    })
    vi.spyOn(ProfileService.getInstance(), 'getActiveProfile').mockReturnValueOnce(null)

    const res = await singboxService.start()
    expect(res).toBe(false)
  })
})
