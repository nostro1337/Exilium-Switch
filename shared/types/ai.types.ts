export type AiSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical'

export type DefconLevel = 1 | 2 | 3 | 4 | 5

export type AiActionCommand = 'flush_dns' | 'restart_vpn' | 'rotate_sni' | 'none'

export interface AiExplanationCard {
  templateId: string
  pattern: string
  title: string
  severity: AiSeverity
  isDangerous: boolean
  humanExplanation: string
  technicalDetails?: string
  recommendedAction: string
  actionCommand?: AiActionCommand
  firstSeen: string
  lastSeen: string
  occurrences: number
}

export interface AiVerdict {
  defcon: DefconLevel
  status: 'optimal' | 'stable' | 'degraded' | 'censorship_detected' | 'critical'
  title: string
  summary: string
  lastUpdated: string
  details?: string[]
}

export interface CanaryServiceStatus {
  name: string
  url: string
  reachable: boolean
  latencyMs: number | null
}

export interface LiveTelemetry {
  pingMs: number | null
  jitterMs: number | null
  packetLossPct: number
  healthScore: number // 0-100
  rttHistory: number[] // last data points for sparkline
  canaryResults: Record<string, boolean>
  activeDpiAnomalies: string[]
  lastUpdated: string
}

export interface AiCacheStats {
  totalCards: number
  totalOccurrences: number
  mostFrequentPattern?: string
}

export interface AiTestResult {
  success: boolean
  model: string
  latencyMs: number
  message: string
}
