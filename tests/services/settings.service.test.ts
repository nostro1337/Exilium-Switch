import { describe, it, expect, beforeEach, vi } from 'vitest'
import fs from 'node:fs'
import { SettingsService } from '../../electron/services/settings.service'

describe('SettingsService Configuration Engine', () => {
  let settingsService: SettingsService

  beforeEach(() => {
    settingsService = SettingsService.getInstance()
  })

  it('should return default settings when configuration is requested', () => {
    const settings = settingsService.loadSettings()
    expect(settings).toBeDefined()
    expect(settings.fakeZone).toBeDefined()
    expect(settings.realZone).toBeDefined()
    expect(typeof settings.autoStart).toBe('boolean')
    expect(typeof settings.minimizeToTray).toBe('boolean')
  })

  it('should merge partial settings updates without mutating unrelated keys', () => {
    const original = settingsService.loadSettings()
    const updated = settingsService.saveSettings({ appMode: 'office' })

    expect(updated.appMode).toBe('office')
    expect(updated.minimizeToTray).toBe(original.minimizeToTray)
    expect(updated.fakeZone).toBe(original.fakeZone)
  })
})
