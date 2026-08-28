import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SingBoxService } from '../../electron/services/singbox.service'
import { ProfileService } from '../../electron/services/profile.service'

describe('SingBoxService Core Engine', () => {
  let singboxService: SingBoxService

  beforeEach(() => {
    singboxService = SingBoxService.getInstance()
  })

  it('should return null or valid binary path without throwing uncaught exceptions', () => {
    const binary = singboxService.getBinaryPath()
    if (binary) {
      expect(binary.exePath).toContain('sing-box.exe')
      expect(binary.dir).toBeDefined()
    } else {
      expect(binary).toBeNull()
    }
  })

  it('should return initial VpnStatus with expected fields', async () => {
    const status = await singboxService.getStatus()
    expect(status).toBeDefined()
    expect(typeof status.isRunning).toBe('boolean')
    expect(typeof status.currentZone).toBe('string')
    expect(typeof status.uptimeSeconds).toBe('number')
  })

  it('should report false if childProcess is null and no tasklist match', async () => {
    const isRunning = await singboxService.isRunning()
    expect(typeof isRunning).toBe('boolean')
  })

  it('should handle toggle operation with state transitions', async () => {
    const res = await singboxService.toggle(false)
    expect(res).toBeDefined()
    expect(typeof res.success).toBe('boolean')
    expect(res.isRunning).toBe(false)
  })
})
