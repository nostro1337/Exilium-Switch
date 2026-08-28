import { describe, it, expect, beforeEach } from 'vitest'
import { WindowManager } from '../../electron/core/window-manager'

describe('WindowManager Singleton & State', () => {
  let windowManager: WindowManager

  beforeEach(() => {
    windowManager = WindowManager.getInstance()
  })

  it('should initialize correctly as singleton', () => {
    expect(windowManager).toBeDefined()
    expect(WindowManager.getInstance()).toBe(windowManager)
  })

  it('should manage application quitting flag', () => {
    expect(windowManager.isAppQuitting()).toBe(false)
    windowManager.setQuitting(true)
    expect(windowManager.isAppQuitting()).toBe(true)
    windowManager.setQuitting(false)
    expect(windowManager.isAppQuitting()).toBe(false)
  })

  it('should determine shouldStartHidden flag based on arguments or settings', () => {
    const shouldStartHidden = windowManager.shouldStartHidden()
    expect(typeof shouldStartHidden).toBe('boolean')
  })
})
