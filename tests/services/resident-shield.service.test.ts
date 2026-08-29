import { describe, it, expect, beforeEach } from 'vitest'
import { ResidentShieldService } from '../../electron/services/resident-shield.service'

describe('ResidentShieldService Full Lifecycle', () => {
  let residentService: ResidentShieldService

  beforeEach(() => {
    residentService = ResidentShieldService.getInstance()
  })

  it('should query system timezone without crashing', async () => {
    const tz = await residentService.getSystemTimezone()
    expect(typeof tz).toBe('string')
    expect(tz.length).toBeGreaterThan(0)
  })

  it('should query lfsvc status without crashing', async () => {
    const status = await residentService.getLfsvcStatus()
    expect(['Running', 'Stopped', 'Stopping', 'Starting', 'Unknown']).toContain(status)
  })

  it('should execute stopLfsvc and startLfsvc safely', async () => {
    const stopRes = await residentService.stopLfsvc()
    expect(typeof stopRes).toBe('boolean')

    const startRes = await residentService.startLfsvc()
    expect(typeof startRes).toBe('boolean')
  }, 25000)

  it('should execute applyAntiLeakLockdown and restoreRegularNetwork safely', async () => {
    await expect(residentService.applyAntiLeakLockdown()).resolves.not.toThrow()
    await expect(residentService.restoreRegularNetwork()).resolves.not.toThrow()
  }, 20000)

  it('should execute syncEmergencyCleanup safely without crashing', () => {
    expect(() => residentService.syncEmergencyCleanup('Tomsk Standard Time')).not.toThrow()
  })

  it('should orchestrate enableResidentMode and disableResidentMode without uncaught errors', async () => {
    await expect(residentService.enableResidentMode('W. Europe Standard Time')).resolves.not.toThrow()
    await expect(residentService.disableResidentMode('Russian Standard Time')).resolves.not.toThrow()
  }, 20000)
})
