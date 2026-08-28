import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'

export function getRealExePath(): string {
  if (process.env.PORTABLE_EXECUTABLE_FILE && fs.existsSync(process.env.PORTABLE_EXECUTABLE_FILE)) {
    return process.env.PORTABLE_EXECUTABLE_FILE
  }
  return process.execPath
}

export function getAppDataDir(): string {
  return app.getPath('userData')
}

export function getProfilesDir(): string {
  const dir = path.join(getAppDataDir(), 'profiles')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

export function ensureCachedIcons(): { icoPath: string; pngPath: string } {
  const appData = getAppDataDir()
  const icoPath = path.join(appData, 'app_icon.ico')
  const pngPath = path.join(appData, 'app_icon.png')

  try {
    if (!fs.existsSync(icoPath)) {
      const candidates = [
        path.join(app.getAppPath(), 'ExiliumSwitchIcon.ico'),
        path.join(app.getAppPath(), 'build', 'icon.ico'),
        path.join(process.resourcesPath, 'ExiliumSwitchIcon.ico'),
        path.join(process.resourcesPath, 'icon.ico'),
        path.resolve('ExiliumSwitchIcon.ico')
      ]
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          fs.copyFileSync(candidate, icoPath)
          break
        }
      }
    }

    if (!fs.existsSync(pngPath)) {
      const candidates = [
        path.join(app.getAppPath(), 'build', 'icon.png'),
        path.join(app.getAppPath(), 'public', 'icon.png'),
        path.join(process.resourcesPath, 'icon.png'),
        path.resolve('build', 'icon.png')
      ]
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          fs.copyFileSync(candidate, pngPath)
          break
        }
      }
    }
  } catch (err) {
    console.error('ensureCachedIcons error:', err)
  }

  return { icoPath, pngPath }
}
