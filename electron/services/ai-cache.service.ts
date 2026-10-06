import fs from 'node:fs'
import path from 'node:path'
import { getAppDataDir } from '../utils/paths'
import { AiNormalizerService } from './ai-normalizer.service'
import { LogService } from './log.service'
import type { AiExplanationCard, AiCacheStats } from '../../shared/types/ai.types'


const BASE_SEEDS: Omit<AiExplanationCard, 'templateId'>[] = [
  {
    pattern: 'outbound/vless: dial tcp <IP>:<PORT>: i/o timeout',
    title: 'Таймаут ответа целевого узла',
    severity: 'low',
    isDangerous: false,
    humanExplanation: 'Целевой веб-сайт или узел не ответил за отведенный период ожидания. Это обычное поведение при обращении к медленным, перегруженным или недоступным адресам.',
    technicalDetails: 'Истек лимит ожидания TCP handshake с внешним хостом. Основной туннель VLESS работает стабильно.',
    recommendedAction: 'Действий не требуется. Защита и сетевой стек функционируют штатно.',
    actionCommand: 'none',
    firstSeen: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    occurrences: 1
  },
  {
    pattern: 'read: connection reset by peer',
    title: 'Сброс соединения удаленным сервером',
    severity: 'low',
    isDangerous: false,
    humanExplanation: 'Внешний веб-сервер штатно закрыл активную TCP-сессию (например, после завершения передачи страницы или по тайм-ауту неактивности).',
    technicalDetails: 'Удаленный хост отправил TCP RST пакет для освобождения сокета.',
    recommendedAction: 'Штатное сетевое событие. Никаких вмешательств не требуется.',
    actionCommand: 'none',
    firstSeen: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    occurrences: 1
  },
  {
    pattern: 'context canceled',
    title: 'Отмена запроса пользователем',
    severity: 'info',
    isDangerous: false,
    humanExplanation: 'Браузер или приложение прервало начатое соединение (например, вы перешли на другую страницу или закрыли вкладку до полной загрузки).',
    technicalDetails: 'Локальный сокет получил отмену контекста (Go context.Canceled).',
    recommendedAction: 'Действий не требуется.',
    actionCommand: 'none',
    firstSeen: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    occurrences: 1
  },
  {
    pattern: 'inbound/tun: packet dropped',
    title: 'Пропуск служебного пакета',
    severity: 'info',
    isDangerous: false,
    humanExplanation: 'Сетевой драйвер Wintun отфильтровал локальный широковещательный или служебный пакет ОС, не предназначенный для туннеля.',
    technicalDetails: 'Пакет не соответствовал правилам маршрутизации туннеля и был безопасно пропущен.',
    recommendedAction: 'Штатная работа изоляции сетевого стека.',
    actionCommand: 'none',
    firstSeen: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    occurrences: 1
  }
]


export class AiCacheService {
  private static instance: AiCacheService | null = null
  private cache: Map<string, AiExplanationCard> = new Map()
  private cacheFilePath: string

  private constructor() {
    this.cacheFilePath = path.join(getAppDataDir(), 'ai_cache.json')
    this.loadFromDisk()
  }

  public static getInstance(): AiCacheService {
    if (!AiCacheService.instance) {
      AiCacheService.instance = new AiCacheService()
    }
    return AiCacheService.instance
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.cacheFilePath)) {
        const raw = fs.readFileSync(this.cacheFilePath, 'utf-8')
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          for (const card of parsed) {
            if (card && card.templateId) {
              this.cache.set(card.templateId, card)
            }
          }
        }
      }
    } catch {
      // If corrupted, fallback to seed
    }

    // Seed if empty
    if (this.cache.size === 0) {
      this.populateSeeds()
      this.saveToDisk()
    }
  }

  private populateSeeds(): void {
    const normalizer = AiNormalizerService.getInstance()
    for (const seed of BASE_SEEDS) {
      const { templateId, pattern } = normalizer.normalize(seed.pattern)
      this.cache.set(templateId, {
        ...seed,
        pattern,
        templateId
      })
    }
  }

  private saveToDisk(): void {
    try {
      const cards = Array.from(this.cache.values())
      fs.writeFileSync(this.cacheFilePath, JSON.stringify(cards, null, 2), 'utf-8')
    } catch {
      // Ignored for safe async writing
    }
  }

  public get(templateId: string): AiExplanationCard | null {
    const card = this.cache.get(templateId)
    if (card) {
      card.occurrences = (card.occurrences || 0) + 1
      card.lastSeen = new Date().toISOString()
      this.saveToDisk()
      return card
    }
    return null
  }

  public set(card: AiExplanationCard): void {
    this.cache.set(card.templateId, {
      ...card,
      lastSeen: new Date().toISOString()
    })
    this.saveToDisk()
  }

  public getAll(): AiExplanationCard[] {
    return Array.from(this.cache.values())
  }

  public clear(): void {
    this.cache.clear()
    this.populateSeeds()
    this.saveToDisk()
    LogService.getInstance().addLog('AI Sentinel: база знаний кэша сброшена к базовым шаблонам', 'info', undefined, 'system')
  }

  public getStats(): AiCacheStats {
    let totalOccurrences = 0
    let mostFrequentPattern = ''
    let maxOccurrences = 0

    for (const card of this.cache.values()) {
      totalOccurrences += card.occurrences || 0
      if ((card.occurrences || 0) > maxOccurrences) {
        maxOccurrences = card.occurrences
        mostFrequentPattern = card.pattern
      }
    }

    return {
      totalCards: this.cache.size,
      totalOccurrences,
      mostFrequentPattern: mostFrequentPattern || undefined
    }
  }
}
