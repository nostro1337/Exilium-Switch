import type { AppMode } from './vpn.types'

export interface DomainControllerInfo {
  name: string
  ip: string
}

export interface AuditDiagnosisResult {
  hostname: string
  currentUser: string
  isAdministrator: boolean
  domainJoined: boolean
  domainName: string
  domainControllers: DomainControllerInfo[]
  dnsServers: string[]
  dnsSuffixes: string[]
  defaultGateway: string
  ipAddress: string
  vpsReachable: boolean
  vpsLatencyMs: number
  recommendedMode: AppMode
  recommendationReason: string
}
