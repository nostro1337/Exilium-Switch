import { describe, it, expect, beforeEach, vi } from 'vitest'

import { SettingsService } from '../../electron/services/settings.service'

describe('SettingsService Sync Branch Coverage', () => {
  it('should test saveSettings enabling autoStart and startMinimized', () => {
    const settings = SettingsService.getInstance()
    const res = settings.saveSettings({
      autoStart: true,
      startMinimized: true,
      minimizeToTray: false
    })

    expect(res.autoStart).toBe(true)
    expect(res.startMinimized).toBe(true)
    expect(res.minimizeToTray).toBe(false)
  })
})
