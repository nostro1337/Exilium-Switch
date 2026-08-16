import React, { useState } from 'react'
import { Globe, MapPinOff, Activity, RefreshCw, Radio } from 'lucide-react'

interface ResidentStatusCardProps {
  isRunning: boolean
  currentZone: string
  fakeZone: string
  realZone: string
  lfsvcStatus: string
}

export const ResidentStatusCard: React.FC<ResidentStatusCardProps> = ({
  isRunning,
  currentZone,
  fakeZone,
  realZone,
  lfsvcStatus
}) => {
  const [latency, setLatency] = useState<number | null>(null)
  const [testingLatency, setTestingLatency] = useState(false)

  const handleTestLatency = async () => {
    if (testingLatency) return
    setTestingLatency(true)
    try {
      const res = await window.electronAPI?.testLatency()
      setLatency(res?.latencyMs ?? null)
    } finally {
      setTestingLatency(false)
    }
  }

  const isFakeZone = currentZone.toLowerCase().includes('europe') || currentZone === fakeZone
  const isLocationBlocked = lfsvcStatus.toLowerCase().includes('stop') || lfsvcStatus === 'NotFound'

  return (
    <div className="grid grid-cols-2 gap-2.5 px-4 select-none">
      {/* Timezone Spoofing Card */}
      <div className="mono-card rounded-xl p-3 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
            <Globe className="w-3.5 h-3.5 text-zinc-300" strokeWidth={1.75} />
            <span>Часовой пояс</span>
          </div>
          <span className={`w-2 h-2 rounded-full transition-all duration-300 ${
            isRunning && isFakeZone 
              ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]' 
              : 'bg-zinc-600'
          }`} />
        </div>

        <div className="mt-2.5">
          <p className="text-xs font-semibold text-zinc-100 truncate" title={currentZone}>
            {currentZone || 'Tomsk Standard Time'}
          </p>
          <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
            {isRunning ? `Целевой: ${fakeZone}` : `Реальный: ${realZone}`}
          </p>
        </div>
      </div>

      {/* Geolocation Shield Card */}
      <div className="mono-card rounded-xl p-3 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
            <MapPinOff className="w-3.5 h-3.5 text-zinc-300" strokeWidth={1.75} />
            <span>Служба гео (lfsvc)</span>
          </div>
          <span className={`w-2 h-2 rounded-full transition-all duration-300 ${
            isRunning && isLocationBlocked 
              ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]' 
              : isRunning
              ? 'bg-amber-500/80 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
              : 'bg-zinc-600'
          }`} />
        </div>

        <div className="mt-2.5">
          <p className="text-xs font-semibold text-zinc-100">
            {isRunning 
              ? (isLocationBlocked ? 'Заблокирована (Safe)' : 'Активна (Не отключена)')
              : (isLocationBlocked ? 'Отключена (Windows)' : 'Активна (Windows)')}
          </p>
          <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
            {isRunning 
              ? (isLocationBlocked ? 'Защита от утечки координат' : 'Предупреждение: служба работает')
              : 'Стандартный режим гео'}
          </p>
        </div>
      </div>

      {/* Amsterdam Latency Card */}
      <div className="col-span-2 mono-card rounded-xl p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/[0.06] text-white border border-white/[0.08]">
            <Activity className="w-4 h-4" strokeWidth={2} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-zinc-200">Пинг до Амстердама (NL)</span>
              <Radio className="w-3 h-3 text-zinc-500 animate-pulse" />
            </div>
            <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
              {latency !== null ? (
                <span className="text-white font-semibold tracking-wide">
                  {latency} ms
                </span>
              ) : (
                'Нажмите «Пинг» для замера'
              )}
            </p>
          </div>
        </div>

        <button
          onClick={handleTestLatency}
          disabled={testingLatency}
          title="Замерить пинг до сервера в Амстердаме"
          className="px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/15 text-zinc-200 hover:text-white border border-white/10 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3 h-3 ${testingLatency ? 'animate-spin text-white' : ''}`} strokeWidth={1.75} />
          <span>{testingLatency ? 'Тест...' : 'Пинг'}</span>
        </button>
      </div>
    </div>
  )
}
