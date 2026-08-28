import { describe, it, expect, beforeEach, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

import { FailsafeService } from '../../electron/services/failsafe.service'
import { SettingsService } from '../../electron/services/settings.service'
import { ensureCachedIcons, getAppDataDir, getRealExePath } from '../../electron/utils/paths'

describe('Deep Edge Cases & Branch Coverage Suite', () => {
  it('should test paths and ensureCachedIcons branches', () => {
    const exe = getRealExePath()
    expect(exe).toBeDefined()

    const appData = getAppDataDir()
    expect(appData).toBeDefined()

    const icons = ensureCachedIcons()
    expect(icons.icoPath).toBeDefined()
    expect(icons.pngPath).toBeDefined()
  })

  it('should handle corrupt settings file recovery', () => {
    const settingsService = SettingsService.getInstance()
    const appData = getAppDataDir()
    const configPath = path.join(appData, 'settings.json')

    // Write corrupted JSON
    fs.writeFileSync(configPath, 'INVALID_JSON_CORRUPT{')
    const recovered = settingsService.loadSettings()
    expect(recovered).toBeDefined()
    expect(recovered.realZone).toBe('Tomsk Standard Time')
  })

  it('should run failsafe sanitation multiple times idempotently', async () => {
    const failsafe = FailsafeService.getInstance()
    await expect(failsafe.runStartupSanitation()).resolves.not.toThrow()
    await expect(failsafe.runStartupSanitation()).resolves.not.toThrow()
  })
})
