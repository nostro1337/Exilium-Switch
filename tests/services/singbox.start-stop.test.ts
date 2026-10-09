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
      kill: vi.fn(),
      unref: vi.fn()
    }))
  }
})

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => 'C:\\MockAppData'),
    getAppPath: vi.fn(() => 'C:\\MockAppPath'),
    getVersion: vi.fn(() => '1.5.9'),
    quit: vi.fn()
  },
  BrowserWindow: vi.fn(),
  Notification: {
    isSupported: vi.fn(() => false)
  }
}))

import fs from 'node:fs'
import { SingBoxService } from '../../electron/services/singbox.service'
import { ProfileService } from '../../electron/services/profile.service'
import { NetworkService } from '../../electron/services/network.service'
import { LogService } from '../../electron/services/log.service'

describe('SingBoxService Start/Stop Unit Execution', () => {
  let singboxService: SingBoxService

  beforeEach(() => {
    vi.restoreAllMocks()
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

  it('should spawn sing-box and resolve true when process is alive', async () => {
    vi.spyOn(singboxService, 'getBinaryPath').mockReturnValue({
      exePath: 'C:\\sing-box\\sing-box.exe',
      dir: 'C:\\sing-box'
    })
    vi.spyOn(ProfileService.getInstance(), 'getActiveProfile').mockReturnValueOnce({
      id: 'active-mock',
      name: 'Active Mock',
      path: 'C:\\test.json',
      mode: 'home',
      createdAt: Date.now()
    })
    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
    vi.spyOn(NetworkService.getInstance(), 'flushDns').mockResolvedValue()
    vi.spyOn(process, 'kill').mockImplementation(() => true as any)
    vi.spyOn(singboxService, 'isRunning').mockResolvedValueOnce(false).mockResolvedValue(true)

    const res = await singboxService.start()
    expect(res).toBe(true)
  })
})
