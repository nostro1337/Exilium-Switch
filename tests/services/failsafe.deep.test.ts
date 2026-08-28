import { describe, it, expect, beforeEach, vi } from 'vitest'

import { FailsafeService } from '../../electron/services/failsafe.service'
import { SingBoxService } from '../../electron/services/singbox.service'
import { ResidentShieldService } from '../../electron/services/resident-shield.service'

describe('FailsafeService Deep Sanitation Logic', () => {
  let failsafeService: FailsafeService

  beforeEach(() => {
    vi.restoreAllMocks()
    failsafeService = FailsafeService.getInstance()
  })

  it('should execute full network restore branch when singbox is inactive', async () => {
    vi.spyOn(SingBoxService.getInstance(), 'isRunning').mockResolvedValue(false)
    const restoreSpy = vi.spyOn(ResidentShieldService.getInstance(), 'restoreRegularNetwork').mockResolvedValue()

    await failsafeService.runStartupSanitation()
    expect(restoreSpy).toHaveBeenCalled()
  })

  it('should bypass network restore when singbox is already running', async () => {
    vi.spyOn(SingBoxService.getInstance(), 'isRunning').mockResolvedValue(true)
    const restoreSpy = vi.spyOn(ResidentShieldService.getInstance(), 'restoreRegularNetwork').mockResolvedValue()

    await failsafeService.runStartupSanitation()
    expect(restoreSpy).not.toHaveBeenCalled()
  })
})
