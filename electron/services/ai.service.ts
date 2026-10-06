import { AiNormalizerService } from './ai-normalizer.service'
import { AiCacheService } from './ai-cache.service'
import { SettingsService } from './settings.service'
import { SingBoxService } from './singbox.service'
import { LogService } from './log.service'
import type { AiExplanationCard, AiTestResult, AiVerdict, LiveTelemetry } from '../../shared/types/ai.types'
import type { AuditDiagnosisResult } from '../../shared/types/audit.types'

const CANDIDATE_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-2.5-flash'
]


const SYSTEM_PROMPT = `Ты — ведущий инженер по сетевой безопасности и сетевой телеметрии персонального защитного клиента Exilium Switch.
Твоя цель: анализировать системные логи ядра sing-box, аномалии сетевого стека Windows и давать спокойные, полезные и профессиональные объяснения на РУССКОМ языке.
Принципы:
1. Не пугай пользователя, если это рядовой сетевой шум (таймаут медленного сайта, закрытие вкладки браузера, реклама).
2. Если есть подозрение на вмешательство провайдера или ТСПУ (RST injection, DNS spoofing, handshake drop), объясни суть и предложи действие.
3. Отвечай СТРОГО валидным JSON объектом следующей структуры (без markdown оберток, только чистый JSON):
{
  "title": "Краткий заголовок",
  "severity": "info" | "low" | "medium" | "high" | "critical",
  "isDangerous": false,
  "humanExplanation": "Понятное объяснение человеческим языком (2-3 предложения)",
  "technicalDetails": "Краткая техническая суть сетевого события (1-2 предложения)",
  "recommendedAction": "Что делать пользователю",
  "actionCommand": "none" | "flush_dns" | "restart_vpn" | "rotate_sni"
}`

export class AiService {
  private static instance: AiService | null = null

  public static getInstance(): AiService {
    if (!AiService.instance) {
      AiService.instance = new AiService()
    }
    return AiService.instance
  }

