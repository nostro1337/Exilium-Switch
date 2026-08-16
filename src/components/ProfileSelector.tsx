import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Layers, Plus, Check, Trash2, X, FileCode, Shield, UploadCloud } from 'lucide-react'
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

            {/* Import Button */}
            <button
              onClick={handleImport}
              disabled={isRunning || loading}
              className={`w-full py-2.5 px-3 rounded-xl border border-dashed text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                isRunning
                  ? 'border-white/10 text-zinc-600 cursor-not-allowed'
                  : 'border-white/20 hover:border-white/40 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 hover:text-white cursor-pointer'
              }`}
            >
              <Plus className="w-4 h-4" strokeWidth={2} />
              <span>{loading ? 'Импорт файла...' : 'Добавить .json конфиг'}</span>
            </button>
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
