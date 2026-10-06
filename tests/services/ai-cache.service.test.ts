import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AiCacheService } from '../../electron/services/ai-cache.service'
import type { AiExplanationCard } from '../../shared/types/ai.types'

describe('AiCacheService', () => {
  let cacheService: AiCacheService

  beforeEach(() => {
    cacheService = AiCacheService.getInstance()
    cacheService.clear()
  })

  it('should initialize with baseline seed cards', () => {
    const all = cacheService.getAll()
    expect(all.length).toBeGreaterThan(0)
    expect(all[0].templateId).toBeDefined()
  })

  it('should retrieve a card by templateId and increment occurrence', () => {
    const all = cacheService.getAll()
    const targetId = all[0].templateId
    const card = cacheService.get(targetId)
    expect(card).not.toBeNull()
    expect(card?.templateId).toBe(targetId)
    expect(card?.occurrences).toBeGreaterThanOrEqual(2)
  })

  it('should set and get a custom card', () => {
    const customCard: AiExplanationCard = {
      templateId: 'test1234',
      pattern: 'test pattern <IP>',
      title: 'Тестовая ошибка',
      severity: 'medium',
      isDangerous: false,
      humanExplanation: 'Тест',
      recommendedAction: 'Ничего',
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      occurrences: 1
    }

    cacheService.set(customCard)
    const retrieved = cacheService.get('test1234')
    expect(retrieved).not.toBeNull()
    expect(retrieved?.title).toBe('Тестовая ошибка')
  })

  it('should return cache statistics', () => {
    const stats = cacheService.getStats()
    expect(stats.totalCards).toBeGreaterThan(0)
    expect(stats.totalOccurrences).toBeGreaterThan(0)
  })
})
