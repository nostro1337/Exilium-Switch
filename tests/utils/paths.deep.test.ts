import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

import { ensureCachedIcons, getAppDataDir, getProfilesDir, getRealExePath } from '../../electron/utils/paths'

describe('Path Utilities Full Branch Coverage', () => {
  it('should test existing icon caching branches', () => {
    const appData = getAppDataDir()
    const icoPath = path.join(appData, 'app_icon.ico')
    const pngPath = path.join(appData, 'app_icon.png')

    // Create dummy icons so fs.existsSync(icoPath) and (pngPath) return true
    fs.mkdirSync(appData, { recursive: true })
    fs.writeFileSync(icoPath, 'DUMMY_ICO')
    fs.writeFileSync(pngPath, 'DUMMY_PNG')

    const icons = ensureCachedIcons()
    expect(icons.icoPath).toBe(icoPath)
    expect(icons.pngPath).toBe(pngPath)

    // Test getProfilesDir creating folder if missing
    const profilesDir = getProfilesDir()
    expect(fs.existsSync(profilesDir)).toBe(true)

    // Test getRealExePath
    const exe = getRealExePath()
    expect(exe).toBeDefined()
  })
})
