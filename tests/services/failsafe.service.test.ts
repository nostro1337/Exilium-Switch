import { describe, it, expect, beforeEach } from 'vitest'
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
