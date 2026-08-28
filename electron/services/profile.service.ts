import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { getProfilesDir } from '../utils/paths'
import { convertVlessToSingBoxConfig } from '../utils/vless-parser'
import { SettingsService } from './settings.service'
import { LogService } from './log.service'
import type { AppMode, ConfigProfile } from '../../shared/types'

export class ProfileService {
  private static instance: ProfileService

  private constructor() {}

  public static getInstance(): ProfileService {
    if (!ProfileService.instance) {
      ProfileService.instance = new ProfileService()
    }
    return ProfileService.instance
  }

  private getMetaPath(): string {
    return path.join(getProfilesDir(), 'profiles_meta.json')
  }

  private loadMeta(): Record<string, { name?: string; mode?: AppMode }> {
    try {
      const metaPath = this.getMetaPath()
      if (fs.existsSync(metaPath)) {
        return JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
      }
    } catch {}
    return {}
  }

  private saveMeta(id: string, meta: { name?: string; mode?: AppMode }): void {
    try {
      const current = this.loadMeta()
      current[id] = { ...(current[id] || {}), ...meta }
      fs.writeFileSync(this.getMetaPath(), JSON.stringify(current, null, 2), 'utf-8')
    } catch {}
  }

  private deleteMeta(id: string): void {
    try {
      const current = this.loadMeta()
      if (current[id]) {
        delete current[id]
        fs.writeFileSync(this.getMetaPath(), JSON.stringify(current, null, 2), 'utf-8')
      }
    } catch {}
  }

  public seedOfficeProfileIfNeeded(): void {
    const profilesDir = getProfilesDir()
    try {
      const files = fs.readdirSync(profilesDir).filter(f => f.endsWith('.json') && f !== 'profiles_meta.json')
      const hasOffice = files.some(f => f.toLowerCase().includes('office') || f.toLowerCase().includes('work') || f.toLowerCase().includes('aviabasa'))
      if (!hasOffice) {
        const candidates = [
          path.join(app.getAppPath(), 'Configs', 'work_aviabasa.json'),
          path.join(process.resourcesPath, 'Configs', 'work_aviabasa.json'),
          path.resolve('Configs', 'work_aviabasa.json'),
          path.join(__dirname, '..', '..', 'Configs', 'work_aviabasa.json')
        ]
        for (const cand of candidates) {
          if (fs.existsSync(cand)) {
            const dest = path.join(profilesDir, 'work_aviabasa.json')
            fs.copyFileSync(cand, dest)
            this.saveMeta('work_aviabasa', { name: 'Корпоративный (Aviabasa)', mode: 'office' })
            break
          }
        }
      }
    } catch {}
  }

  public getProfiles(filterMode?: AppMode): ConfigProfile[] {
    const profilesDir = getProfilesDir()
    const settingsService = SettingsService.getInstance()
    const settings = settingsService.loadSettings()
    const currentMode = filterMode || settings.appMode || 'home'
    const activeId = (settings.activeProfileIdByMode as Record<string, string>)?.[currentMode] || settings.activeProfileId
    const meta = this.loadMeta()

    this.seedOfficeProfileIfNeeded()

    const files = fs.readdirSync(profilesDir).filter(f => f.endsWith('.json') && f !== 'default.json' && f !== 'profiles_meta.json')
    const profiles: ConfigProfile[] = []

    for (const file of files) {
      const fullPath = path.join(profilesDir, file)
      const id = path.basename(file, '.json')
      const name = meta[id]?.name || id.replace(/[-_]/g, ' ')
      const mode: AppMode = meta[id]?.mode || (id.toLowerCase().includes('office') || id.toLowerCase().includes('work') || id.toLowerCase().includes('aviabasa') ? 'office' : 'home')

      let createdAt = Date.now()
      try {
        createdAt = fs.statSync(fullPath).birthtimeMs
      } catch {}

      profiles.push({
        id,
        name,
        filename: file,
        path: fullPath,
        createdAt,
        isActive: id === activeId,
        mode
      })
    }

    const filtered = filterMode ? profiles.filter(p => p.mode === filterMode) : profiles

    // Ensure at least one profile is marked active if available
    if (filtered.length > 0 && !filtered.some(p => p.isActive)) {
      filtered[0].isActive = true
      const updatedMap = { ...(settings.activeProfileIdByMode || {}), [currentMode]: filtered[0].id }
      settingsService.saveSettings({ activeProfileId: filtered[0].id, activeProfileIdByMode: updatedMap })
    }

    return filtered.sort((a, b) => b.createdAt - a.createdAt)
  }

