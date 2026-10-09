import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../../electron/utils/exec', () => ({
  execFileAsync: vi.fn(async () => ({ stdout: '', stderr: '' })),
  execFileSyncSafe: vi.fn(() => ''),
  setRegistryDword: vi.fn(async () => true)
}))

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

import { SingBoxService } from '../../electron/services/singbox.service'
import { ProfileService } from '../../electron/services/profile.service'
import { SettingsService } from '../../electron/services/settings.service'
import { ResidentShieldService } from '../../electron/services/resident-shield.service'
import { ZapretService } from '../../electron/services/zapret.service'
import * as execModule from '../../electron/utils/exec'

describe('SingBoxService Comprehensive Engine Testing', () => {
  let singboxService: SingBoxService
  let profileService: ProfileService
  let settingsService: SettingsService
  let residentService: ResidentShieldService
  let zapretService: ZapretService

  beforeEach(() => {
    singboxService = SingBoxService.getInstance()
    profileService = ProfileService.getInstance()
    settingsService = SettingsService.getInstance()
    residentService = ResidentShieldService.getInstance()
    zapretService = ZapretService.getInstance()
    vi.restoreAllMocks()
  })

  it('should test getStatus and toggle transitions', async () => {
    const status = await singboxService.getStatus()
    expect(status).toBeDefined()
    expect(typeof status.isRunning).toBe('boolean')

    // Test toggle logic
    const toggleRes = await singboxService.toggle(false)
    expect(toggleRes).toBeDefined()
  }, 20000)

  it('should test profile selection error handling on invalid IDs', () => {
    const res = profileService.selectProfile('non-existent-uuid-999')
    expect(res.success).toBe(false)

    const delRes = profileService.deleteProfile('non-existent-uuid-999')
    expect(delRes).toBeDefined()
  })

  it('should handle stop safely and respect isRunning checkExternal flag', async () => {
    const stopRes = await singboxService.stop()
    expect(stopRes).toBe(true)

    const runningDirect = await singboxService.isRunning(false)
    expect(runningDirect).toBe(false)

    vi.spyOn(execModule, 'execFileAsync').mockResolvedValueOnce({
      stdout: '"sing-box.exe","1234","Console","1","5,432 K"',
      stderr: ''
    })
    const runningExt = await singboxService.isRunning(true)
    expect(runningExt).toBe(true)
  })

  it('should fail toggle(true) when no active profile exists', async () => {
    vi.spyOn(profileService, 'getActiveProfile').mockReturnValueOnce(null)
    const res = await singboxService.toggle(true)
    expect(res.success).toBe(false)
    expect(res.error).toContain('Сначала добавьте .json конфиг')
  })

  it('should successfully toggle(true) in home mode with resident shield enabled', async () => {
    vi.spyOn(singboxService, 'isRunning').mockResolvedValue(false)
    vi.spyOn(profileService, 'getActiveProfile').mockReturnValue({
      id: 'test-p1',
      name: 'Test Profile',
      path: 'C:\\test.json',
      mode: 'home',
      createdAt: Date.now()
    })
    vi.spyOn(settingsService, 'loadSettings').mockReturnValue({
      appMode: 'home',
      fakeZone: 'W. Europe Standard Time',
      realZone: 'Tomsk Standard Time'
    } as any)

    const enableResidentSpy = vi.spyOn(residentService, 'enableResidentMode').mockResolvedValue()
    const pauseZapretSpy = vi.spyOn(zapretService, 'pauseZapretIfRunning').mockResolvedValue(true)
    const startSpy = vi.spyOn(singboxService, 'start').mockResolvedValue(true)

    const res = await singboxService.toggle(true)
    expect(res.success).toBe(true)
    expect(res.isRunning).toBe(true)
    expect(enableResidentSpy).toHaveBeenCalledWith('W. Europe Standard Time')
    expect(pauseZapretSpy).toHaveBeenCalled()
    expect(startSpy).toHaveBeenCalled()
  })

  it('should rollback resident mode and resume zapret if start() fails', async () => {
    vi.spyOn(singboxService, 'isRunning').mockResolvedValue(false)
    vi.spyOn(profileService, 'getActiveProfile').mockReturnValue({
      id: 'test-p1',
      name: 'Test Profile',
      path: 'C:\\test.json',
      mode: 'home',
      createdAt: Date.now()
    })
    vi.spyOn(settingsService, 'loadSettings').mockReturnValue({
      appMode: 'home',
      fakeZone: 'W. Europe Standard Time',
      realZone: 'Tomsk Standard Time'
    } as any)

    vi.spyOn(residentService, 'enableResidentMode').mockResolvedValue()
    const disableResidentSpy = vi.spyOn(residentService, 'disableResidentMode').mockResolvedValue()
    const resumeZapretSpy = vi.spyOn(zapretService, 'resumeZapretIfPaused').mockResolvedValue(true)
    vi.spyOn(singboxService, 'start').mockResolvedValue(false)

    const res = await singboxService.toggle(true)
    expect(res.success).toBe(false)
    expect(res.isRunning).toBe(false)
    expect(disableResidentSpy).toHaveBeenCalledWith('Tomsk Standard Time')
    expect(resumeZapretSpy).toHaveBeenCalled()
  })

  it('should successfully toggle(false) when running and disable resident shield', async () => {
    vi.spyOn(singboxService, 'isRunning').mockResolvedValueOnce(true)
    vi.spyOn(settingsService, 'loadSettings').mockReturnValue({
      appMode: 'home',
      fakeZone: 'W. Europe Standard Time',
      realZone: 'Tomsk Standard Time'
    } as any)

    const stopSpy = vi.spyOn(singboxService, 'stop').mockResolvedValue(true)
    const disableResidentSpy = vi.spyOn(residentService, 'disableResidentMode').mockResolvedValue()
    const resumeZapretSpy = vi.spyOn(zapretService, 'resumeZapretIfPaused').mockResolvedValue(true)

    const res = await singboxService.toggle(false)
    expect(res.success).toBe(true)
    expect(res.isRunning).toBe(false)
    expect(stopSpy).toHaveBeenCalled()
    expect(disableResidentSpy).toHaveBeenCalledWith('Tomsk Standard Time')
    expect(resumeZapretSpy).toHaveBeenCalled()
  })

  it('should toggle(true) in office mode without altering network adapters', async () => {
    vi.spyOn(singboxService, 'isRunning').mockResolvedValue(false)
    vi.spyOn(profileService, 'getActiveProfile').mockReturnValue({
      id: 'office-p1',
      name: 'Office Profile',
      path: 'C:\\office.json',
      mode: 'office',
      createdAt: Date.now()
    })
    vi.spyOn(settingsService, 'loadSettings').mockReturnValue({
      appMode: 'office'
    } as any)

    const enableResidentSpy = vi.spyOn(residentService, 'enableResidentMode')
    vi.spyOn(singboxService, 'start').mockResolvedValue(true)

    const res = await singboxService.toggle(true)
    expect(res.success).toBe(true)
    expect(res.isRunning).toBe(true)
    expect(enableResidentSpy).not.toHaveBeenCalled()
  })
})
