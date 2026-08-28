import { describe, it, expect, beforeEach } from 'vitest'
import { TrayManager } from '../../electron/core/tray-manager'

describe('TrayManager System Tray Handler', () => {
  let trayManager: TrayManager

  beforeEach(() => {
    trayManager = TrayManager.getInstance()
  })

  it('should initialize correctly as singleton', () => {
    expect(trayManager).toBeDefined()
    expect(TrayManager.getInstance()).toBe(trayManager)
  })

  it('should handle updateTrayMenu safely when tray is not yet instantiated', () => {
    expect(() => trayManager.updateTrayMenu(false)).not.toThrow()
    expect(() => trayManager.updateTrayMenu(true)).not.toThrow()
  })
})
