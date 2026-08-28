import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import {
  getRealExePath,
  getAppDataDir,
  getProfilesDir,
  ensureCachedIcons
} from '../../electron/utils/paths'

describe('Path Utilities & Asset Discovery', () => {
  it('should return valid real executable path', () => {
    const exePath = getRealExePath()
    expect(typeof exePath).toBe('string')
    expect(exePath.length).toBeGreaterThan(0)
  })

  it('should return valid AppData path and profiles directory', () => {
    const appData = getAppDataDir()
    expect(typeof appData).toBe('string')
    expect(appData.length).toBeGreaterThan(0)

    const profilesDir = getProfilesDir()
    expect(typeof profilesDir).toBe('string')
    expect(fs.existsSync(profilesDir)).toBe(true)
  })

  it('should ensure cached icon paths without errors', () => {
    const icons = ensureCachedIcons()
    expect(icons).toBeDefined()
    expect(icons.icoPath).toContain('app_icon.ico')
    expect(icons.pngPath).toContain('app_icon.png')
  })
})
