import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAiTelemetry } from '../../src/hooks/useAiTelemetry'
import type { LiveTelemetry } from '../../shared/types/ai.types'

declare global {
  interface Window {
    electronAPI: any
  }
}

describe('useAiTelemetry Hook', () => {
  let telemetryListener: ((t: LiveTelemetry) => void) | null = null

  beforeEach(() => {
    telemetryListener = null

    const mockTelemetry: LiveTelemetry = {
      pingMs: 40,
      jitterMs: 2,
      packetLossPct: 0,
      healthScore: 98,
      rttHistory: [40, 42, 38],
      canaryResults: { google: true, youtube: true, cloudflare: true },
      activeDpiAnomalies: [],
      lastUpdated: new Date().toISOString()
    }

    window.electronAPI = {
      getLiveTelemetry: vi.fn(async () => mockTelemetry),
      onTelemetryChange: vi.fn((cb) => {
        telemetryListener = cb
        return () => {
          telemetryListener = null
        }
      }),
      explainLog: vi.fn(async (line) => ({
        templateId: '12345678',
        pattern: line,
        title: 'Title',
        severity: 'low',
        isDangerous: false,
        humanExplanation: 'Explanation',
        recommendedAction: 'Action',
        firstSeen: '',
        lastSeen: '',
        occurrences: 1
      })),
      testAiKey: vi.fn(async () => ({
        success: true,
        model: 'gemini-2.0-flash',
        latencyMs: 80,
        message: 'OK'
      }))
    } as any
  })

  it('should initialize and fetch telemetry and compute DEFCON 5 verdict when active', async () => {
    let hookResult: any
    await act(async () => {
      hookResult = renderHook(() => useAiTelemetry(true)).result
    })

    expect(hookResult.current.telemetry).toBeDefined()
    expect(hookResult.current.verdict?.defcon).toBe(5)
    expect(hookResult.current.verdict?.status).toBe('optimal')
  })

  it('should set inactive verdict when isRunning is false', async () => {
    let hookResult: any
    await act(async () => {
      hookResult = renderHook(() => useAiTelemetry(false)).result
    })
    expect(hookResult.current.verdict?.title).toContain('не активен')
  })

  it('should update verdict to DEFCON 1 when health score drops below 50', async () => {
    let hookResult: any
    await act(async () => {
      hookResult = renderHook(() => useAiTelemetry(true)).result
    })

    act(() => {
      if (telemetryListener) {
        telemetryListener({
          pingMs: 450,
          jitterMs: 120,
          packetLossPct: 60,
          healthScore: 30,
          rttHistory: [450],
          canaryResults: { google: false, youtube: false, cloudflare: false },
          activeDpiAnomalies: ['Massive Drop'],
          lastUpdated: new Date().toISOString()
        })
      }
    })

    expect(hookResult.current.telemetry.healthScore).toBe(30)
    expect(hookResult.current.verdict?.defcon).toBe(1)
    expect(hookResult.current.verdict?.status).toBe('critical')
  })

  it('should update verdict to DEFCON 2, 3, 4 on corresponding health score changes', async () => {
    let hookResult: any
    await act(async () => {
      hookResult = renderHook(() => useAiTelemetry(true)).result
    })

    // DEFCON 2
    act(() => {
      telemetryListener?.({
        pingMs: 250,
        jitterMs: 40,
        packetLossPct: 20,
        healthScore: 65,
        rttHistory: [250],
        canaryResults: { google: true, youtube: true, cloudflare: true },
        activeDpiAnomalies: [],
        lastUpdated: new Date().toISOString()
      })
    })
    expect(hookResult.current.verdict?.defcon).toBe(2)

    // DEFCON 3
    act(() => {
      telemetryListener?.({
        pingMs: 150,
        jitterMs: 30,
        packetLossPct: 5,
        healthScore: 80,
        rttHistory: [150],
        canaryResults: { google: true, youtube: true, cloudflare: true },
        activeDpiAnomalies: [],
        lastUpdated: new Date().toISOString()
      })
    })
    expect(hookResult.current.verdict?.defcon).toBe(3)

    // DEFCON 4
    act(() => {
      telemetryListener?.({
        pingMs: 90,
        jitterMs: 10,
        packetLossPct: 0,
        healthScore: 90,
        rttHistory: [90],
        canaryResults: { google: true, youtube: true, cloudflare: true },
        activeDpiAnomalies: [],
        lastUpdated: new Date().toISOString()
      })
    })
    expect(hookResult.current.verdict?.defcon).toBe(4)
  })

  it('should refresh telemetry on demand', async () => {
    let hookResult: any
    await act(async () => {
      hookResult = renderHook(() => useAiTelemetry(true)).result
    })

    await act(async () => {
      await hookResult.current.refreshTelemetry()
    })
    expect(hookResult.current.telemetry).toBeDefined()
  })

  it('should handle explainLog and testApiKey failures gracefully', async () => {
    window.electronAPI.explainLog = vi.fn(async () => {
      throw new Error('IPC failed')
    })
    window.electronAPI.testAiKey = vi.fn(async () => {
      throw new Error('Connection failed')
    })

    let hookResult: any
    await act(async () => {
      hookResult = renderHook(() => useAiTelemetry(true)).result
    })

    const card = await hookResult.current.explainLog('bad line')
    expect(card).toBeNull()

    const testRes = await hookResult.current.testApiKey('bad-key')
    expect(testRes.success).toBe(false)
  })
})


