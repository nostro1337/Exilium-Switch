import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NotificationService } from '../../electron/services/notification.service'

describe('NotificationService Windows Toast & Integration', () => {
  let notificationService: NotificationService

  beforeEach(() => {
    notificationService = NotificationService.getInstance()
  })

  it('should initialize and set main window resolver', () => {
    const dummyResolver = vi.fn(() => null)
    notificationService.setMainWindowResolver(dummyResolver)
    expect(notificationService).toBeDefined()
  })

  it('should execute registerWindowsIntegration without uncaught errors', () => {
    expect(() => notificationService.registerWindowsIntegration()).not.toThrow()
  })

  it('should execute showNotification safely in headless environment', () => {
    expect(() => notificationService.showNotification('Тест', 'Текст уведомления')).not.toThrow()
  })
})