  public getActiveProfile(mode?: AppMode): ConfigProfile | null {
    const settings = SettingsService.getInstance().loadSettings()
    const currentMode = mode || settings.appMode || 'home'
    const list = this.getProfiles(currentMode)
    if (list.length === 0) {
      const all = this.getProfiles()
      return all.length > 0 ? all[0] : null
    }
    const modeActiveId = (settings.activeProfileIdByMode as Record<string, string>)?.[currentMode] || settings.activeProfileId
    return list.find(p => p.id === modeActiveId) || list[0]
  }

  public importJsonContent(rawContent: string, originalName: string, targetMode?: AppMode): { success: boolean; profile?: ConfigProfile; error?: string } {
    try {
      JSON.parse(rawContent)
    } catch {
      return { success: false, error: 'Файл не является валидным JSON' }
    }

    const settingsService = SettingsService.getInstance()
    const settings = settingsService.loadSettings()
    const mode = targetMode || settings.appMode || 'home'
    const safeId = originalName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase() + '-' + Date.now().toString(36)
    const profilesDir = getProfilesDir()
    const destPath = path.join(profilesDir, `${safeId}.json`)

    fs.writeFileSync(destPath, rawContent, 'utf-8')

    this.saveMeta(safeId, { name: originalName, mode })
    const updatedMap = { ...(settings.activeProfileIdByMode || {}), [mode]: safeId }
    settingsService.saveSettings({ activeProfileId: safeId, activeProfileIdByMode: updatedMap })

    const newProfile: ConfigProfile = {
      id: safeId,
      name: originalName,
      filename: `${safeId}.json`,
      path: destPath,
      createdAt: Date.now(),
      isActive: true,
      mode
    }

    LogService.getInstance().addLog(`Новый профиль "${originalName}" [${mode === 'office' ? 'Офис' : 'Дом'}] успешно импортирован!`, 'success')
    return { success: true, profile: newProfile }
  }

  public importVlessLink(rawLink: string, targetMode?: AppMode): { success: boolean; profile?: ConfigProfile; error?: string } {
    const link = (rawLink || '').trim()
    if (!link) {
      return { success: false, error: 'Ссылка пустая' }
    }

    const settingsService = SettingsService.getInstance()
    const settings = settingsService.loadSettings()
    const mode = targetMode || settings.appMode || 'home'

    let config: Record<string, unknown>
    let name: string
    try {
      const parsed = convertVlessToSingBoxConfig(link, mode)
      config = parsed.config
      name = parsed.name
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, error: message }
    }

    const rawContent = JSON.stringify(config, null, 2)
    const safeId = name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase().slice(0, 32) + '-' + Date.now().toString(36)
    const profilesDir = getProfilesDir()
    const destPath = path.join(profilesDir, `${safeId}.json`)

    fs.writeFileSync(destPath, rawContent, 'utf-8')

    this.saveMeta(safeId, { name, mode })
    const updatedMap = { ...(settings.activeProfileIdByMode || {}), [mode]: safeId }
    settingsService.saveSettings({ activeProfileId: safeId, activeProfileIdByMode: updatedMap })

    const newProfile: ConfigProfile = {
      id: safeId,
      name,
      filename: `${safeId}.json`,
      path: destPath,
      createdAt: Date.now(),
      isActive: true,
      mode
    }

    LogService.getInstance().addLog(`Профиль "${name}" успешно создан из VLESS-ссылки [${mode === 'office' ? 'Офис' : 'Дом'}]!`, 'success')
    return { success: true, profile: newProfile }
  }

  public selectProfile(profileId: string): { success: boolean; error?: string } {
    const profilesDir = getProfilesDir()
    const targetPath = path.join(profilesDir, `${profileId}.json`)
    if (!fs.existsSync(targetPath)) {
      return { success: false, error: 'Профиль не найден' }
    }

    const settingsService = SettingsService.getInstance()
    const settings = settingsService.loadSettings()
    const meta = this.loadMeta()
    const profileMode = meta[profileId]?.mode || settings.appMode || 'home'
    const updatedMap = { ...(settings.activeProfileIdByMode || {}), [profileMode]: profileId }

    settingsService.saveSettings({ activeProfileId: profileId, activeProfileIdByMode: updatedMap })
    const active = this.getActiveProfile(profileMode)
    LogService.getInstance().addLog(`Активный профиль переключен на: "${active?.name || profileId}"`, 'success')
    return { success: true }
  }

  public deleteProfile(profileId: string): { success: boolean; error?: string } {
    const profilesDir = getProfilesDir()
    const targetPath = path.join(profilesDir, `${profileId}.json`)
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath)
    }
    this.deleteMeta(profileId)

    const settingsService = SettingsService.getInstance()
    const settings = settingsService.loadSettings()
    if (settings.activeProfileId === profileId) {
      const remaining = this.getProfiles()
      settingsService.saveSettings({ activeProfileId: remaining.length > 0 ? remaining[0].id : undefined })
    }

    LogService.getInstance().addLog('Профиль удален.', 'info')
    return { success: true }
  }
}
