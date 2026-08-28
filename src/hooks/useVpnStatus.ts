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

  // 1-second client-side uptime ticker when connected
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (status.isRunning) {
      interval = setInterval(() => {
        setStatus((prev) => ({
          ...prev,
          uptimeSeconds: prev.uptimeSeconds + 1
        }))
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [status.isRunning])

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
