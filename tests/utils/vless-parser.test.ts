import { describe, it, expect } from 'vitest'
import {
  convertVlessToSingBoxConfig,
  RUSSIAN_AND_CIS_DOMAINS,
  DISCORD_DOMAINS
} from '../../electron/utils/vless-parser'

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

  it('should contain comprehensive Russian/CIS domain list and Discord list', () => {
    expect(RUSSIAN_AND_CIS_DOMAINS).toContain('ru')
    expect(RUSSIAN_AND_CIS_DOMAINS).toContain('yandex.ru')
    expect(RUSSIAN_AND_CIS_DOMAINS).toContain('sberbank.ru')
    expect(RUSSIAN_AND_CIS_DOMAINS).toContain('gosuslugi.ru')
    expect(DISCORD_DOMAINS).toContain('discord.com')
    expect(DISCORD_DOMAINS).toContain('discord.gg')
  })
})
