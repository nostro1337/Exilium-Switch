import { describe, it, expect, beforeEach, vi } from 'vitest'

let shortcutWritten = false
let notificationConstructed = false

vi.mock('electron', () => {
  class MockNotification {
    public static isSupported = vi.fn(() => true)
    public show = vi.fn()
    public on = vi.fn((event: string, cb: Function) => {
      if (event === 'click') {
        cb()
      }
    })
    constructor() {
      notificationConstructed = true
    }
  }

  return {
    Notification: MockNotification,
    shell: {
      writeShortcutLink: vi.fn(() => {
        shortcutWritten = true
        return true
      })
    },
    app: {
      getPath: vi.fn(() => 'C:\\MockAppData'),
      getAppPath: vi.fn(() => 'C:\\MockAppPath'),
      getVersion: vi.fn(() => '1.5.1'),
      setAppUserModelId: vi.fn()
    }
  }
})

import { NotificationService } from '../../electron/services/notification.service'

describe('NotificationService Deep Testing', () => {
  let notificationService: NotificationService
  const mockFocus = vi.fn()

  beforeEach(() => {
    notificationService = NotificationService.getInstance()
    notificationService.setMainWindowResolver(() => ({
      showAndFocus: mockFocus
    } as any))
  })

  it('should create Start Menu shortcut in registerWindowsIntegration', () => {
    notificationService.registerWindowsIntegration()
    expect(shortcutWritten).toBe(true)
  })

  it('should create and show Windows Notification with click callback', () => {
    notificationService.showNotification('Внимание', 'VPN активирован', true)
    expect(notificationConstructed).toBe(true)
  })
})
