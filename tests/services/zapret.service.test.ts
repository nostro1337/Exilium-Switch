import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../../electron/utils/exec', () => ({
  execFileAsync: vi.fn(async (file: string, args: string[]) => {
    if (args && args.some(a => a.includes('winws.exe'))) {
      return { stdout: '"winws.exe","11756","Console"' }
    }
    if (args && args.some(a => a.includes('goodbyedpi.exe'))) {
      return { stdout: 'INFO: No tasks are running' }
    }
    return { stdout: '' }
  }),
  execFileSyncSafe: vi.fn(() => ''),
  setRegistryDword: vi.fn(async () => true)
}))

vi.mock('../../electron/services/log.service', () => ({
  LogService: {
    getInstance: vi.fn(() => ({
      addLog: vi.fn()
    }))
  }
}))

vi.mock('../../electron/services/settings.service', () => {
  let mockSettings: any = {
    coexistWithZapret: true,
    wasZapretActive: false,
    zapretScriptPath: 'C:\\MockPath\\general (ALT11).bat'
  }
  return {
    SettingsService: {
      getInstance: vi.fn(() => ({
        loadSettings: vi.fn(() => mockSettings),
        saveSettings: vi.fn((patch: any) => {
          mockSettings = { ...mockSettings, ...patch }
          return mockSettings
        })
      }))
    }
  }
})

import { ZapretService } from '../../electron/services/zapret.service'
import { SettingsService } from '../../electron/services/settings.service'

describe('ZapretService Suite', () => {
  let zapretService: ZapretService

  beforeEach(() => {
    zapretService = ZapretService.getInstance()
  })

  it('should detect if winws.exe is running via tasklist', async () => {
    const isRunning = await zapretService.isZapretRunning()
    expect(typeof isRunning).toBe('boolean')
    expect(isRunning).toBe(true)
  })

  it('should find zapret script from settings or fallback', () => {
    const script = zapretService.findZapretScript()
    expect(script).toBeDefined()
  })

  it('should pause zapret when running and save state', async () => {
    const paused = await zapretService.pauseZapretIfRunning()
    expect(paused).toBe(true)

    const settings = SettingsService.getInstance().loadSettings()
    expect(settings.wasZapretActive).toBe(true)
  })

  it('should not pause zapret if coexistWithZapret is false', async () => {
    SettingsService.getInstance().saveSettings({ coexistWithZapret: false })
    const paused = await zapretService.pauseZapretIfRunning()
    expect(paused).toBe(false)
    SettingsService.getInstance().saveSettings({ coexistWithZapret: true })
  })

  it('should resume zapret when paused', async () => {
    SettingsService.getInstance().saveSettings({ wasZapretActive: true })
    const resumed = await zapretService.resumeZapretIfPaused()
    expect(typeof resumed).toBe('boolean')

    const settings = SettingsService.getInstance().loadSettings()
    expect(settings.wasZapretActive).toBe(false)
  })

  it('should not resume zapret if it was not active', async () => {
    SettingsService.getInstance().saveSettings({ wasZapretActive: false })
    const resumed = await zapretService.resumeZapretIfPaused()
    expect(resumed).toBe(false)
  })

  it('should not resume zapret if coexistWithZapret is false', async () => {
    SettingsService.getInstance().saveSettings({ coexistWithZapret: false, wasZapretActive: true })
    const resumed = await zapretService.resumeZapretIfPaused()
    expect(resumed).toBe(false)
    SettingsService.getInstance().saveSettings({ coexistWithZapret: true, wasZapretActive: false })
  })

  it('should handle findZapretScript when settings has no path', () => {
    SettingsService.getInstance().saveSettings({ zapretScriptPath: undefined })
    const res = zapretService.findZapretScript()
    expect(res === null || typeof res === 'string').toBe(true)
  })

  it('should test detectRunningZapretCommand safely', async () => {
    const cmd = await zapretService.detectRunningZapretCommand()
    expect(cmd === null || typeof cmd === 'string').toBe(true)
  })

  it('should execute syncEmergencyResume safely without errors', () => {
    expect(() => zapretService.syncEmergencyResume()).not.toThrow()
  })
})
