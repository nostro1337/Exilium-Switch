import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useVpnStatus } from '../../src/hooks/useVpnStatus'
import { useSettings } from '../../src/hooks/useSettings'
import { useLogs } from '../../src/hooks/useLogs'
import type { VpnStatus, AppSettings, LogEntry } from '../../shared/types'

declare global {
  interface Window {
    electronAPI: any
  }
}

describe('React Custom Hooks (Renderer Process)', () => {
  beforeEach(() => {
    // Setup window.electronAPI mock
    const mockStatus: VpnStatus = {
      isRunning: false,
      currentZone: 'Russian Standard Time',
      lfsvcStatus: 'Stopped',
      uptimeSeconds: 0,
      activeProfileName: 'Основной профиль',
      appMode: 'home'
    }

    const mockSettings: AppSettings = {
      realZone: 'Russian Standard Time',
      fakeZone: 'W. Europe Standard Time',
      autoStart: false,
      minimizeToTray: true,
      startMinimized: false,
      appMode: 'home',
      activeProfileIdByMode: {}
    }

    const mockLogs: LogEntry[] = [
      { time: '12:00:00', text: 'Инициализация', type: 'info' }
    ]

    window.electronAPI = {
      getStatus: vi.fn(async () => mockStatus),
      toggleVpn: vi.fn(async () => ({ success: true, isRunning: true })),
      getSettings: vi.fn(async () => mockSettings),
      saveSettings: vi.fn(async (partial) => ({ ...mockSettings, ...partial })),
      setAppMode: vi.fn(async (mode) => ({ success: true, mode })),
      runSystemAudit: vi.fn(async () => ({} as any)),
      testLatency: vi.fn(async () => ({ latencyMs: 50 })),
      minimizeWindow: vi.fn(),
      closeWindow: vi.fn(),
      onLog: vi.fn((cb) => {
        return () => {}
      }),
      onStatusChange: vi.fn((cb) => {
        return () => {}
      }),
      getRecentLogs: vi.fn(async () => mockLogs),
      getProfiles: vi.fn(async () => []),
      importProfile: vi.fn(async () => ({ success: true })),
      importVlessLink: vi.fn(async () => ({ success: true })),
      selectProfile: vi.fn(async () => ({ success: true })),
      deleteProfile: vi.fn(async () => ({ success: true })),
      exportLogs: vi.fn(async () => ({ success: true, savedPath: 'C:\\logs.log' })),
      openLogsFolder: vi.fn(async () => {}),
      getAppVersion: vi.fn(async () => '1.5.6'),
      checkForUpdates: vi.fn(async () => ({ success: true })),
      startUpdateDownload: vi.fn(async () => ({ success: true })),
      quitAndInstallUpdate: vi.fn(async () => {}),
      onUpdateChecking: vi.fn(() => () => {}),
      onUpdateAvailable: vi.fn(() => () => {}),
      onUpdateNotAvailable: vi.fn(() => () => {}),
      onUpdateProgress: vi.fn(() => () => {}),
      onUpdateDownloaded: vi.fn(() => () => {}),
      onUpdateError: vi.fn(() => () => {}),
      onOpenUpdateModal: vi.fn(() => () => {})
    }
  })

  it('useVpnStatus should initialize and provide toggle and mode switch', async () => {
    const { result } = renderHook(() => useVpnStatus())

    expect(result.current.status).toBeDefined()
    expect(result.current.status.isRunning).toBe(false)

    await act(async () => {
      const res = await result.current.toggleVpn()
      expect(res?.isRunning).toBe(true)
    })

    await act(async () => {
      const res = await result.current.setMode('office')
      expect(res?.success).toBe(true)
    })
  })

  it('useSettings should load and update settings', async () => {
    const { result } = renderHook(() => useSettings())

    expect(result.current.settings).toBeDefined()
    expect(result.current.settings.appMode).toBe('home')

    await act(async () => {
      const updated = await result.current.updateSettings({ appMode: 'office' })
      expect(updated?.appMode).toBe('office')
    })
  })

  it('useLogs should fetch recent logs and allow exporting', async () => {
    const { result } = renderHook(() => useLogs())

    expect(result.current.logs).toBeDefined()

    await act(async () => {
      const res = await result.current.exportLogs()
      expect(res?.success).toBe(true)
      expect(res?.savedPath).toBe('C:\\logs.log')
    })
  })
})