  private async callGemini(
    apiKey: string,
    payload: any,
    timeoutMs = 12000
  ): Promise<{ data: any; model: string; latencyMs: number }> {
    const startTime = Date.now()
    let lastError: any = null

    for (const model of CANDIDATE_MODELS) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(timeoutMs)
        })

        if (response.status === 404) {
          lastError = new Error(`Модель ${model} недоступна (404)`)
          continue
        }

        if (!response.ok) {
          const errText = await response.text().catch(() => '')
          throw new Error(`Google API (${response.status}): ${errText.substring(0, 150)}`)
        }

        const data = await response.json()
        const latencyMs = Date.now() - startTime
        return { data, model, latencyMs }
      } catch (err: any) {
        lastError = err
        if (err?.message?.includes('404')) {
          continue
        }
        throw err
      }
    }

    throw lastError || new Error('Все доступные модели Gemini вернули ошибку')
  }

  /**
   * Explains a sing-box log line using LogNormalizer and AI Cache.
   * If cached, returns immediately (0ms). If novel, calls Gemini via Egress tunnel.
   */
  public async explainLog(logLine: string): Promise<AiExplanationCard> {
    const normalizer = AiNormalizerService.getInstance()
    const cacheService = AiCacheService.getInstance()
    const logService = LogService.getInstance()

    const { templateId, pattern, isErrorOrWarn, originalText } = normalizer.normalize(logLine)

    // 1. Fast Cache Check
    const cached = cacheService.get(templateId)
    if (cached) {
      logService.addLog(`AI Sentinel: мгновенный ответ из кэша [${templateId}] «${cached.title}»`, 'info', templateId, 'system')
      return cached
    }

    const settings = SettingsService.getInstance().loadSettings()
    const apiKey = (settings.geminiApiKey || '').trim()

    // 2. If no API key configured, return fallback card
    if (!apiKey) {
      const fallbackCard: AiExplanationCard = {
        templateId,
        pattern,
        title: isErrorOrWarn ? 'Сетевое событие (Без ИИ)' : 'Информационное сообщение',
        severity: isErrorOrWarn ? 'low' : 'info',
        isDangerous: false,
        humanExplanation: `Зафиксирована строка лога: «${pattern}». Для получения подробного анализа от Gemini укажите бесплатный API ключ в Настройках ➔ AI Sentinel.`,
        technicalDetails: `Сырой лог ядра: ${originalText}`,
        recommendedAction: 'Вы можете добавить ключ Google AI Studio в настройках для активации ИИ-ассистента.',
        actionCommand: 'none',
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        occurrences: 1
      }
      cacheService.set(fallbackCard)
      logService.addLog(`AI Sentinel: локальный разбор события [${templateId}] (API ключ не настроен)`, 'info', templateId, 'system')
      return fallbackCard
    }

    // 3. Egress Tunnel Check: if VPN is not running, log note
    const isVpnRunning = await SingBoxService.getInstance().isRunning()
    logService.addLog(`AI Sentinel: запрос анализа шаблона [${templateId}] через Gemini...`, 'info', templateId, 'system')

    try {
      const prompt = `Проанализируй данное событие из логов VPN клиента:
Шаблон: "${pattern}"
Исходная строка: "${originalText}"
Состояние туннеля: ${isVpnRunning ? 'Активен (Egress защищен)' : 'Выключен'}`

      const payload = {
        contents: [
          {
            role: 'user',
            parts: [
              { text: `${SYSTEM_PROMPT}\n\n${prompt}` }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json'
        }
      }

      const { data, model } = await this.callGemini(apiKey, payload, 12000)
      const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
      const parsed = JSON.parse(rawJson)

      const card: AiExplanationCard = {
        templateId,
        pattern,
        title: parsed.title || 'Анализ сетевого события',
        severity: parsed.severity || (isErrorOrWarn ? 'low' : 'info'),
        isDangerous: !!parsed.isDangerous,
        humanExplanation: parsed.humanExplanation || 'Событие обработано нейросетевым ассистентом.',
        technicalDetails: parsed.technicalDetails || `Шаблон: ${pattern}`,
        recommendedAction: parsed.recommendedAction || 'Действий не требуется.',
        actionCommand: parsed.actionCommand || 'none',
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        occurrences: 1
      }

      cacheService.set(card)
      logService.addLog(`AI Sentinel: успешно сформирована карточка [${templateId}] «${card.title}» (${card.severity}) [${model}]`, 'success', templateId, 'system')
      return card
    } catch (err: any) {
      // Fallback on network/API failure
      const fallbackCard: AiExplanationCard = {
        templateId,
        pattern,
        title: 'Сетевое событие ядра',
        severity: isErrorOrWarn ? 'low' : 'info',
        isDangerous: false,
        humanExplanation: `Событие ядра: «${pattern}». Запрос к ИИ не удался (${err?.message || 'Таймаут'}).`,
        technicalDetails: `Исходный лог: ${originalText}`,
        recommendedAction: 'Проверьте активность туннеля или валидность ключа Google AI Studio.',
        actionCommand: 'none',
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        occurrences: 1
      }
      cacheService.set(fallbackCard)
      logService.addLog(`AI Sentinel: ошибка обращения к Gemini API [${templateId}]: ${err?.message || 'Таймаут'}`, 'warn', templateId, 'system')
      return fallbackCard
    }
  }

  /**
   * Tests API key validity against available Gemini models
   */
  public async testApiKey(apiKey: string): Promise<AiTestResult> {
    const key = (apiKey || '').trim()
    const logService = LogService.getInstance()
    if (!key) {
      logService.addLog('AI Sentinel: тестирование ключа отменено (ключ не указан)', 'warn', undefined, 'system')
      return {
        success: false,
        model: CANDIDATE_MODELS[0],
        latencyMs: 0,
        message: 'API ключ не указан'
      }
    }

    logService.addLog(`AI Sentinel: отправка тестового запроса к Gemini (${CANDIDATE_MODELS[0]})...`, 'info', undefined, 'system')
    try {
      const payload = {
        contents: [
          {
            parts: [{ text: 'Ответь словом "OK"' }]
          }
        ],
        generationConfig: {
          maxOutputTokens: 10
        }
      }

      const { model, latencyMs } = await this.callGemini(key, payload, 8000)

      logService.addLog(`AI Sentinel: ключ Gemini API успешно верифицирован (${model}, ${latencyMs} ms)`, 'success', undefined, 'system')
      return {
        success: true,
        model,
        latencyMs,
        message: `Подключение к ${model} успешно (${latencyMs} ms)`
      }
    } catch (err: any) {
      logService.addLog(`AI Sentinel: сбой проверки соединения с Gemini API: ${err?.message || 'Таймаут'}`, 'warn', undefined, 'system')
      return {
        success: false,
        model: CANDIDATE_MODELS[0],
        latencyMs: 0,
        message: `Ошибка соединения: ${err?.message || 'Таймаут запроса'}`
      }
    }
  }

  /**
   * Synthesizes an intelligent verdict for System Diagnosis / Audit
   */
  public async explainSystemAudit(audit: AuditDiagnosisResult): Promise<AiVerdict> {
    const settings = SettingsService.getInstance().loadSettings()
    const logService = LogService.getInstance()
    const apiKey = (settings.geminiApiKey || '').trim()

    const isOffice = audit.recommendedMode === 'office'
    const defcon = isOffice ? 4 : (audit.vpsReachable ? 5 : 2)

    if (!apiKey) {
      logService.addLog('AI Sentinel: локальный вердикт системного аудита (API ключ не настроен)', 'info', undefined, 'system')
      return {
        defcon,
        status: audit.vpsReachable ? 'optimal' : 'degraded',
        title: isOffice ? 'Режим офисной сети' : (audit.vpsReachable ? 'Система полностью защищена' : 'VPS сервер недоступен'),
        summary: isOffice
          ? `Обнаружен домен ${audit.domainName}. Рекомендуется режим «Офис».`
          : (audit.vpsReachable
            ? 'Сетевой стек, DNS и служба геолокации находятся в оптимальном защищенном состоянии.'
            : 'Не удалось связаться с сервером VPS. Проверьте подключение к интернету.'),
        lastUpdated: new Date().toISOString(),
        details: [audit.recommendationReason]
      }
    }

    try {
      const prompt = `Проведи аудит системы и сетевой защиты:
Результат аудита: ${JSON.stringify(audit, null, 2)}
Сформируй краткий вердикт на русском языке в JSON:
{
  "defcon": 1..5,
  "status": "optimal" | "stable" | "degraded" | "censorship_detected" | "critical",
  "title": "Заголовок вердикта (до 6 слов)",
  "summary": "Краткий емкий вывод (2-3 предложения)",
  "details": ["пункт 1", "пункт 2"]
}`

      const payload = {
        contents: [{ role: 'user', parts: [{ text: `${SYSTEM_PROMPT}\n\n${prompt}` }] }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json' }
      }

      const { data, model } = await this.callGemini(apiKey, payload, 12000)
      const parsed = JSON.parse(data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}')

      const verdict: AiVerdict = {
        defcon: parsed.defcon || defcon,
        status: parsed.status || (audit.vpsReachable ? 'optimal' : 'degraded'),
        title: parsed.title || 'Вердикт аудита безопасности',
        summary: parsed.summary || 'Аудит завершен.',
        lastUpdated: new Date().toISOString(),
        details: parsed.details || [audit.recommendationReason]
      }

      logService.addLog(`AI Sentinel: сформирован ИИ-вердикт аудита: «${verdict.title}» (DEFCON ${verdict.defcon}) [${model}]`, 'success', undefined, 'system')
      return verdict
    } catch {
      return {
        defcon,
        status: audit.vpsReachable ? 'optimal' : 'degraded',
        title: isOffice ? 'Офисный домен' : (audit.vpsReachable ? 'Система защищена' : 'VPS недоступен'),
        summary: audit.recommendationReason || 'Сетевой стек функционирует в штатном безопасном режиме.',
        lastUpdated: new Date().toISOString(),
        details: [audit.recommendationReason]
      }
    }
  }
}

