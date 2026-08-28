import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

import { ensureCachedIcons, getAppDataDir } from '../../electron/utils/paths'

describe('Path Utilities Icon Copy Branch Coverage', () => {
  it('should copy candidate icons when cached icons do not exist in appData', () => {
    const appData = getAppDataDir()
    const icoPath = path.join(appData, 'app_icon.ico')
    const pngPath = path.join(appData, 'app_icon.png')

    // Remove cached icons if exist
    if (fs.existsSync(icoPath)) {
      try { fs.unlinkSync(icoPath) } catch {}
    }
    if (fs.existsSync(pngPath)) {
      try { fs.unlinkSync(pngPath) } catch {}
    }

    const icons = ensureCachedIcons()
    expect(icons.icoPath).toBe(icoPath)
    expect(icons.pngPath).toBe(pngPath)
  })
})
