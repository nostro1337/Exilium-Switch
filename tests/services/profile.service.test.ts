import { describe, it, expect, beforeEach } from 'vitest'
import { ProfileService } from '../../electron/services/profile.service'

describe('ProfileService Comprehensive Management', () => {
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

    if (res.profile?.id) {
      profileService.deleteProfile(res.profile.id)
    }
  })

  it('should list profiles filtered by mode and retrieve active profile', () => {
    const profiles = profileService.getProfiles('home')
    expect(Array.isArray(profiles)).toBe(true)

    const active = profileService.getActiveProfile('home')
    if (profiles.length > 0) {
      expect(active).toBeDefined()
    }
  })

  it('should handle selecting and deleting profile IDs', () => {
    const validLink = 'vless://uuid-to-delete@89.124.94.246:443?type=tcp&security=reality&pbk=test#To-Delete'
    const imported = profileService.importVlessLink(validLink, 'home')
    expect(imported.success).toBe(true)

    const profileId = imported.profile!.id

    const selectRes = profileService.selectProfile(profileId)
    expect(selectRes.success).toBe(true)

    const deleteRes = profileService.deleteProfile(profileId)
    expect(deleteRes.success).toBe(true)
  })

  it('should execute cleanTestSpamProfiles without throwing', () => {
    expect(() => profileService.cleanTestSpamProfiles()).not.toThrow()
  })
})
