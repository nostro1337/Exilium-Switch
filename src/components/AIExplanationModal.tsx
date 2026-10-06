import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  Info,
  Copy,
  Check,
  RefreshCw,
  Cpu
} from 'lucide-react'
import type { AiExplanationCard } from '../../shared/types/ai.types'

interface AIExplanationModalProps {
  isOpen: boolean
  card: AiExplanationCard | null
  onClose: () => void
  onAction?: (actionCommand: string) => void
}

export const AIExplanationModal: React.FC<AIExplanationModalProps> = ({
  isOpen,
  card,
  onClose,
  onAction
}) => {
  const [copied, setCopied] = React.useState(false)

  // Escape key support to close modal
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !card) return null

  const handleCopy = () => {
    const text = `[Exilium AI Sentinel]\nШаблон: ${card.pattern}\nДиагноз: ${card.title}\nОбъяснение: ${card.humanExplanation}\nРекомендация: ${card.recommendedAction}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getSeverityBadge = () => {
    switch (card.severity) {
      case 'critical':
        return { label: 'Критическая ошибка', bg: 'bg-rose-500/15 text-rose-300 border-rose-500/30' }
      case 'high':
        return { label: 'Высокий приоритет', bg: 'bg-orange-500/15 text-orange-300 border-orange-500/30' }
      case 'medium':
        return { label: 'Предупреждение', bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30' }
      case 'low':
        return { label: 'Штатное событие', bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' }
      default:
        return { label: 'Информация', bg: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30' }
    }
  }

  const badge = getSeverityBadge()

  return (
    <AnimatePresence>
      <div 
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md select-none cursor-default"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 10 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-[#121215] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.08] bg-white/[0.02]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-white/[0.08] border border-white/10 text-white shadow-[0_0_12px_rgba(255,255,255,0.2)]">
                <Sparkles className="w-4 h-4 text-white animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white tracking-wide">
                  Когнитивный анализ события
                </h3>
                <p className="text-[10px] text-zinc-400 font-mono">
                  Хэш шаблона: #{card.templateId}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Title & Badge */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${badge.bg}`}>
                  {badge.label}
                </span>

                <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-mono">
                  <span>Зафиксировано:</span>
                  <span className="text-white font-semibold">{card.occurrences || 1} раз</span>
                </div>
              </div>

              <h4 className="text-base font-medium text-white leading-snug">
                {card.title}
              </h4>
            </div>

            {/* Human Explanation Card */}
            <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.06] space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
                {card.isDangerous ? (
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span>Объяснение простым языком</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {card.humanExplanation}
              </p>
            </div>

            {/* Technical Details */}
            {card.technicalDetails && (
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.05] space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400">
                  <Cpu className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Технические детали ядра</span>
                </div>
                <p className="text-[11px] text-zinc-400 font-mono leading-relaxed break-all">
                  {card.technicalDetails}
                </p>
              </div>
            )}

            {/* Pattern */}
            <div className="p-2.5 rounded-lg bg-black/60 border border-white/[0.04]">
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider mb-1">
                Системный отпечаток (Fingerprint):
              </p>
              <code className="text-[11px] text-zinc-300 font-mono break-all select-all">
                {card.pattern}
              </code>
            </div>

            {/* Recommended Action */}
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                <Info className="w-3.5 h-3.5 text-zinc-300" />
                <span>Рекомендация ассистента</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {card.recommendedAction}
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-5 py-3 border-t border-white/[0.08] bg-white/[0.02] flex items-center justify-between">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Скопировано' : 'Копировать'}</span>
            </button>

            {card.actionCommand && card.actionCommand !== 'none' && (
              <button
                onClick={() => onAction?.(card.actionCommand!)}
                className="px-4 py-1.5 rounded-lg bg-white text-black hover:bg-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md cursor-pointer active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>
                  {card.actionCommand === 'flush_dns' && 'Сбросить DNS'}
                  {card.actionCommand === 'restart_vpn' && 'Перезапустить'}
                  {card.actionCommand === 'rotate_sni' && 'Сменить SNI'}
                </span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
