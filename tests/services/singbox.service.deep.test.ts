import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../../electron/utils/exec', () => ({
  execFileAsync: vi.fn(async () => ({ stdout: '', stderr: '' })),
  execFileSyncSafe: vi.fn(() => ''),
  setRegistryDword: vi.fn(async () => true)
}))

import { SingBoxService } from '../../electron/services/singbox.service'

describe('SingBoxService Deep Methods & Edge Cases', () => {
  let singboxService: SingBoxService

  beforeEach(() => {
    singboxService = SingBoxService.getInstance()
  })

  it('should return valid status when queried', async () => {
    const status = await singboxService.getStatus()
    expect(typeof status.isRunning).toBe('boolean')
    expect(typeof status.uptimeSeconds).toBe('number')
    expect(typeof status.currentZone).toBe('string')
  })

  it('should return binary info or null without throwing', () => {
    const binary = singboxService.getBinaryPath()
    if (binary) {
      expect(binary.exePath).toBeDefined()
    }
  })
})
