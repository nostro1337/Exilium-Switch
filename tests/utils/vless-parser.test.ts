import { describe, it, expect } from 'vitest'
import {
  convertVlessToSingBoxConfig,
  patchConfigWithTorrentRouting,
  migrateLegacyConfig,
  RUSSIAN_AND_CIS_DOMAINS,
  DISCORD_DOMAINS,
  STREAMING_AND_AI_DOMAINS,
  TORRENT_TRACKER_DOMAINS,
  TORRENT_PROCESSES
} from '../../electron/utils/vless-parser'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

describe('VLESS Parser & Config Generator Engine', () => {
  const sampleVlessReality = 'vless://b831381d-6324-4d53-ad4f-8cda48b30811@89.124.94.246:443?type=tcp&security=reality&pbk=7bF_79R5O5jZ6y9mX3q1_ABCDEF1234567890abcdef&fp=chrome&sni=dl.google.com&sid=a1b2c3d4&flow=xtls-rprx-vision#NL-Amsterdam-Fast'

  it('should parse valid VLESS Reality link correctly', () => {
    const { config, name } = convertVlessToSingBoxConfig(sampleVlessReality, 'home')

    expect(name).toBe('NL-Amsterdam-Fast_HOME')
    expect(config).toBeDefined()
    expect(config.log).toEqual({ level: 'info', timestamp: true })

    const outbounds = config.outbounds as Record<string, unknown>[]
    expect(outbounds).toHaveLength(2)

    const proxyOut = outbounds[0]
    expect(proxyOut.type).toBe('vless')
    expect(proxyOut.server).toBe('89.124.94.246')
    expect(proxyOut.server_port).toBe(443)
    expect(proxyOut.uuid).toBe('b831381d-6324-4d53-ad4f-8cda48b30811')
    expect(proxyOut.flow).toBe('xtls-rprx-vision')
    expect(proxyOut.tcp_fast_open).toBe(true)

    const tls = proxyOut.tls as Record<string, unknown>
    expect(tls.enabled).toBe(true)
    expect(tls.server_name).toBe('dl.google.com')

    const reality = tls.reality as Record<string, unknown>
    expect(reality.enabled).toBe(true)
    expect(reality.public_key).toBe('7bF_79R5O5jZ6y9mX3q1_ABCDEF1234567890abcdef')
    expect(reality.short_id).toBe('a1b2c3d4')
  })

  it('should generate Office Mode config with corporate DNS & split tunneling', () => {
    const { config, name } = convertVlessToSingBoxConfig(sampleVlessReality, 'office')

    expect(name).toBe('NL-Amsterdam-Fast_OFFICE')

    const dns = config.dns as Record<string, unknown>
    expect(dns.final).toBe('dns-direct')

    const dnsServers = dns.servers as Record<string, unknown>[]
    expect(dnsServers.some(s => s.tag === 'dns-corp-primary' && s.server === '192.168.12.223')).toBe(true)
    expect(dnsServers.some(s => s.tag === 'dns-corp-backup' && s.server === '192.168.12.222')).toBe(true)

    const route = config.route as Record<string, unknown>
    const rules = route.rules as Record<string, unknown>[]

    // Verify corporate subnet route rule
    const corpRule = rules.find(r => Array.isArray(r.domain_suffix) && r.domain_suffix.includes('aviabasa.local'))
    expect(corpRule).toBeDefined()
    expect(corpRule?.outbound).toBe('direct')
  })

  it('should generate Gaming Mode suffix in profile name', () => {
    const { name } = convertVlessToSingBoxConfig(sampleVlessReality, 'gaming')
    expect(name).toBe('NL-Amsterdam-Fast_GAME')
  })

  it('should support TLS security mode with WebSocket transport', () => {
    const wsTlsLink = 'vless://uuid-1234@myvpn.domain.com:2096?type=ws&security=tls&path=%2Foffice-ws&sni=myvpn.domain.com#Office-TLS-WS'
    const { config, name } = convertVlessToSingBoxConfig(wsTlsLink, 'office')

    expect(name).toBe('Office-TLS-WS_OFFICE')
    const outbounds = config.outbounds as Record<string, unknown>[]
    const proxyOut = outbounds[0]

    expect(proxyOut.type).toBe('vless')
    const transport = proxyOut.transport as Record<string, unknown>
    expect(transport.type).toBe('ws')
    expect(transport.path).toBe('/office-ws')

    const tls = proxyOut.tls as Record<string, unknown>
    expect(tls.enabled).toBe(true)
    expect(tls.server_name).toBe('myvpn.domain.com')
  })

  it('should reject malformed or non-vless URLs', () => {
    expect(() => convertVlessToSingBoxConfig('https://google.com')).toThrowError('Ссылка должна начинаться с vless://')
    expect(() => convertVlessToSingBoxConfig('vless://@server.com:443')).toThrowError('В ссылке отсутствует UUID')
    expect(() => convertVlessToSingBoxConfig('not-a-valid-url')).toThrowError('Некорректный формат ссылки')
  })

  it('should reject unsupported security types', () => {
    const invalidSecurity = 'vless://uuid-123@server.com:443?security=shadowsocks'
    expect(() => convertVlessToSingBoxConfig(invalidSecurity)).toThrowError('не поддерживается')
  })

  it('should generate tun inbound with strict_route enabled for zero leak', () => {
    const { config } = convertVlessToSingBoxConfig(sampleVlessReality, 'home')
    const inbounds = config.inbounds as Record<string, unknown>[]
    expect(inbounds).toBeDefined()
    expect(inbounds[0].strict_route).toBe(true)
    expect(inbounds[0].auto_route).toBe(true)
  })

  it('should contain comprehensive Russian/CIS domain list and Discord list', () => {
    expect(RUSSIAN_AND_CIS_DOMAINS).toContain('ru')
    expect(RUSSIAN_AND_CIS_DOMAINS).toContain('yandex.ru')
    expect(RUSSIAN_AND_CIS_DOMAINS).toContain('sberbank.ru')
    expect(RUSSIAN_AND_CIS_DOMAINS).toContain('gosuslugi.ru')
    expect(DISCORD_DOMAINS).toContain('discord.com')
    expect(DISCORD_DOMAINS).toContain('discord.gg')
    expect(STREAMING_AND_AI_DOMAINS).toContain('youtube.com')
    expect(STREAMING_AND_AI_DOMAINS).toContain('generativelanguage.googleapis.com')
    expect(STREAMING_AND_AI_DOMAINS).toContain('google.com')
    expect(STREAMING_AND_AI_DOMAINS).toContain('accounts.google.com')
    expect(STREAMING_AND_AI_DOMAINS).toContain('1e100.net')
  })

  it('should enable find_process in route block for process-based routing', () => {
    const { config } = convertVlessToSingBoxConfig(sampleVlessReality, 'home')
    const route = config.route as Record<string, unknown>
    expect(route).toBeDefined()
    expect(route.find_process).toBe(true)
  })

  it('should enable reverse_mapping in dns block to restore tracker domains from resolved IPs', () => {
    const { config } = convertVlessToSingBoxConfig(sampleVlessReality, 'home')
    const dns = config.dns as Record<string, unknown>
    expect(dns).toBeDefined()
    expect(dns.reverse_mapping).toBe(true)
  })

  it('should define comprehensive TORRENT_TRACKER_DOMAINS and TORRENT_PROCESSES', () => {
    // Trackers - Rutracker, NNM-Club, Rutor, Pornolab & popular mirrors
    expect(TORRENT_TRACKER_DOMAINS).toContain('rutracker.org')
    expect(TORRENT_TRACKER_DOMAINS).toContain('rutracker.nl')
    expect(TORRENT_TRACKER_DOMAINS).toContain('t-ru.org')
    expect(TORRENT_TRACKER_DOMAINS).toContain('nnmclub.to')
    expect(TORRENT_TRACKER_DOMAINS).toContain('nnmclub.ru')
    expect(TORRENT_TRACKER_DOMAINS).toContain('nnm-club.ru')
    expect(TORRENT_TRACKER_DOMAINS).toContain('rutor.info')
    expect(TORRENT_TRACKER_DOMAINS).toContain('rutor.is')
    expect(TORRENT_TRACKER_DOMAINS).toContain('pornolab.net')
    expect(TORRENT_TRACKER_DOMAINS).toContain('pornolab.cc')
    expect(TORRENT_TRACKER_DOMAINS).toContain('opentrackr.org')
    expect(TORRENT_TRACKER_DOMAINS).toContain('openbittorrent.com')
    expect(TORRENT_TRACKER_DOMAINS).toContain('demonii.com')
    expect(TORRENT_TRACKER_DOMAINS).toContain('desync.com')

    // Processes - qBittorrent, uTorrent, BitTorrent, Transmission 4, Deluge, FDM, Motrix
    expect(TORRENT_PROCESSES).toContain('qbittorrent.exe')
    expect(TORRENT_PROCESSES).toContain('qBittorrent.exe')
    expect(TORRENT_PROCESSES).toContain('utorrent.exe')
    expect(TORRENT_PROCESSES).toContain('uTorrent.exe')
    expect(TORRENT_PROCESSES).toContain('bittorrent.exe')
    expect(TORRENT_PROCESSES).toContain('BitTorrent.exe')
    expect(TORRENT_PROCESSES).toContain('transmission.exe')
    expect(TORRENT_PROCESSES).toContain('Transmission.exe')
    expect(TORRENT_PROCESSES).toContain('transmission-qt.exe')
    expect(TORRENT_PROCESSES).toContain('deluge.exe')
    expect(TORRENT_PROCESSES).toContain('FreeDownloadManager.exe')
    expect(TORRENT_PROCESSES).toContain('motrix.exe')
    expect(TORRENT_PROCESSES).toContain('aria2c.exe')
  })

  it('should configure DNS rules to resolve torrent trackers via dns-remote', () => {
    const { config } = convertVlessToSingBoxConfig(sampleVlessReality, 'home')
    const dns = config.dns as Record<string, unknown>
    const rules = dns.rules as Record<string, unknown>[]

    const trackerDnsRule = rules.find(r => r.domain_suffix === TORRENT_TRACKER_DOMAINS)
    expect(trackerDnsRule).toBeDefined()
    expect(trackerDnsRule?.server).toBe('dns-remote')
  })

  it('should route multicast 224.0.0.0/4 to direct for UPnP/NAT-PMP and LSD', () => {
    const { config } = convertVlessToSingBoxConfig(sampleVlessReality, 'home')
    const route = config.route as Record<string, unknown>
    const rules = route.rules as Record<string, unknown>[]

    const multicastRule = rules.find(r => Array.isArray(r.ip_cidr) && (r.ip_cidr as string[]).includes('224.0.0.0/4'))
    expect(multicastRule).toBeDefined()
    expect(multicastRule?.outbound).toBe('direct')
  })

  it('should route torrent trackers to proxy-out and torrent clients to direct, strictly in that order', () => {
    const { config } = convertVlessToSingBoxConfig(sampleVlessReality, 'home')
    const route = config.route as Record<string, unknown>
    const rules = route.rules as Record<string, unknown>[]

    const trackerRuleIndex = rules.findIndex(r => r.domain_suffix === TORRENT_TRACKER_DOMAINS && r.outbound === 'proxy-out')
    const torrentProcRuleIndex = rules.findIndex(r => r.process_name === TORRENT_PROCESSES && r.outbound === 'direct')

    expect(trackerRuleIndex).toBeGreaterThan(-1)
    expect(torrentProcRuleIndex).toBeGreaterThan(-1)

    // Critical invariant: Trackers rule MUST precede Torrent processes rule
    // so announcer requests go via proxy while peer transfers stay direct
    expect(trackerRuleIndex).toBeLessThan(torrentProcRuleIndex)
  })

  it('should patch legacy configurations with patchConfigWithTorrentRouting and be idempotent', () => {
    const legacyConfig: Record<string, unknown> = {
      dns: {
        servers: [{ tag: 'dns-direct', type: 'udp', server: '77.88.8.8' }],
        rules: [{ domain_suffix: ['ru'], server: 'dns-direct' }]
      },
      inbounds: [{ type: 'tun', tag: 'tun-in' }],
      outbounds: [
        { type: 'vless', tag: 'proxy-out' },
        { type: 'direct', tag: 'direct' }
      ],
      route: {
        rules: [
          { ip_is_private: true, outbound: 'direct' },
          { domain_suffix: ['ru'], outbound: 'direct' }
        ]
      }
    }

    // First patch: should modify config
    const changed1 = patchConfigWithTorrentRouting(legacyConfig)
    expect(changed1).toBe(true)

    const dns = legacyConfig.dns as Record<string, unknown>
    expect(dns.reverse_mapping).toBe(true)

    const route = legacyConfig.route as Record<string, unknown>
    expect(route.find_process).toBe(true)

    const rules = route.rules as Record<string, unknown>[]
    const trackerIdx = rules.findIndex(r => r.domain_suffix === TORRENT_TRACKER_DOMAINS && r.outbound === 'proxy-out')
    const procIdx = rules.findIndex(r => r.process_name === TORRENT_PROCESSES && r.outbound === 'direct')
    const multiIdx = rules.findIndex(r => Array.isArray(r.ip_cidr) && (r.ip_cidr as string[]).includes('224.0.0.0/4'))

    expect(multiIdx).toBeGreaterThan(-1)
    expect(trackerIdx).toBeGreaterThan(-1)
    expect(procIdx).toBeGreaterThan(-1)
    expect(trackerIdx).toBeLessThan(procIdx)

    // Second patch: should be idempotent and return false
    const changed2 = patchConfigWithTorrentRouting(legacyConfig)
    expect(changed2).toBe(false)
  })

  it('should reorder inverted rules and update partial domain/process lists in patchConfigWithTorrentRouting', () => {
    const invertedConfig: Record<string, unknown> = {
      dns: {
        reverse_mapping: false,
        servers: [{ tag: 'dns-direct', type: 'udp', server: '77.88.8.8' }],
        rules: [
          { domain_suffix: ['rutracker.org'], server: 'dns-remote' }
        ]
      },
      inbounds: [{ type: 'tun', tag: 'tun-in' }],
      outbounds: [
        { type: 'vless', tag: 'proxy-out' },
        { type: 'direct', tag: 'direct' }
      ],
      route: {
        find_process: false,
        rules: [
          { ip_cidr: ['224.0.0.0/4'], outbound: 'direct' },
          { process_name: ['qbittorrent.exe'], outbound: 'direct' },
          { domain_suffix: ['rutracker.org'], outbound: 'proxy-out' }
        ]
      }
    }

    const changed = patchConfigWithTorrentRouting(invertedConfig)
    expect(changed).toBe(true)

    const route = invertedConfig.route as Record<string, unknown>
    const rules = route.rules as Record<string, unknown>[]
    const trackerIdx = rules.findIndex(r => r.domain_suffix === TORRENT_TRACKER_DOMAINS && r.outbound === 'proxy-out')
    const procIdx = rules.findIndex(r => r.process_name === TORRENT_PROCESSES && r.outbound === 'direct')

    expect(trackerIdx).toBeGreaterThan(-1)
    expect(procIdx).toBeGreaterThan(-1)
    expect(trackerIdx).toBeLessThan(procIdx)
  })

  it('should migrate legacy config: remove IPv6, set system stack, update reality params and maintain DNS/route rules', () => {
    const legacyRealityConfig: Record<string, unknown> = {
      dns: {
        servers: [
          { tag: 'dns-direct', type: 'udp', server: '77.88.8.8' },
          { tag: 'dns-remote', type: 'udp', server: '8.8.8.8', detour: 'proxy-out' }
        ],
        rules: [
          { domain_suffix: ['ru'], server: 'dns-direct' },
          { domain_suffix: ['discord.com', 'discord.gg'], server: 'dns-remote' }
        ]
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
          server_port: 443,
          tls: {
            enabled: true,
            server_name: 'dl.google.com',
            reality: {
              enabled: true,
              public_key: 'rtkFblJnh5rBZmpjlFaD7ju8TQHt8gl1LtK6pqwcEAw',
              short_id: '91c892320e'
            }
          }
        },
        { type: 'direct', tag: 'direct' }
      ],
      route: {
        rules: [
          { ip_is_private: true, outbound: 'direct' },
          { domain_suffix: ['ru'], outbound: 'direct' },
          { domain_suffix: ['discord.com', 'discord.gg'], outbound: 'proxy-out' }
        ]
      }
    }

    const changed1 = migrateLegacyConfig(legacyRealityConfig)
    expect(changed1).toBe(true)

    // 1. Tun inbound assertions
    const inbounds = legacyRealityConfig.inbounds as Record<string, unknown>[]
    const tun = inbounds[0]
    expect(tun.address).toEqual(['172.19.0.1/30'])
    expect(tun.stack).toBe('system')

    // 2. Reality outbound assertions
    const outbounds = legacyRealityConfig.outbounds as Record<string, unknown>[]
    const realityOut = outbounds[0]
    const tls = realityOut.tls as Record<string, unknown>
    const reality = tls.reality as Record<string, unknown>
    expect(tls.server_name).toBe('vdsina.ru')
    expect(reality.short_id).toBe('d2206270cdf067')
    expect(reality.public_key).toBe('rtkFblJnh5rBZmpjlFaD7ju8TQHt8gl1LtK6pqwcEAw')

    // 3. DNS assertions
    const dns = legacyRealityConfig.dns as Record<string, unknown>
    expect(dns.reverse_mapping).toBe(true)
    const dnsRules = dns.rules as Record<string, unknown>[]
    const hasStreamingDns = dnsRules.some(r => r.domain_suffix === STREAMING_AND_AI_DOMAINS && r.server === 'dns-remote')
    const hasTorrentDns = dnsRules.some(r => r.domain_suffix === TORRENT_TRACKER_DOMAINS && r.server === 'dns-remote')
    expect(hasStreamingDns).toBe(true)
    expect(hasTorrentDns).toBe(true)

    // 4. Route assertions
    const route = legacyRealityConfig.route as Record<string, unknown>
    expect(route.find_process).toBe(true)
    const routeRules = route.rules as Record<string, unknown>[]
    const hasStreamingRoute = routeRules.some(r => r.domain_suffix === STREAMING_AND_AI_DOMAINS && r.outbound === 'proxy-out')
    const hasDiscordUdp = routeRules.some(r => r.network === 'udp' && Array.isArray(r.port_range) && (r.port_range as string[]).includes('19294:19344'))
    expect(hasStreamingRoute).toBe(true)
    expect(hasDiscordUdp).toBe(true)

    // 5. Idempotency assertion
    const changed2 = migrateLegacyConfig(legacyRealityConfig)
    expect(changed2).toBe(false)
  })

  it('should align outdated or corrupted Reality public_key for 89.124.94.246', () => {
    const corruptedKeyConfig: Record<string, unknown> = {
      outbounds: [
        {
          type: 'vless',
          server: '89.124.94.246',
          tls: {
            reality: {
              public_key: 'corrupted-old-key',
              short_id: 'd2206270cdf067'
            }
          }
        }
      ]
    }
    const changed = migrateLegacyConfig(corruptedKeyConfig)
    expect(changed).toBe(true)
    const reality = (corruptedKeyConfig.outbounds as any[])[0].tls.reality
    expect(reality.public_key).toBe('rtkFblJnh5rBZmpjlFaD7ju8TQHt8gl1LtK6pqwcEAw')
  })

  it('should detect when domain list has same length but different domains and update it', () => {
    const dummyDomains = ['youtube.com', ...new Array(STREAMING_AND_AI_DOMAINS.length - 1).fill('custom-stream.com')]
    const configWithSameLength: Record<string, unknown> = {
      dns: {
        servers: [{ tag: 'dns-remote', detour: 'proxy-out' }],
        rules: [
          { domain_suffix: dummyDomains, server: 'dns-remote' }
        ]
      }
    }
    const changed = migrateLegacyConfig(configWithSameLength)
    expect(changed).toBe(true)
    const streamingRule = (configWithSameLength.dns as any).rules.find((r: any) =>
      Array.isArray(r.domain_suffix) && r.domain_suffix.includes('google.com')
    )
    expect(streamingRule).toBeDefined()
    expect(streamingRule.domain_suffix).toEqual(STREAMING_AND_AI_DOMAINS)
  })

  it('should handle edge cases in migrateLegacyConfig gracefully', () => {
    // null or invalid input
    expect(migrateLegacyConfig(null as any)).toBe(false)
    expect(migrateLegacyConfig({} as any)).toBe(false)

    // tun inbound with only IPv6 address should fallback to default IPv4
    const configWithOnlyIpv6: Record<string, unknown> = {
      inbounds: [{ type: 'tun', address: ['fd00::1/126'] }]
    }
    const changed = migrateLegacyConfig(configWithOnlyIpv6)
    expect(changed).toBe(true)
    const tun = (configWithOnlyIpv6.inbounds as any[])[0]
    expect(tun.address).toEqual(['172.19.0.1/30'])
    expect(tun.stack).toBe('system')
  })

  it('should migrate and validate full legacy home profile fixture with sing-box binary', () => {
    const fullLegacyProfile = {
      log: { level: 'info', timestamp: true },
      dns: {
        servers: [
          { tag: 'dns-direct', type: 'udp', server: '77.88.8.8', server_port: 53, detour: 'direct' },
          { tag: 'dns-remote', type: 'udp', server: '8.8.8.8', server_port: 53, detour: 'proxy-out' }
        ],
        rules: [
          { domain_suffix: ['ru'], server: 'dns-direct' }
        ],
        final: 'dns-remote',
        strategy: 'ipv4_only'
      },
      inbounds: [
        {
          type: 'tun',
          tag: 'tun-in',
          interface_name: 'singbox-tun0',
          address: ['172.19.0.1/30', 'fd00::1/126'],
          stack: 'mixed',
          auto_route: true,
          strict_route: true
        }
      ],
      outbounds: [
        {
          type: 'vless',
          tag: 'proxy-out',
          server: '89.124.94.246',
          server_port: 443,
          uuid: '2ae02656-034b-4868-acbe-9ead1de7ce6c',
          tls: {
            enabled: true,
            server_name: 'dl.google.com',
            reality: {
              enabled: true,
              public_key: 'rtkFblJnh5rBZmpjlFaD7ju8TQHt8gl1LtK6pqwcEAw',
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
        ],
        final: 'proxy-out'
      }
    }

    const changed = migrateLegacyConfig(fullLegacyProfile)
    expect(changed).toBe(true)

    expect(fullLegacyProfile.inbounds[0].address).toEqual(['172.19.0.1/30'])
    expect(fullLegacyProfile.inbounds[0].stack).toBe('system')
    expect(fullLegacyProfile.outbounds[0].tls.server_name).toBe('vdsina.ru')
    expect(fullLegacyProfile.outbounds[0].tls.reality.short_id).toBe('d2206270cdf067')
    expect(fullLegacyProfile.dns.reverse_mapping).toBe(true)

    const exePath = path.resolve(process.cwd(), 'sing-box/sing-box.exe')
    if (fs.existsSync(exePath)) {
      const tmpPath = path.join(os.tmpdir(), `legacy-migrated-${Date.now()}.json`)
      try {
        fs.writeFileSync(tmpPath, JSON.stringify(fullLegacyProfile, null, 2), 'utf-8')
        expect(() => {
          execFileSync(exePath, ['check', '-c', tmpPath], { stdio: 'pipe' })
        }).not.toThrow()
      } finally {
        if (fs.existsSync(tmpPath)) {
          fs.unlinkSync(tmpPath)
        }
      }
    }
  })

  it('should verify live user profiles in APPDATA are already fully migrated and idempotent', () => {
    const appData = process.env.APPDATA || (process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'AppData', 'Roaming') : '')
    if (!appData) return
    const homeProfilePath = path.join(appData, 'ExiliumSwitch', 'profiles', 'nl-reality-nostro-pc_home-mtd81aa9.json')
    if (fs.existsSync(homeProfilePath)) {
      const content = JSON.parse(fs.readFileSync(homeProfilePath, 'utf-8'))
      expect(migrateLegacyConfig(content)).toBe(false)
      expect(content.inbounds[0].stack).toBe('system')
      expect(content.inbounds[0].address).toEqual(['172.19.0.1/30'])
      expect(content.outbounds[0].tls.server_name).toBe('vdsina.ru')
      expect(content.outbounds[0].tls.reality.short_id).toBe('d2206270cdf067')
    }
  })

  it('should validate generated config using real sing-box binary if present', () => {
    const { config } = convertVlessToSingBoxConfig(sampleVlessReality, 'home')
    const exePath = path.resolve(process.cwd(), 'sing-box/sing-box.exe')

    if (fs.existsSync(exePath)) {
      const tmpPath = path.join(os.tmpdir(), `singbox-validate-${Date.now()}.json`)
      try {
        fs.writeFileSync(tmpPath, JSON.stringify(config, null, 2), 'utf-8')
        expect(() => {
          execFileSync(exePath, ['check', '-c', tmpPath], { stdio: 'pipe' })
        }).not.toThrow()
      } finally {
        if (fs.existsSync(tmpPath)) {
          fs.unlinkSync(tmpPath)
        }
      }
    }
  })
})

