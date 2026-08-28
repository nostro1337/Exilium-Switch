import { describe, it, expect, beforeEach } from 'vitest'
import { ProfileService } from '../../electron/services/profile.service'

describe('ProfileService Management', () => {
  let profileService: ProfileService

  beforeEach(() => {
    profileService = ProfileService.getInstance()
  })

  it('should reject invalid JSON content gracefully', () => {
    const res = profileService.importJsonContent('invalid { json', 'test_profile')
    expect(res.success).toBe(false)
    expect(res.error).toContain('не является валидным JSON')
  })

  it('should parse and import valid VLESS link into profile', () => {
    const validLink = 'vless://uuid-test-1234@89.124.94.246:443?type=tcp&security=reality&pbk=7bF_79R5O5jZ6y9mX3q1_test&fp=chrome&sni=dl.google.com#Test-Auto-Import'
    const res = profileService.importVlessLink(validLink, 'home')

    expect(res.success).toBe(true)
    expect(res.profile).toBeDefined()
    expect(res.profile?.name).toBe('Test-Auto-Import_HOME')
    expect(res.profile?.mode).toBe('home')
  })
})
