import { useState, useEffect, useCallback } from 'react'
import type { LogEntry } from '../../shared/types'

export function useLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([])

  useEffect(() => {
    // Initial fetch of recent buffer
    window.electronAPI?.getRecentLogs().then((recent) => {
      if (recent) setLogs(recent)
    })

    // Streaming real-time subscription
    const unsubscribe = window.electronAPI?.onLog((entry) => {
      setLogs((prev) => [...prev.slice(-999), entry])
    })

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [])

  const exportLogs = useCallback(async () => {
    return await window.electronAPI?.exportLogs()
  }, [])

  const openLogsFolder = useCallback(async () => {
    await window.electronAPI?.openLogsFolder()
  }, [])

  return {
    logs,
    exportLogs,
    openLogsFolder
  }
}
