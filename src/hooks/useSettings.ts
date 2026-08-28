import { useState, useEffect, useCallback } from 'react'
import { DEFAULT_SETTINGS, type AppSettings } from '../../shared/types'

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)

  const reloadSettings = useCallback(() => {
    window.electronAPI?.getSettings().then((s) => {
      if (s) setSettings(s)
    })
  }, [])

  useEffect(() => {
    reloadSettings()
  }, [reloadSettings])

  const updateSettings = useCallback(async (partial: Partial<AppSettings>) => {
    const updated = await window.electronAPI?.saveSettings(partial)
    if (updated) setSettings(updated)
    return updated
  }, [])

  return {
    settings,
    reloadSettings,
    updateSettings
  }
}
