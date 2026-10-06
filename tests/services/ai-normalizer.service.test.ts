import { describe, it, expect } from 'vitest'
import { AiNormalizerService } from '../../electron/services/ai-normalizer.service'

describe('AiNormalizerService', () => {
  const normalizer = AiNormalizerService.getInstance()

  it('should mask IPv4 and ports correctly', () => {
    const raw = '[ERR] [2849102 14ms] outbound/vless[proxy]: dial tcp 185.220.101.5:443: i/o timeout'
    const result = normalizer.normalize(raw)

    expect(result.pattern).toContain('<IP>:<PORT>')
    expect(result.pattern).toContain('[SESSION]')
    expect(result.pattern).not.toContain('185.220.101.5')
    expect(result.pattern).not.toContain('443')
    expect(result.isErrorOrWarn).toBe(true)
    expect(result.templateId).toBeDefined()
    expect(result.templateId.length).toBe(8)
  })

  it('should mask IPv6 addresses', () => {
    const raw = 'dial udp [2001:0db8:85a3:0000:0000:8a2e:0370:7334]:53: connect: network is unreachable'
    const result = normalizer.normalize(raw)

    expect(result.pattern).toContain('<IPV6>:<PORT>')
    expect(result.isErrorOrWarn).toBe(false) // no explicit error keyword unless matched
  })

  it('should mask FQDN domains', () => {
    const raw = 'router: sniffed domain example.com for connection'
    const result = normalizer.normalize(raw)

    expect(result.pattern).toContain('<DOMAIN>')
    expect(result.pattern).not.toContain('example.com')
  })

  it('should generate identical templateId for different IPs with the same pattern', () => {
    const raw1 = 'outbound/vless: dial tcp 1.1.1.1:443: i/o timeout'
    const raw2 = 'outbound/vless: dial tcp 8.8.8.8:443: i/o timeout'

    const res1 = normalizer.normalize(raw1)
    const res2 = normalizer.normalize(raw2)

    expect(res1.pattern).toBe(res2.pattern)
    expect(res1.templateId).toBe(res2.templateId)
  })
})
