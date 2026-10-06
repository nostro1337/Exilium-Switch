import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { AiService } from '../../electron/services/ai.service'
import { SettingsService } from '../../electron/services/settings.service'
import { SingBoxService } from '../../electron/services/singbox.service'
import { AiCacheService } from '../../electron/services/ai-cache.service'

describe('AiService', () => {
  let aiService: AiService

  beforeEach(() => {
    aiService = AiService.getInstance()
    AiCacheService.getInstance().clear()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return cached card immediately without calling API', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const res = await aiService.explainLog('outbound/vless: dial tcp 1.2.3.4:443: i/o timeout')

    expect(res).toBeDefined()
    expect(res.templateId).toBeDefined()
    expect(res.title).toContain('Таймаут')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('should return fallback card if no API key is configured', async () => {
    vi.spyOn(SettingsService.getInstance(), 'loadSettings').mockReturnValue({
      realZone: 'Tomsk Standard Time',
      fakeZone: 'W. Europe Standard Time',
      autoStart: false,
      minimizeToTray: true,
      startMinimized: false,
      geminiApiKey: ''
    })

    const res = await aiService.explainLog('unknown error brand new custom message 12345')
    expect(res).toBeDefined()
    expect(res.humanExplanation).toContain('Gemini')
  })

  it('should call Gemini Flash API and return parsed card when key is present', async () => {
    vi.spyOn(SettingsService.getInstance(), 'loadSettings').mockReturnValue({
      realZone: 'Tomsk Standard Time',
      fakeZone: 'W. Europe Standard Time',
      autoStart: false,
      minimizeToTray: true,
      startMinimized: false,
      geminiApiKey: 'valid-test-key'
    })
    vi.spyOn(SingBoxService.getInstance(), 'isRunning').mockResolvedValue(true)

    const mockApiResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  title: 'Блокировка рукопожатия TLS',
                  severity: 'high',
                  isDangerous: true,
                  humanExplanation: 'Провайдер блокирует TLS handshake.',
                  technicalDetails: 'TCP RST injection detected.',
                  recommendedAction: 'Переключитесь на Hysteria2.',
                  actionCommand: 'restart_vpn'
                })
              }
            ]
          }
        }
      ]
    }

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse
    } as any)

    const res = await aiService.explainLog('novel tls error signature 987654')
    expect(res.title).toBe('Блокировка рукопожатия TLS')
    expect(res.severity).toBe('high')
    expect(res.isDangerous).toBe(true)
    expect(res.actionCommand).toBe('restart_vpn')
  })

  it('should test API key connectivity successfully', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({})
    } as any)

    const res = await aiService.testApiKey('my-key-123')
    expect(res.success).toBe(true)
    expect(res.model).toBe('gemini-3.6-flash')
  })

  it('should fallback to next model when 404 is returned', async () => {
    let callCount = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
      callCount++
      if (url.toString().includes('gemini-3.6-flash')) {
        return { ok: false, status: 404, text: async () => 'Model not found' } as any
      }
      return {
        ok: true,
        json: async () => ({})
      } as any
    })

    const res = await aiService.testApiKey('my-key-123')
    expect(res.success).toBe(true)
    expect(res.model).toBe('gemini-3.5-flash')
    expect(callCount).toBe(2)
  })

  it('should handle API key test failure gracefully', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => 'API_KEY_INVALID'
    } as any)

    const res = await aiService.testApiKey('bad-key')
    expect(res.success).toBe(false)
    expect(res.message).toContain('400')
  })

  it('should return error if API key is empty during test', async () => {
    const res = await aiService.testApiKey('')
    expect(res.success).toBe(false)
    expect(res.message).toContain('не указан')
  })

  it('should generate intelligent verdict for system audit', async () => {
    const mockAudit = {
      hostname: 'DESKTOP-TEST',
      currentUser: 'Nostro',
      isAdministrator: true,
      domainJoined: false,
      domainName: '',
      domainControllers: [],
      dnsServers: ['1.1.1.1'],
      dnsSuffixes: [],
      defaultGateway: '192.168.1.1',
      ipAddress: '192.168.1.100',
      vpsReachable: true,
      vpsLatencyMs: 45,
      recommendedMode: 'home' as const,
      recommendationReason: 'Оптимальное состояние'
    }

    const verdict = await aiService.explainSystemAudit(mockAudit)
    expect(verdict).toBeDefined()
    expect(verdict.defcon).toBe(5)
    expect(verdict.status).toBe('optimal')
  })
})
