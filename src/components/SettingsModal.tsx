import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Settings,
  X,
  Save,
  RotateCcw,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  Shield,
  Zap,
  Wrench,
  Bot,
  Sliders,
  Lock
} from 'lucide-react'
import type { AppSettings } from '../../electron/preload'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onCheckUpdates?: () => void
}

type SettingsSection = 'general' | 'shield' | 'zapret' | 'maintenance' | 'ai'

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onCheckUpdates
}) => {
  const [settings, setSettings] = useState<AppSettings>({
    realZone: 'Tomsk Standard Time',
    fakeZone: 'W. Europe Standard Time',
    autoStart: false,
    minimizeToTray: true,
    startMinimized: false,
    coexistWithZapret: true,
    geminiApiKey: '',
    aiEnabled: false
  })

  const [openSections, setOpenSections] = useState<Record<SettingsSection, boolean>>({
    general: true,
    shield: true,
    zapret: false,
    maintenance: true,
    ai: false
  })

  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [version, setVersion] = useState('1.5.8')
  const [isDev, setIsDev] = useState(false)

  // Escape key support to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

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

  const toggleSection = (section: SettingsSection) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

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
        coexistWithZapret: settings.coexistWithZapret,
        aiEnabled: settings.aiEnabled,
        geminiApiKey: settings.geminiApiKey
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

  const handleResetDefaults = async () => {
    const defaults = {
      realZone: 'Tomsk Standard Time',
      fakeZone: 'W. Europe Standard Time',
      autoStart: false,
      minimizeToTray: true,
      startMinimized: false,
      coexistWithZapret: true,
      aiEnabled: false
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
      className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 select-none cursor-default"
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#111114] border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="h-12 px-5 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2 text-xs font-semibold text-white tracking-wide">
            <Settings className="w-4 h-4 text-zinc-300" strokeWidth={1.8} />
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
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" strokeWidth={1.8} />
          </button>
        </div>

        {/* Form Body with Accordions */}
        <div className="p-4 space-y-3 text-xs overflow-y-auto flex-1 custom-scrollbar">
          {/* SECTION 1: General */}
          <div className="border border-white/[0.08] rounded-xl overflow-hidden bg-white/[0.02]">
            <button
              onClick={() => toggleSection('general')}
              className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 text-zinc-200 font-medium text-xs">
                <Sliders className="w-3.5 h-3.5 text-zinc-400" />
                <span>1. Основные параметры</span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
                  openSections.general ? 'rotate-180' : ''
                }`}
              />
            </button>

            <AnimatePresence initial={false}>
              {openSections.general && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-3.5 pb-3 space-y-2 border-t border-white/[0.06] pt-2.5"
                >
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-zinc-300 text-[11px] group-hover:text-white transition-colors">
                      Автозапуск при старте Windows
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.autoStart}
                      onChange={(e) => handleToggle('autoStart', e.target.checked)}
                      className="w-3.5 h-3.5 rounded accent-white cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-zinc-300 text-[11px] group-hover:text-white transition-colors">
                      Сворачивать в системный трей
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.minimizeToTray}
                      onChange={(e) => handleToggle('minimizeToTray', e.target.checked)}
                      className="w-3.5 h-3.5 rounded accent-white cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-zinc-300 text-[11px] group-hover:text-white transition-colors">
                      Запускать в свернутом виде
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.startMinimized}
                      onChange={(e) => handleToggle('startMinimized', e.target.checked)}
                      className="w-3.5 h-3.5 rounded accent-white cursor-pointer"
                    />
                  </label>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* SECTION 2: Resident Shield */}
          <div className="border border-white/[0.08] rounded-xl overflow-hidden bg-white/[0.02]">
            <button
              onClick={() => toggleSection('shield')}
              className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 text-zinc-200 font-medium text-xs">
                <Shield className="w-3.5 h-3.5 text-zinc-400" />
                <span>2. Сетевой щит (Resident Shield)</span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
                  openSections.shield ? 'rotate-180' : ''
                }`}
              />
            </button>

            <AnimatePresence initial={false}>
              {openSections.shield && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-3.5 pb-3 space-y-2.5 border-t border-white/[0.06] pt-2.5"
                >
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">
                      Реальный часовой пояс (Tomsk / Local)
                    </label>
                    <input
                      type="text"
                      value={settings.realZone}
                      onChange={(e) => setSettings({ ...settings, realZone: e.target.value })}
                      placeholder="Tomsk Standard Time"
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-white/30 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">
                      Подменный часовой пояс (Amsterdam)
                    </label>
                    <input
                      type="text"
                      value={settings.fakeZone}
                      onChange={(e) => setSettings({ ...settings, fakeZone: e.target.value })}
                      placeholder="W. Europe Standard Time"
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-white/30 font-mono text-[11px]"
                    />
                  </div>

                  <p className="text-[10px] text-zinc-500 leading-relaxed font-mono">
                    Синхронизирует системные таймеры и локали браузера с целевым сервером для защиты от региональной деанонимизации.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* SECTION 3: Zapret Coexistence */}
          <div className="border border-white/[0.08] rounded-xl overflow-hidden bg-white/[0.02]">
            <button
              onClick={() => toggleSection('zapret')}
              className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 text-zinc-200 font-medium text-xs">
                <Zap className="w-3.5 h-3.5 text-zinc-400" />
                <span>3. Сосуществование с Zapret & GoodbyeDPI</span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
                  openSections.zapret ? 'rotate-180' : ''
                }`}
              />
            </button>

            <AnimatePresence initial={false}>
              {openSections.zapret && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-3.5 pb-3 space-y-2 border-t border-white/[0.06] pt-2.5"
                >
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-zinc-300 text-[11px] group-hover:text-white transition-colors">
                      Авто-приостановка Zapret при старте VPN
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.coexistWithZapret ?? true}
                      onChange={(e) => handleToggle('coexistWithZapret', e.target.checked)}
                      className="w-3.5 h-3.5 rounded accent-white cursor-pointer"
                    />
                  </label>
                  <p className="text-[10px] text-zinc-500 leading-relaxed font-mono">
                    Предотвращает двойную модификацию TCP пакетов и повреждение TLS соединений. При отключении VPN zapret восстанавливается в скрытом режиме.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* SECTION 4: Maintenance & Cache */}
          <div className="border border-white/[0.08] rounded-xl overflow-hidden bg-white/[0.02]">
            <button
              onClick={() => toggleSection('maintenance')}
              className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 text-zinc-200 font-medium text-xs">
                <Wrench className="w-3.5 h-3.5 text-zinc-400" />
                <span>4. Обслуживание и Кэш</span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
                  openSections.maintenance ? 'rotate-180' : ''
                }`}
              />
            </button>

            <AnimatePresence initial={false}>
              {openSections.maintenance && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-3.5 pb-3 space-y-3 border-t border-white/[0.06] pt-2.5"
                >
                  {/* Config Storage & Updates */}
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-medium text-zinc-300">Хранилище профилей</span>
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
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* SECTION 5: AI Sentinel (FROZEN - BETA) */}
          <div className="border border-white/[0.06] rounded-xl overflow-hidden bg-white/[0.01] opacity-75">
            <button
              onClick={() => toggleSection('ai')}
              className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 text-zinc-400 font-medium text-xs">
                <Bot className="w-3.5 h-3.5 text-zinc-500" />
                <span>5. AI Sentinel (Когнитивный анализ)</span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                  BETA
                </span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-200 ${
                  openSections.ai ? 'rotate-180' : ''
                }`}
              />
            </button>

            <AnimatePresence initial={false}>
              {openSections.ai && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-3.5 pb-3 space-y-2.5 border-t border-white/[0.04] pt-2.5"
                >
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs font-mono flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" />
                    <span>Раздел временно заморожен (В разработке)</span>
                  </div>

                  <div className="opacity-50 pointer-events-none">
                    <label className="block text-[11px] text-zinc-400 mb-1">
                      Google AI Studio API Ключ (Gemini 3.6 Flash)
                    </label>
                    <input
                      type="password"
                      disabled
                      value={settings.geminiApiKey || ''}
                      placeholder="В разработке..."
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-zinc-500 font-mono text-[11px]"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 border-t border-white/[0.08] bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetDefaults}
              disabled={saving}
              title="Сбросить по умолчанию"
              className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3 h-3" strokeWidth={1.8} />
              <span>Сброс</span>
            </button>
            <span className="text-[10px] text-zinc-600 font-mono">v{version}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/10 text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3.5 py-1.5 rounded-lg bg-white text-black font-semibold text-xs flex items-center gap-1.5 hover:bg-zinc-200 transition-all cursor-pointer disabled:opacity-50"
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
