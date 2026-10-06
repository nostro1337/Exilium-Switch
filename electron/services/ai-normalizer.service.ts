import crypto from 'node:crypto'

export interface NormalizedLogResult {
  templateId: string
  pattern: string
  isErrorOrWarn: boolean
  originalText: string
}

export class AiNormalizerService {
  private static instance: AiNormalizerService | null = null

  public static getInstance(): AiNormalizerService {
    if (!AiNormalizerService.instance) {
      AiNormalizerService.instance = new AiNormalizerService()
    }
    return AiNormalizerService.instance
  }

  /**
   * Normalizes dynamic tokens (IPs, ports, session IDs, timestamps, SNIs) in a log line
   * to produce a deterministic fingerprint pattern and unique templateId hash.
   */
  public normalize(logLine: string): NormalizedLogResult {
    const originalText = logLine || ''
    const lower = originalText.toLowerCase()
    const isErrorOrWarn =
      lower.includes('warn') ||
      lower.includes('error') ||
      lower.includes('fatal') ||
      lower.includes('fail') ||
      lower.includes('[err]') ||
      lower.includes('[wrn]')

    let pattern = originalText
      // 1. Remove ISO / Bracket timestamps at start e.g. [12:34:56] or 2026-08-29T...
      .replace(/^\[?\d{1,4}[-/:]\d{1,2}[-/:]\d{1,4}[T ]\d{1,2}:\d{1,2}:\d{1,2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?\]?\s*/, '')
      // 2. Remove sing-box session counters e.g. [2849102 14ms] or [12345 0ms]
      .replace(/\[\d+\s+\d+ms\]/g, '[SESSION]')
      // 3. Mask IPv4 addresses
      .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '<IP>')
      // 4. Mask IPv6 addresses (including bracketed forms like [<IPV6>])
      .replace(/\[?(?:[a-fA-F0-9]{1,4}:){3,7}[a-fA-F0-9]{1,4}\]?/g, '<IPV6>')
      // 5. Mask TCP/UDP ports after IP/hostname or standalone
      .replace(/:(\d{2,5})\b/g, ':<PORT>')
      // 6. Mask standard FQDN domains
      .replace(/(?<=\s)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?=\s|:|\/|$)/g, '<DOMAIN>')
      // 7. Collapse duplicate whitespace
      .replace(/\s+/g, ' ')
      .trim()

    // Deterministic 8-char SHA-256 hash for the template ID
    const hash = crypto.createHash('sha256').update(pattern).digest('hex').substring(0, 8)

    return {
      templateId: hash,
      pattern,
      isErrorOrWarn,
      originalText
    }
  }
}
