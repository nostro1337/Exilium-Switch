import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../../electron/utils/exec', () => ({
  execFileAsync: vi.fn(async () => ({ stdout: '', stderr: '' })),
  execFileSyncSafe: vi.fn(() => ''),
  setRegistryDword: vi.fn(async () => true)
}))

import { FailsafeService } from '../../electron/services/failsafe.service'

describe('FailsafeService Network Sanitizer', () => {
  let failsafeService: FailsafeService

  beforeEach(() => {
    failsafeService = FailsafeService.getInstance()
  })

  it('should execute startup sanitation without uncaught exceptions', async () => {
    await expect(failsafeService.runStartupSanitation()).resolves.not.toThrow()
  })
})
