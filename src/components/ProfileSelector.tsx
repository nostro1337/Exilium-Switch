import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Layers, Plus, Check, Trash2, X, FileCode, Shield, UploadCloud, Link2, Clipboard } from 'lucide-react'
import type { ConfigProfile } from '../../electron/preload'

interface ProfileSelectorProps {
  isOpen: boolean
  isRunning: boolean
  onClose: () => void
}

export const ProfileSelector: React.FC<ProfileSelectorProps> = ({
  isOpen,
  isRunning,
  onClose
}) => {
  const [profiles, setProfiles] = useState<ConfigProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [vlessText, setVlessText] = useState('')

  const loadProfiles = async () => {
    try {
      const list = await window.electronAPI?.getProfiles()
      if (list) setProfiles(list)
    } catch {}
  }

  useEffect(() => {
    if (isOpen) {
      loadProfiles()
      setErrorMsg(null)
    }
  }, [isOpen])

  const handleImport = async () => {
    if (isRunning) {
      setErrorMsg('Отключите Shield перед добавлением нового профиля')
      return
    }
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await window.electronAPI?.importProfile()
      if (res && res.success) {
        await loadProfiles()
      } else if (res && res.error && res.error !== 'Импорт отменен') {
        setErrorMsg(res.error)
      }
    } finally {
      setLoading(false)
    }
  }

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) setVlessText(text.trim())
    } catch {}
  }

  const handleDirectPasteAndImport = async () => {
    if (isRunning) {
      setErrorMsg('Отключите Shield перед добавлением нового профиля')
      return
    }
    setErrorMsg(null)
    setLoading(true)
    try {
      const text = await navigator.clipboard.readText()
      const trimmed = (text || '').trim()
      if (!trimmed.startsWith('vless://')) {
        setErrorMsg('В буфере обмена нет ссылки vless://. Скопируйте ссылку и нажмите снова.')
        return
      }
      const res = await window.electronAPI?.importVlessLink(trimmed)
      if (res && res.success) {
        setVlessText('')
        setShowLinkInput(false)
        await loadProfiles()
      } else if (res && res.error) {
        setErrorMsg(res.error)
      }
    } catch (err: any) {
      setErrorMsg('Не удалось прочитать буфер обмена: ' + (err.message || err))
    } finally {
      setLoading(false)
    }
  }

  const handleImportVless = async () => {
    if (isRunning) {
      setErrorMsg('Отключите Shield перед добавлением нового профиля')
      return
    }
    if (!vlessText.trim()) {
      setErrorMsg('Вставьте VLESS ссылку')
      return
    }
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await window.electronAPI?.importVlessLink(vlessText.trim())
      if (res && res.success) {
        setVlessText('')
        setShowLinkInput(false)
        await loadProfiles()
      } else if (res && res.error) {
        setErrorMsg(res.error)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = async (profileId: string) => {
    if (isRunning) {
      setErrorMsg('Отключите Shield перед переключением профиля')
      return
    }
    setErrorMsg(null)
    const res = await window.electronAPI?.selectProfile(profileId)
    if (res && res.success) {
      await loadProfiles()
    } else if (res && res.error) {
      setErrorMsg(res.error)
    }
  }

  const handleDelete = async (e: React.MouseEvent, profileId: string) => {
    e.stopPropagation()
    if (isRunning) return
    setErrorMsg(null)
    const res = await window.electronAPI?.deleteProfile(profileId)
    if (res && res.success) {
      await loadProfiles()
    } else if (res && res.error) {
      setErrorMsg(res.error)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', stiffness: 450, damping: 30 }}
          className="w-full max-w-sm bg-[#0e0e11] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Modal Header */}
          <div className="h-12 px-4 border-b border-white/10 flex items-center justify-between bg-[#141418] shrink-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
              <Layers className="w-4 h-4 text-zinc-300" strokeWidth={2} />
              <span>Профили конфигураций (.json)</span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>

          {/* Body content */}
          <div className="p-4 flex-1 overflow-y-auto space-y-3">
            {isRunning && (
              <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/40 text-amber-200 text-xs flex items-center gap-2">
                <Shield className="w-4 h-4 shrink-0 text-amber-400" />
                <span>VPN активен. Для смены или удаления профилей отключите Resident Shield.</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-800/40 text-red-200 text-xs">
                {errorMsg}
              </div>
            )}

            {/* Profile Cards */}
            {profiles.length === 0 ? (
              <div className="py-8 px-4 rounded-xl border border-white/10 bg-white/[0.02] flex flex-col items-center justify-center text-center gap-2.5">
                <div className="p-3 rounded-full bg-white/[0.06] text-zinc-400 border border-white/10">
                  <UploadCloud className="w-6 h-6 stroke-[1.5]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-200">Нет добавленных конфигураций</p>
                  <p className="text-[11px] text-zinc-500 mt-1 max-w-[240px] leading-relaxed">
                    Импортируйте ваш <span className="text-zinc-300 font-mono">.json</span> конфиг sing-box для создания профиля
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {profiles.map((profile) => (
                  <div
                    key={profile.id}
                    onClick={() => !isRunning && handleSelect(profile.id)}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                      profile.isActive
                        ? 'bg-white/10 border-white/40 shadow-[0_0_15px_rgba(255,255,255,0.12)]'
                        : isRunning
                        ? 'bg-white/[0.02] border-white/[0.06] opacity-60 cursor-not-allowed'
                        : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] hover:border-white/20 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`p-2 rounded-lg ${
                        profile.isActive ? 'bg-white text-black' : 'bg-white/5 text-zinc-400'
                      }`}>
                        <FileCode className="w-4 h-4" strokeWidth={2} />
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-semibold truncate ${
                            profile.isActive ? 'text-white' : 'text-zinc-200'
                          }`}>
                            {profile.name}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-500 font-mono truncate mt-0.5">
                          {profile.filename}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      {profile.isActive ? (
                        <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-black">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        !isRunning && (
                          <button
                            onClick={(e) => handleDelete(e, profile.id)}
                            title="Удалить профиль"
                            className="p-1.5 rounded text-zinc-500 hover:text-red-300 hover:bg-red-950/40 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Import Actions */}
            {showLinkInput ? (
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/15 space-y-2.5">
                <div className="flex items-center justify-between text-xs text-zinc-200 font-semibold">
                  <div className="flex items-center gap-1.5 text-zinc-200">
                    <Link2 size={14} />
                    <span>Импорт ссылки VLESS</span>
                  </div>
                  <button
                    onClick={() => setShowLinkInput(false)}
                    className="p-1 rounded text-zinc-500 hover:text-white transition-colors cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={vlessText}
                  onChange={(e) => setVlessText(e.target.value)}
                  placeholder="Вставьте ссылку vless://..."
                  className="w-full bg-black/60 border border-white/10 rounded-lg p-2 text-[11px] text-zinc-200 font-mono resize-none focus:outline-none focus:border-white/40"
                />
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handlePasteFromClipboard}
                    className="px-2.5 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/15 text-zinc-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Clipboard size={12} />
                    <span>Вставить</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowLinkInput(false)}
                      className="px-2.5 py-1.5 rounded-lg text-zinc-400 hover:text-white text-xs transition-colors cursor-pointer"
                    >
                      Отмена
                    </button>
                    <button
                      type="button"
                      onClick={handleImportVless}
                      disabled={!vlessText.trim() || loading}
                      className="px-3.5 py-1.5 rounded-lg bg-white text-black hover:bg-zinc-200 disabled:opacity-40 text-xs font-semibold flex items-center gap-1 transition-all active:scale-[0.98] cursor-pointer"
                    >
                      <Check size={13} strokeWidth={2.5} />
                      <span>{loading ? 'Создание...' : 'Импортировать'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {/* 1-Click Clipboard Import */}
                <button
                  type="button"
                  onClick={handleDirectPasteAndImport}
                  disabled={isRunning || loading}
                  className={`w-full py-2.5 px-3 rounded-xl border border-dashed text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                    isRunning
                      ? 'border-white/10 text-zinc-600 cursor-not-allowed'
                      : 'border-white/30 hover:border-white/50 bg-white/[0.06] hover:bg-white/10 text-white cursor-pointer active:scale-[0.99]'
                  }`}
                >
                  <Clipboard size={14} className="text-zinc-200" />
                  <span>{loading ? 'Импорт...' : 'Вставить VLESS из буфера'}</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setShowLinkInput(true)}
                    disabled={isRunning || loading}
                    className={`py-2 px-2 rounded-xl border border-dashed text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all ${
                      isRunning
                        ? 'border-white/10 text-zinc-600 cursor-not-allowed'
                        : 'border-white/15 hover:border-white/30 bg-white/[0.02] hover:bg-white/[0.06] text-zinc-300 hover:text-white cursor-pointer'
                    }`}
                  >
                    <Link2 size={12} />
                    <span>Ввести вручную</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={isRunning || loading}
                    className={`py-2 px-2 rounded-xl border border-dashed text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all ${
                      isRunning
                        ? 'border-white/10 text-zinc-600 cursor-not-allowed'
                        : 'border-white/15 hover:border-white/30 bg-white/[0.02] hover:bg-white/[0.06] text-zinc-300 hover:text-white cursor-pointer'
                    }`}
                  >
                    <FileCode size={12} />
                    <span>Файл .json</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="p-3 border-t border-white/10 bg-[#0a0a0d] flex items-center justify-between text-[11px] text-zinc-500">
            <span>Конфигураций: {profiles.length}</span>
            <span className="font-mono text-[10px]">by Nostro</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
