import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'node:fs'
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

  it('should execute clearAllProfiles and wipe mode profiles successfully', () => {
    const validLink = 'vless://uuid-to-clear@89.124.94.246:443?type=tcp&security=reality&pbk=test#To-Clear'
    profileService.importVlessLink(validLink, 'office')

    const clearRes = profileService.clearAllProfiles('office')
    expect(clearRes.success).toBe(true)
    expect(clearRes.count).toBeGreaterThanOrEqual(1)

    const officeProfiles = profileService.getProfiles('office')
    expect(officeProfiles.length).toBe(0)
    expect(profileService.getActiveProfile('office')).toBeNull()
  })

  it('should cache profiles list in memory across repeated calls', () => {
    const list1 = profileService.getProfiles()
    const list2 = profileService.getProfiles()
    expect(list1).toEqual(list2)
  })

  it('should automatically migrate legacy profile on disk with torrent routing rules', () => {
    const legacyRaw = JSON.stringify({
      dns: {
        servers: [{ tag: 'dns-direct', type: 'udp', server: '77.88.8.8' }],
        rules: [{ domain_suffix: ['ru'], server: 'dns-direct' }]
      },
      inbounds: [
        {
          type: 'tun',
          tag: 'tun-in',
          address: ['172.19.0.1/30', 'fd00::1/126'],
          stack: 'mixed'
        }
      ],
      outbounds: [
        {
          type: 'vless',
          tag: 'proxy-out',
          server: '89.124.94.246',
          tls: {
            server_name: 'dl.google.com',
            reality: {
              short_id: '91c892320e'
            }
          }
        },
        { type: 'direct', tag: 'direct' }
      ],
      route: {
        rules: [
          { ip_is_private: true, outbound: 'direct' },
          { domain_suffix: ['ru'], outbound: 'direct' }
        ]
      }
    })

    const imported = profileService.importJsonContent(legacyRaw, 'legacy_test_profile', 'home')
    expect(imported.success).toBe(true)
    const profile = imported.profile!

    // Read back file from disk immediately after import and assert it was upgraded directly
    const diskContent = JSON.parse(fs.readFileSync(profile.path, 'utf-8'))
    expect(diskContent.dns.reverse_mapping).toBe(true)
    expect(diskContent.route.find_process).toBe(true)
    expect(diskContent.inbounds[0].address).toEqual(['172.19.0.1/30'])
    expect(diskContent.inbounds[0].stack).toBe('system')
    expect(diskContent.outbounds[0].tls.server_name).toBe('vdsina.ru')
    expect(diskContent.outbounds[0].tls.reality.short_id).toBe('d2206270cdf067')

    const rules = diskContent.route.rules as Record<string, unknown>[]
    const hasTorrentProc = rules.some(r => Array.isArray(r.process_name) && (r.process_name as string[]).includes('qbittorrent.exe'))
    expect(hasTorrentProc).toBe(true)

    // Cleanup
    profileService.deleteProfile(profile.id)
  })

  it('should immediately migrate legacy Reality parameters when importing VLESS link', () => {
    const legacyUrl = 'vless://2ae02656-034b-4868-acbe-9ead1de7ce6c@89.124.94.246:443?type=tcp&security=reality&pbk=rtkFblJnh5rBZmpjlFaD7ju8TQHt8gl1LtK6pqwcEAw&fp=chrome&sni=dl.google.com&sid=91c892320e&flow=xtls-rprx-vision#Legacy-Link'
    const imported = profileService.importVlessLink(legacyUrl, 'home')
    expect(imported.success).toBe(true)
    const profile = imported.profile!

    const diskContent = JSON.parse(fs.readFileSync(profile.path, 'utf-8'))
    expect(diskContent.outbounds[0].tls.server_name).toBe('vdsina.ru')
    expect(diskContent.outbounds[0].tls.reality.short_id).toBe('d2206270cdf067')
    expect(diskContent.outbounds[0].tls.reality.public_key).toBe('rtkFblJnh5rBZmpjlFaD7ju8TQHt8gl1LtK6pqwcEAw')
    expect(diskContent.inbounds[0].stack).toBe('system')
    expect(diskContent.inbounds[0].address).toEqual(['172.19.0.1/30'])

    profileService.deleteProfile(profile.id)
  })
})
