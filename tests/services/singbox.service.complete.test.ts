import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => 'C:\\MockAppData'),
    getAppPath: vi.fn(() => 'C:\\MockAppPath'),
    getVersion: vi.fn(() => '1.5.1'),
    quit: vi.fn()
  },
  BrowserWindow: vi.fn(),
  Notification: {
    isSupported: vi.fn(() => false)
  }
}))

import { SingBoxService } from '../../electron/services/singbox.service'
import { ProfileService } from '../../electron/services/profile.service'

describe('SingBoxService Comprehensive Engine Testing', () => {
  let singboxService: SingBoxService
  let profileService: ProfileService

  beforeEach(() => {
    singboxService = SingBoxService.getInstance()
    profileService = ProfileService.getInstance()
  })

  it('should test getStatus and toggle transitions', async () => {
    const status = await singboxService.getStatus()
    expect(status).toBeDefined()
    expect(typeof status.isRunning).toBe('boolean')

    // Test toggle logic
    const toggleRes = await singboxService.toggle(false)
    expect(toggleRes).toBeDefined()
  }, 20000)

  it('should test profile selection error handling on invalid IDs', () => {
    const res = profileService.selectProfile('non-existent-uuid-999')
    expect(res.success).toBe(false)

    const delRes = profileService.deleteProfile('non-existent-uuid-999')
    expect(delRes).toBeDefined()
  })
})
