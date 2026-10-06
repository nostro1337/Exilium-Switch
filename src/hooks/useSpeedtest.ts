import { useState, useEffect, useCallback } from 'react'
import type { SpeedtestProgress, SpeedtestResult } from '../../shared/types/speedtest.types'

export function useSpeedtest() {
  const [progress, setProgress] = useState<SpeedtestProgress>({
    stage: 'idle',
    progressPct: 0,
    currentSpeedMbps: 0,
    pingMs: null,
    downloadMbps: null,
    uploadMbps: null
  })
  const [result, setResult] = useState<SpeedtestResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    const unsub = window.electronAPI?.onSpeedtestProgress?.((p) => {
      setProgress(p)
      if (p.stage === 'completed') {
        setIsRunning(false)
        setResult({
          pingMs: p.pingMs,
          downloadMbps: p.downloadMbps,
          uploadMbps: p.uploadMbps,
          timestamp: new Date().toISOString()
        })
      } else if (p.stage === 'error' || p.stage === 'idle') {
        setIsRunning(false)
      } else {
        setIsRunning(true)
      }
    })
    return () => unsub?.()
  }, [])

  const runSpeedtest = useCallback(async () => {
    if (isRunning) return
    setIsRunning(true)
    setProgress({
      stage: 'ping',
      progressPct: 10,
      currentSpeedMbps: 0,
      pingMs: null,
      downloadMbps: null,
      uploadMbps: null
    })
    try {
      const res = await window.electronAPI?.runSpeedtest?.()
      if (res) {
        setResult(res)
      }
    } catch {
      // Error handled by progress stream
    } finally {
      setIsRunning(false)
    }
  }, [isRunning])

  const cancelSpeedtest = useCallback(async () => {
    await window.electronAPI?.cancelSpeedtest?.()
    setIsRunning(false)
    setProgress({
      stage: 'idle',
      progressPct: 0,
      currentSpeedMbps: 0,
      pingMs: null,
      downloadMbps: null,
      uploadMbps: null
    })
  }, [])

  return {
    progress,
    result,
    isRunning,
    runSpeedtest,
    cancelSpeedtest
  }
}
