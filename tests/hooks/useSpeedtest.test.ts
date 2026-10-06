import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSpeedtest } from '../../src/hooks/useSpeedtest'

describe('useSpeedtest Hook', () => {
  it('should initialize with idle state', () => {
    const { result } = renderHook(() => useSpeedtest())
    expect(result.current.isRunning).toBe(false)
    expect(result.current.progress.stage).toBe('idle')
  })

  it('should trigger runSpeedtest IPC', async () => {
    const mockRun = vi.fn(async () => ({
      pingMs: 95,
      downloadMbps: 80,
      uploadMbps: 40,
      timestamp: new Date().toISOString()
    }))

    window.electronAPI = {
      runSpeedtest: mockRun,
      onSpeedtestProgress: vi.fn(() => () => {})
    } as any

    const { result } = renderHook(() => useSpeedtest())

    await act(async () => {
      await result.current.runSpeedtest()
    })

    expect(mockRun).toHaveBeenCalled()
    expect(result.current.result?.pingMs).toBe(95)
  })

  it('should handle progress updates from electronAPI', () => {
    let progressCallback: any
    window.electronAPI = {
      onSpeedtestProgress: vi.fn((cb) => {
        progressCallback = cb
        return () => {}
      })
    } as any

    const { result } = renderHook(() => useSpeedtest())

    act(() => {
      progressCallback({
        stage: 'download',
        progressPct: 50,
        currentSpeedMbps: 82.5,
        pingMs: 95,
        downloadMbps: 82.5,
        uploadMbps: null
      })
    })

    expect(result.current.isRunning).toBe(true)
    expect(result.current.progress.currentSpeedMbps).toBe(82.5)

    act(() => {
      progressCallback({
        stage: 'completed',
        progressPct: 100,
        currentSpeedMbps: 0,
        pingMs: 95,
        downloadMbps: 85,
        uploadMbps: 45
      })
    })

    expect(result.current.isRunning).toBe(false)
    expect(result.current.result?.downloadMbps).toBe(85)
  })

  it('should trigger cancelSpeedtest', async () => {
    const cancelMock = vi.fn(async () => ({ success: true }))
    window.electronAPI = {
      cancelSpeedtest: cancelMock,
      onSpeedtestProgress: vi.fn(() => () => {})
    } as any

    const { result } = renderHook(() => useSpeedtest())

    await act(async () => {
      await result.current.cancelSpeedtest()
    })

    expect(cancelMock).toHaveBeenCalled()
    expect(result.current.isRunning).toBe(false)
  })
})
