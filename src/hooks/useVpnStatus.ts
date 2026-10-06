import { useState, useEffect, useCallback } from 'react'
import type { VpnStatus, AppMode } from '../../shared/types'

export function useVpnStatus() {
  const [status, setStatus] = useState<VpnStatus>({
    isRunning: false,
    currentZone: 'Russian Standard Time',
    lfsvcStatus: 'Stopped',
    uptimeSeconds: 0,
    activeProfileName: 'Основной профиль',
    appMode: 'home'
  })

  // Initial fetch and subscription
  useEffect(() => {
    window.electronAPI?.getStatus().then((s) => {
      if (s) setStatus(s)
    })

    const unsubscribe = window.electronAPI?.onStatusChange((updated) => {
      setStatus(updated)
    })

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [])

  // 1-second client-side uptime ticker when connected and window is visible
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    const updateUptime = () => {
      if (status.isRunning && status.startTime) {
        const computed = Math.max(0, Math.floor((Date.now() - status.startTime) / 1000))
        setStatus((prev) => ({
          ...prev,
          uptimeSeconds: computed
        }))
      }
    }

    const startTicker = () => {
      if (interval) clearInterval(interval)
      if (status.isRunning && !document.hidden) {
        const startTime = status.startTime
        interval = setInterval(() => {
          if (startTime) {
            setStatus((prev) => ({
              ...prev,
              uptimeSeconds: Math.max(0, Math.floor((Date.now() - startTime) / 1000))
            }))
          } else {
            setStatus((prev) => ({
              ...prev,
              uptimeSeconds: prev.uptimeSeconds + 1
            }))
          }
        }, 1000)
      }
    }

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateUptime()
        startTicker()
      } else {
        if (interval) {
          clearInterval(interval)
          interval = null
        }
      }
    }

    if (!document.hidden && status.isRunning) {
      startTicker()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      if (interval) clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [status.isRunning, status.startTime])

  const toggleVpn = useCallback(async () => {
    const res = await window.electronAPI?.toggleVpn()
    if (res) {
      setStatus((prev) => ({
        ...prev,
        isRunning: res.isRunning,
        uptimeSeconds: res.isRunning ? prev.uptimeSeconds : 0
      }))
    }
    return res
  }, [])

  const setMode = useCallback(async (mode: AppMode) => {
    const res = await window.electronAPI?.setAppMode(mode)
    if (res?.success) {
      const updated = await window.electronAPI?.getStatus()
      if (updated) setStatus(updated)
    }
    return res
  }, [])

  return {
    status,
    toggleVpn,
    setMode
  }
}
