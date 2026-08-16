import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Settings, Save, X, RotateCcw, ShieldCheck, Laptop } from 'lucide-react'
import type { AppSettings } from '../../electron/preload'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<AppSettings>({
    realZone: 'Tomsk Standard Time',
    fakeZone: 'W. Europe Standard Time',
    autoStart: false,
    minimizeToTray: true,
    startMinimized: false
  })
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  useEffect(() => {
    if (isOpen) {
      window.electronAPI?.getSettings().then((loaded) => {
        if (loaded) setSettings(loaded)
      })
    }
  }, [isOpen])

  const handleSave = async () => {
    setSaving(true)
    try {
      await window.electronAPI?.saveSettings(settings)
      setSavedSuccess(true)
      setTimeout(() => {
        setSavedSuccess(false)
        onClose()
      }, 600)
    } finally {
      setSaving(false)
    }
  }

  const handleResetDefaults = () => {
    setSettings({
      realZone: 'Tomsk Standard Time',
      fakeZone: 'W. Europe Standard Time',
      autoStart: false,
      minimizeToTray: true,
      startMinimized: false
    })
  }

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 select-none"
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        className="w-full max-w-sm bg-[#111114] border border-white/12 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="h-11 px-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-100">
            <Settings className="w-3.5 h-3.5 text-zinc-300" strokeWidth={1.75} />
            <span>Параметры Exilium Switch</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 space-y-4 text-xs">
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
              <span className="text-zinc-300 text-[11px]">Сворачивать в системный трей при закрытии (X)</span>
              <input
                type="checkbox"
                checked={settings.minimizeToTray}
                onChange={(e) => setSettings({ ...settings, minimizeToTray: e.target.checked })}
                className="w-4 h-4 rounded accent-white cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-zinc-300 text-[11px]">Запускать автоматически при старте Windows</span>
              <input
                type="checkbox"
                checked={settings.autoStart}
                onChange={(e) => setSettings({ ...settings, autoStart: e.target.checked })}
                className="w-4 h-4 rounded accent-white cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-zinc-300 text-[11px]">Запускать в свернутом виде (в трее)</span>
              <input
                type="checkbox"
                checked={settings.startMinimized}
                onChange={(e) => setSettings({ ...settings, startMinimized: e.target.checked })}
                className="w-4 h-4 rounded accent-white cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/[0.08] bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetDefaults}
              title="Сбросить по умолчанию"
              className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" strokeWidth={1.75} />
              <span>Сброс</span>
            </button>
            <span className="text-[10px] text-zinc-600 font-mono">by Nostro</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/10 text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 rounded-lg bg-white text-black font-semibold text-xs flex items-center gap-1.5 hover:bg-zinc-200 transition-all cursor-pointer"
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
