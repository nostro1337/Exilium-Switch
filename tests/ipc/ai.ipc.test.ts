import { describe, it, expect, vi, beforeEach } from 'vitest'

const handlers: Record<string, Function> = {}

vi.mock('electron', () => {
  return {
    ipcMain: {
      handle: vi.fn((channel: string, handler: Function) => {
        handlers[channel] = handler
      }),
      on: vi.fn()
    },
    app: {
      getPath: vi.fn(() => 'C:\\MockAppData'),
      getAppPath: vi.fn(() => 'C:\\MockAppPath'),
      getVersion: vi.fn(() => '1.5.8'),
      quit: vi.fn()
    }
  }
})

import { registerAiIpcHandlers } from '../../electron/ipc/ai.ipc'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { AiService } from '../../electron/services/ai.service'
import { AiCacheService } from '../../electron/services/ai-cache.service'
import { TelemetryService } from '../../electron/services/telemetry.service'

describe('AI IPC Handlers', () => {
  beforeEach(() => {
    registerAiIpcHandlers()
  })

  it('should register and execute AI_EXPLAIN_LOG handler', async () => {
    vi.spyOn(AiService.getInstance(), 'explainLog').mockResolvedValue({
      templateId: '12345678',
      pattern: 'test',
      title: 'Title',
      severity: 'low',
      isDangerous: false,
      humanExplanation: 'Explanation',
      recommendedAction: 'Action',
      firstSeen: '',
      lastSeen: '',
      occurrences: 1
    })

    const handler = handlers[IPC_CHANNELS.AI_EXPLAIN_LOG]
    expect(handler).toBeDefined()

    const res = await handler({}, 'test log line')
    expect(res.templateId).toBe('12345678')
  })

  it('should register and execute AI_GET_CARD and AI_GET_ALL_CARDS', async () => {
    const getCardHandler = handlers[IPC_CHANNELS.AI_GET_CARD]
    const getAllHandler = handlers[IPC_CHANNELS.AI_GET_ALL_CARDS]

    expect(getCardHandler).toBeDefined()
    expect(getAllHandler).toBeDefined()

    const card = getCardHandler({}, 'a7f8c9b1')
    expect(card).toBeDefined()

    const all = getAllHandler({})
    expect(Array.isArray(all)).toBe(true)
  })

  it('should register and execute AI_CLEAR_CACHE and AI_GET_CACHE_STATS', () => {
    const clearHandler = handlers[IPC_CHANNELS.AI_CLEAR_CACHE]
    const statsHandler = handlers[IPC_CHANNELS.AI_GET_CACHE_STATS]

    const clearRes = clearHandler({})
    expect(clearRes.success).toBe(true)

    const stats = statsHandler({})
    expect(stats.totalCards).toBeGreaterThan(0)
  })

  it('should register and execute AI_TEST_CONNECTION', async () => {
    vi.spyOn(AiService.getInstance(), 'testApiKey').mockResolvedValue({
      success: true,
      model: 'gemini-2.0-flash',
      latencyMs: 120,
      message: 'OK'
    })

    const testHandler = handlers[IPC_CHANNELS.AI_TEST_CONNECTION]
    const res = await testHandler({}, 'test-api-key')
    expect(res.success).toBe(true)
  })

  it('should register and execute AI_GET_TELEMETRY and AI_EXPLAIN_AUDIT', async () => {
    const telemHandler = handlers[IPC_CHANNELS.AI_GET_TELEMETRY]
    const auditHandler = handlers[IPC_CHANNELS.AI_EXPLAIN_AUDIT]

    const telem = telemHandler({})
    expect(telem.healthScore).toBeDefined()

    const verdict = await auditHandler({}, { issues: [] } as any)
    expect(verdict.defcon).toBeDefined()
  })
})
