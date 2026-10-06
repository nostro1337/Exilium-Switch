import { useState, useEffect, useCallback } from 'react'
import type { LiveTelemetry, AiVerdict, AiExplanationCard, AiTestResult } from '../../shared/types/ai.types'

const DEFAULT_TELEMETRY: LiveTelemetry = {
  pingMs: null,
  jitterMs: null,
  packetLossPct: 0,
  healthScore: 100,
  rttHistory: [],
  canaryResults: {
    google: true,
    youtube: true,
    cloudflare: true
  },
  activeDpiAnomalies: [],
  lastUpdated: new Date().toISOString()
}

export function useAiTelemetry(isRunning: boolean) {
  const [telemetry, setTelemetry] = useState<LiveTelemetry>(DEFAULT_TELEMETRY)
  const [verdict, setVerdict] = useState<AiVerdict | null>(null)
  const [isLoadingVerdict, setIsLoadingVerdict] = useState(false)

  // Listen to IPC live telemetry stream
  useEffect(() => {
    // Initial fetch
    window.electronAPI?.getLiveTelemetry?.().then((t) => {
      if (t) setTelemetry(t)
    })

    const unsub = window.electronAPI?.onTelemetryChange?.((newTelemetry) => {
      if (newTelemetry) {
        setTelemetry(newTelemetry)
      }
    })

    return () => {
      unsub?.()
    }
  }, [])

  // Derive initial/computed verdict based on DEFCON health score
  useEffect(() => {
    if (!isRunning) {
      setVerdict({
        defcon: 5,
        status: 'optimal',
        title: 'Туннель не активен',
        summary: 'Включите туннель для активации монитора защищенности и когнитивного анализа.',
        lastUpdated: new Date().toISOString()
      })
      return
    }

    const score = telemetry.healthScore
    let defcon: 1 | 2 | 3 | 4 | 5 = 5
    let status: 'optimal' | 'stable' | 'degraded' | 'censorship_detected' | 'critical' = 'optimal'
    let title = 'DEFCON 5: Канал чист'
    let summary = 'Защитный туннель функционирует в оптимальном режиме. Аномалий ТСПУ и фильтрации не обнаружено.'

    if (score < 50) {
      defcon = 1
      status = 'critical'
      title = 'DEFCON 1: Критическая деградация'
      summary = 'Зафиксированы масштабные потери пакетов или блокировка целевого узла. Рекомендуется сменить профиль или протокол.'
    } else if (score < 70) {
      defcon = 2
      status = 'censorship_detected'
      title = 'DEFCON 2: Признаки фильтрации'
      summary = 'Обнаружены сбросы сессий или падение канареечных сервисов. Возможна выборочная фильтрация со стороны провайдера.'
    } else if (score < 85) {
      defcon = 3
      status = 'degraded'
      title = 'DEFCON 3: Нестабильность канала'
      summary = 'Зафиксирован повышенный джиттер или микро-потери пакетов. Соединение удерживается.'
    } else if (score < 95) {
      defcon = 4
      status = 'stable'
      title = 'DEFCON 4: Канал стабилен'
      summary = 'Туннель работает стабильно с незначительными колебаниями задержки.'
    }

    setVerdict({
      defcon,
      status,
      title,
      summary,
      lastUpdated: telemetry.lastUpdated,
      details: telemetry.activeDpiAnomalies
    })
  }, [isRunning, telemetry.healthScore, telemetry.activeDpiAnomalies, telemetry.lastUpdated])

  const explainLog = useCallback(async (logLine: string): Promise<AiExplanationCard | null> => {
    try {
      return await window.electronAPI?.explainLog?.(logLine)
    } catch {
      return null
    }
  }, [])

  const testApiKey = useCallback(async (key: string): Promise<AiTestResult> => {
    try {
      return await window.electronAPI?.testAiKey?.(key)
    } catch (err: any) {
      return {
        success: false,
        model: 'gemini-2.0-flash',
        latencyMs: 0,
        message: err?.message || 'Не удалось выполнить запрос'
      }
    }
  }, [])

  const refreshTelemetry = useCallback(async () => {
    const t = await window.electronAPI?.getLiveTelemetry?.()
    if (t) setTelemetry(t)
  }, [])

  return {
    telemetry,
    verdict,
    isLoadingVerdict,
    explainLog,
    testApiKey,
    refreshTelemetry
  }
}
