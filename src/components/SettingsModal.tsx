import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Settings, Save, X, RotateCcw, ShieldCheck, Laptop, Sparkles, Trash2, CheckCircle2, RefreshCw } from 'lucide-react'
import type { AppSettings } from '../../shared/types'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onCheckUpdates?: () => void
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onCheckUpdates }) => {
  const [settings, setSettings] = useState<AppSettings>({
    realZone: 'Tomsk Standard Time',
    fakeZone: 'W. Europe Standard Time',
    autoStart: false,
    minimizeToTray: true,
    startMinimized: false,
    coexistWithZapret: true
  })
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [version, setVersion] = useState('1.5.7')
  const [isDev, setIsDev] = useState(false)
  const [clearingCache, setClearingCache] = useState(false)
  const [cacheClearedSuccess, setCacheClearedSuccess] = useState(false)

  useEffect(() => {
    if (isOpen) {
      window.electronAPI?.getSettings().then((loaded) => {
        if (loaded) setSettings(loaded)
      })
      window.electronAPI?.getAppVersion?.().then((v) => {
        if (v) setVersion(v)
      })
      window.electronAPI?.isDevBuild?.().then((dev) => {
        setIsDev(Boolean(dev))
      })
    }
  }, [isOpen])

  const handleToggle = async (key: keyof AppSettings, value: boolean) => {
    const updated = { ...settings, [key]: value }
    setSettings(updated)
    try {
      await window.electronAPI?.saveSettings({ [key]: value })
    } catch {}
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await window.electronAPI?.saveSettings({
        realZone: settings.realZone,
        fakeZone: settings.fakeZone,
        autoStart: settings.autoStart,
        minimizeToTray: settings.minimizeToTray,
        startMinimized: settings.startMinimized,
        coexistWithZapret: settings.coexistWithZapret
      })
      setSavedSuccess(true)
      setTimeout(() => {
        setSavedSuccess(false)
        onClose()
      }, 600)
    } finally {
      setSaving(false)
    }
  }

  const handlePurgeIdeCache = async () => {
    if (clearingCache) return
    setClearingCache(true)
    try {
      const res = await window.electronAPI?.clearIdeAndDnsCache?.()
      if (res && res.success) {
        setCacheClearedSuccess(true)
        setTimeout(() => setCacheClearedSuccess(false), 3000)
      }
    } finally {
      setClearingCache(false)
    }
  }

  const handleResetDefaults = async () => {
    const defaults = {
      realZone: 'Tomsk Standard Time',
      fakeZone: 'W. Europe Standard Time',
      autoStart: false,
      minimizeToTray: true,
      startMinimized: false,
      coexistWithZapret: true
    }
    setSettings((prev) => ({ ...prev, ...defaults }))
    await window.electronAPI?.saveSettings(defaults)
  }

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 select-none cursor-default"
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-[#111114] border border-white/12 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="h-11 px-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-100">
            <Settings className="w-3.5 h-3.5 text-zinc-300" strokeWidth={1.75} />
            <span>Параметры Exilium Switch</span>
            <span
              className={`text-[8.5px] font-mono px-1.5 py-0.5 rounded font-bold border ${
                isDev
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              }`}
            >
              {isDev ? 'DEV' : 'STABLE'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
          {/* Resident Mode Config */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 font-medium text-zinc-200">
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
              <span>Конфигурация Resident Mode</span>
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">
                Подменный часовой пояс (Fake Timezone)
              </label>
              <input
                type="text"
                value={settings.fakeZone}
                onChange={(e) => setSettings({ ...settings, fakeZone: e.target.value })}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-white/30 font-mono text-[11px]"
                placeholder="W. Europe Standard Time"
              />
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">
                Реальный часовой пояс (Real Timezone)
              </label>
              <input
                type="text"
                value={settings.realZone}
                onChange={(e) => setSettings({ ...settings, realZone: e.target.value })}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-white/30 font-mono text-[11px]"
                placeholder="Tomsk Standard Time"
              />
            </div>
          </div>

          <div className="h-[1px] bg-white/[0.08]" />

          {/* Windows 11 Integration */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 font-medium text-zinc-200">
              <Laptop className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
              <span>Интеграция с системой</span>
            </div>

            <label className="flex items-center justify-between cursor-pointer group">
              <div className="flex flex-col pr-2">
                <span className="text-zinc-200 text-[11px] font-medium">Авто-пауза Zapret (winws) при VPN</span>
                <span className="text-zinc-500 text-[10px]">Исключает конфликт пакетов для YouTube и Discord Voice</span>
              </div>
              <input
                type="checkbox"
                checked={settings.coexistWithZapret ?? true}
                onChange={(e) => handleToggle('coexistWithZapret', e.target.checked)}
                className="w-4 h-4 rounded accent-white cursor-pointer shrink-0"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-zinc-300 text-[11px]">Сворачивать в системный трей при закрытии (X)</span>
              <input
                type="checkbox"
                checked={settings.minimizeToTray}
                onChange={(e) => handleToggle('minimizeToTray', e.target.checked)}
                className="w-4 h-4 rounded accent-white cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-zinc-300 text-[11px]">Запускать автоматически при старте Windows</span>
              <input
                type="checkbox"
                checked={settings.autoStart}
                onChange={(e) => handleToggle('autoStart', e.target.checked)}
                className="w-4 h-4 rounded accent-white cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-zinc-300 text-[11px]">Запускать в свернутом виде (в трее)</span>
              <input
                type="checkbox"
                checked={settings.startMinimized}
                onChange={(e) => handleToggle('startMinimized', e.target.checked)}
                className="w-4 h-4 rounded accent-white cursor-pointer"
              />
            </label>
          </div>

          <div className="h-[1px] bg-white/[0.08]" />

          {/* Quick Repair Tool: Antigravity IDE & DNS Cache Purge */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-zinc-200 text-[11px] font-medium">Сброс кэша IDE и DNS</span>
                <span className="text-zinc-500 text-[10px]">Очищает кэш Antigravity/Gemini и сбрасывает DNS Windows</span>
              </div>
              <button
                type="button"
                onClick={handlePurgeIdeCache}
                disabled={clearingCache}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all cursor-pointer shrink-0 ${
                  cacheClearedSuccess
                    ? 'bg-emerald-950/80 text-emerald-200 border-emerald-600/50'
                    : 'bg-white/[0.06] hover:bg-white/10 text-zinc-200 border-white/10'
                }`}
              >
                {clearingCache ? (
                  <RefreshCw className="w-3 h-3 animate-spin text-zinc-300" />
                ) : cacheClearedSuccess ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                ) : (
                  <Trash2 className="w-3 h-3 text-zinc-400" />
                )}
                <span>{cacheClearedSuccess ? 'Очищено!' : clearingCache ? 'Сброс...' : 'Очистить'}</span>
              </button>
            </div>
          </div>

          {/* App Update Checker */}
          <div className="pt-2 border-t border-white/5 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] font-medium text-zinc-300">Хранилище конфигурации</span>
              <span className="text-[9.5px] text-zinc-500 font-mono">
                {isDev ? '%APPDATA%\\ExiliumSwitch-Dev' : '%APPDATA%\\ExiliumSwitch'}
              </span>
            </div>
            {onCheckUpdates && (
              <button
                type="button"
                onClick={onCheckUpdates}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/10 text-zinc-200 border border-white/10 text-[11px] font-medium transition-colors cursor-pointer"
              >
                <Sparkles size={12} className="text-zinc-300" />
                <span>Обновления</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/[0.08] bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetDefaults}
              disabled={saving}
              title="Сбросить по умолчанию"
              className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-3 h-3" strokeWidth={1.75} />
              <span>Сброс</span>
            </button>
            <span className="text-[10px] text-zinc-600 font-mono">v{version}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/10 text-zinc-300 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 rounded-lg bg-white text-black font-semibold text-xs flex items-center gap-1.5 hover:bg-zinc-200 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-3.5 h-3.5 text-black" strokeWidth={2} />
              <span>{savedSuccess ? 'Сохранено!' : saving ? '...' : 'Сохранить'}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
