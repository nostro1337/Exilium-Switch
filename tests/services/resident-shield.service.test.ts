import { describe, it, expect, beforeEach } from 'vitest'
import { ResidentShieldService } from '../../electron/services/resident-shield.service'

describe('ResidentShieldService', () => {
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
})
