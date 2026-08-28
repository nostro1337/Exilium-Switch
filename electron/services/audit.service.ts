import os from 'node:os'
import net from 'node:net'
import { runPowerShell } from '../utils/exec'
import { LogService } from './log.service'
import { DEFAULT_PING_TARGET } from '../core/constants'
import type { AuditDiagnosisResult } from '../../shared/types'

export class AuditService {
  private static instance: AuditService

  private constructor() {}

  public static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService()
    }
    return AuditService.instance
  }

  public async performAudit(): Promise<AuditDiagnosisResult> {
    const logService = LogService.getInstance()
    const result: AuditDiagnosisResult = {
      hostname: os.hostname(),
      currentUser: process.env.USERNAME ? `${process.env.USERDOMAIN || ''}\\${process.env.USERNAME}` : 'User',
      isAdministrator: false,
      domainJoined: false,
      domainName: 'WORKGROUP',
      domainControllers: [],
      dnsServers: [],
      dnsSuffixes: [],
      defaultGateway: '',
      ipAddress: '',
      vpsReachable: false,
      vpsLatencyMs: -1,
      recommendedMode: 'home',
      recommendationReason: ''
    }

    // 1. Test VPS Reachability & Latency
    try {
      const startTime = Date.now()
      await new Promise<void>((resolve, reject) => {
        const socket = net.createConnection({ host: DEFAULT_PING_TARGET, port: 443, timeout: 2500 }, () => {
          result.vpsReachable = true
          result.vpsLatencyMs = Date.now() - startTime
          socket.end()
          resolve()
        })
        socket.on('timeout', () => { socket.destroy(); reject(new Error('timeout')) })
        socket.on('error', (err) => { reject(err) })
      })
    } catch {}

    // 2. Query PowerShell for network and domain
    try {
      const psScript = `
        $cs = Get-CimInstance Win32_ComputerSystem -ErrorAction SilentlyContinue;
        $principal = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent();
        $isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator);
        $routes = Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue;
        $dns = Get-DnsClientServerAddress -AddressFamily 2 -ErrorAction SilentlyContinue;
        $ip = Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias 'Ethernet*' -ErrorAction SilentlyContinue;
        if (-not $ip) { $ip = Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias 'Wi-Fi*' -ErrorAction SilentlyContinue }
        $suffixes = (Get-DnsClientGlobalSetting -ErrorAction SilentlyContinue).SuffixSearchList;

        $dcList = @();
        if ($cs.PartOfDomain) {
          try {
            $dom = [System.DirectoryServices.ActiveDirectory.Domain]::GetCurrentDomain();
            foreach ($dc in $dom.DomainControllers) {
              $dcIp = '';
              try { $dcIp = ([System.Net.Dns]::GetHostAddresses($dc.Name) | Where-Object { $_.AddressFamily -eq 'InterNetwork' } | Select-Object -First 1).IPAddressToString } catch {}
              $dcList += @{ Name = $dc.Name; IP = $dcIp };
            }
          } catch {}
        }

        [PSCustomObject]@{
          Hostname = $env:COMPUTERNAME;
          CurrentUser = "$env:USERDOMAIN\\$env:USERNAME";
          IsAdmin = [bool]$isAdmin;
          DomainJoined = [bool]$cs.PartOfDomain;
          DomainName = if ($cs.PartOfDomain) { $cs.Domain } else { $cs.Workgroup };
          DomainControllers = $dcList;
          DefaultGateway = if ($routes) { ($routes | Select-Object -First 1).NextHop } else { '' };
          IpAddress = if ($ip) { ($ip | Select-Object -First 1).IPAddress } else { '' };
          DnsServers = @($dns.ServerAddresses | Where-Object { $_ -and $_ -ne '127.0.0.1' } | Select-Object -Unique);
          DnsSuffixes = @($suffixes | Where-Object { $_ });
        } | ConvertTo-Json -Compress
      `
      const stdout = await runPowerShell(psScript)
      if (stdout) {
        const parsed = JSON.parse(stdout)
        result.hostname = parsed.Hostname || result.hostname
        result.currentUser = parsed.CurrentUser || result.currentUser
        result.isAdministrator = Boolean(parsed.IsAdmin)
        result.domainJoined = Boolean(parsed.DomainJoined)
        result.domainName = parsed.DomainName || result.domainName
        result.defaultGateway = parsed.DefaultGateway || ''
        result.ipAddress = parsed.IpAddress || ''
        result.dnsServers = Array.isArray(parsed.DnsServers) ? parsed.DnsServers : (parsed.DnsServers ? [parsed.DnsServers] : [])
        result.dnsSuffixes = Array.isArray(parsed.DnsSuffixes) ? parsed.DnsSuffixes : (parsed.DnsSuffixes ? [parsed.DnsSuffixes] : [])
        result.domainControllers = Array.isArray(parsed.DomainControllers)
          ? parsed.DomainControllers.map((d: { Name?: string; IP?: string }) => ({ name: d.Name || '', ip: d.IP || '' }))
          : []
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      logService.addLog(`Диагностика системы (предупреждение): ${msg}`, 'warn')
    }

    // 3. Verdict
    if (result.domainJoined || result.domainControllers.length > 0 || (result.dnsSuffixes.length > 0 && !result.dnsSuffixes.includes('localdomain'))) {
      result.recommendedMode = 'office'
      result.recommendationReason = `Обнаружен корпоративный домен (${result.domainName}). Включен режим «Офис», чтобы защитить Active Directory и связь с серверами компании.`
    } else {
      result.recommendedMode = 'home'
      result.recommendationReason = 'Корпоративный домен не обнаружен. Рекомендуется режим «Дом» для максимальной анонимности Resident Shield.'
    }

    return result
  }
}
