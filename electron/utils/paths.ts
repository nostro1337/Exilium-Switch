import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'

export function isDevBuild(): boolean {
  if (process.env.EXILIUM_DEV_BUILD === 'true') return true
  if (process.env.NODE_ENV === 'development') return true
  try {
    if (app && !app.isPackaged) return true
  } catch {}
  const exec = (process.execPath || '').toLowerCase()
  const cwd = (process.cwd() || '').toLowerCase()
  return exec.includes('devbuild') || cwd.includes('devbuild')
}

export function getRealExePath(): string {
  if (process.env.PORTABLE_EXECUTABLE_FILE && fs.existsSync(process.env.PORTABLE_EXECUTABLE_FILE)) {
    return process.env.PORTABLE_EXECUTABLE_FILE
  }
  return process.execPath
}

export function getAppDataDir(): string {
  const isDev = isDevBuild()
  const folderName = isDev ? 'ExiliumSwitch-Dev' : 'ExiliumSwitch'
  try {
    if (app && typeof app.getPath === 'function') {
      const dir = app.getPath('userData')
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      return dir
    }
  } catch {}
  const fallback = path.join(process.env.APPDATA || process.env.USERPROFILE || '.', folderName)
  if (!fs.existsSync(fallback)) {
    fs.mkdirSync(fallback, { recursive: true })
  }
  return fallback
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
    const appPath = (app && typeof app.getAppPath === 'function') ? app.getAppPath() : process.cwd()
    const resPath = process.resourcesPath || process.cwd()

    const icoCandidates = [
      path.join(resPath, 'icon.ico'),
      path.join(resPath, 'assets', 'icons', 'ExiliumSwitchIcon.ico'),
      path.join(resPath, 'assets', 'icons', 'ExiliumAppIcon.ico'),
      path.join(resPath, 'build', 'icon.ico'),
      path.join(appPath, 'build', 'icon.ico'),
      path.join(appPath, 'assets', 'icons', 'ExiliumSwitchIcon.ico'),
      path.join(appPath, 'assets', 'icons', 'ExiliumAppIcon.ico'),
      path.resolve('build', 'icon.ico'),
      path.resolve('assets', 'icons', 'ExiliumSwitchIcon.ico'),
      path.resolve('assets', 'icons', 'ExiliumAppIcon.ico')
    ]

    let icoValid = fs.existsSync(icoPath) && fs.statSync(icoPath).size > 0
    if (!icoValid) {
      for (const candidate of icoCandidates) {
        try {
          if (fs.existsSync(candidate) && fs.statSync(candidate).size > 0) {
            fs.copyFileSync(candidate, icoPath)
            icoValid = true
            break
          }
        } catch {}
      }
    }

    const pngCandidates = [
      path.join(resPath, 'icon.png'),
      path.join(resPath, 'assets', 'icons', 'ExiliumAppIcon.png'),
      path.join(resPath, 'build', 'icon.png'),
      path.join(appPath, 'build', 'icon.png'),
      path.join(appPath, 'public', 'ExiliumAppIcon.png'),
      path.join(appPath, 'dist', 'assets', 'ExiliumAppIcon.png'),
      path.resolve('build', 'icon.png'),
      path.resolve('public', 'ExiliumAppIcon.png')
    ]

    let pngValid = fs.existsSync(pngPath) && fs.statSync(pngPath).size > 0
    if (!pngValid) {
      for (const candidate of pngCandidates) {
        try {
          if (fs.existsSync(candidate) && fs.statSync(candidate).size > 0) {
            fs.copyFileSync(candidate, pngPath)
            pngValid = true
            break
          }
        } catch {}
      }
    }
  } catch (err) {
    console.error('ensureCachedIcons error:', err)
  }

  return { icoPath, pngPath }
}
