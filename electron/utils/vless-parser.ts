import type { AppMode } from '../../shared/types'

export const RUSSIAN_AND_CIS_DOMAINS = [
  // Top-Level Domains
  "ru", "xn--p1ai", "su", "kz", "by",
  // Work & Remote Tools
  "bitrix24.kz", "bitrix24.ru", "bitrix24.net", "bitrix24.com", "1c-bitrix.ru",
  "helpdeskeddy.com", "helpdeskeddy.ru",
  "rmansys.ru", "rmansys.com", "tektonit.ru", "tektonit.com",
  "anydesk.com",
  "1c.ru", "moysklad.ru", "kontur.ru", "diadoc.ru", "sbis.ru", "taxcom.ru",
  // Popular Russian Services & Marketplaces
  "2ip.ru", "2ip.io", "ozon.ru", "2gis.ru", "wildberries.ru", "wb.ru",
  "avito.ru", "kinopoisk.ru", "yandex.ru", "ya.ru", "yandex.net",
  "vk.com", "vk.ru", "mail.ru", "dzen.ru", "gosuslugi.ru",
  // Banks
  "sberbank.ru", "sber.ru", "tbank.ru", "tinkoff.ru", "alfabank.ru", "vtb.ru"
]

export const DISCORD_DOMAINS = [
  "discord.com", "discord.gg", "discordapp.com", "discordapp.net",
  "discord.media", "discordcdn.com", "discordstatus.com"
]

export function convertVlessToSingBoxConfig(vlessUrl: string, mode: AppMode = 'home'): { config: Record<string, unknown>; name: string } {
  let parsed: URL
  try {
    parsed = new URL(vlessUrl.trim())
  } catch {
    throw new Error('Некорректный формат ссылки')
  }

  if (parsed.protocol !== 'vless:') {
    throw new Error('Ссылка должна начинаться с vless://')
  }

  const uuid = parsed.username
  if (!uuid) {
    throw new Error('В ссылке отсутствует UUID пользователя')
  }

  const server = parsed.hostname
  if (!server) {
    throw new Error('В ссылке отсутствует адрес сервера')
  }

  const port = parsed.port ? parseInt(parsed.port, 10) : 443
  const rawName = parsed.hash ? decodeURIComponent(parsed.hash.replace(/^#/, '')) : `${server}:${port}`
  const baseName = rawName.trim() || `${server}:${port}`
  const isOffice = mode === 'office'
  const name = isOffice ? `${baseName}_OFFICE` : (mode === 'gaming' ? `${baseName}_GAME` : `${baseName}_HOME`)

  const params = parsed.searchParams
  const type = params.get('type') || 'tcp'
  const security = params.get('security') || 'reality'
  const flow = params.get('flow') || (security === 'reality' ? 'xtls-rprx-vision' : '')
  const pbk = params.get('pbk') || ''
  const sid = params.get('sid') || ''
  const rawSni = params.get('sni')
  const sni = rawSni || server
  const fp = params.get('fp') || 'chrome'
  const wsPath = params.get('path') || '/office-ws'

  if (security !== 'reality' && security !== 'tls' && security !== 'none') {
    throw new Error(`Тип безопасности "${security}" не поддерживается (требуется Reality или TLS)`)
  }

  const isIpAddress = /^(\d{1,3}\.){3}\d{1,3}$/.test(server)
  const routeDirectRule = isIpAddress
    ? { ip_cidr: [`${server}/32`], outbound: "direct" }
    : { domain: [server], outbound: "direct" }

  const dnsServers: Record<string, unknown>[] = []
  const dnsRules: Record<string, unknown>[] = []

  if (isOffice) {
    dnsServers.push(
      { tag: "dns-corp-primary", type: "udp", server: "192.168.12.223", server_port: 53, detour: "direct" },
      { tag: "dns-corp-backup", type: "udp", server: "192.168.12.222", server_port: 53, detour: "direct" }
    )
    dnsRules.push({
      domain_suffix: ["aviabasa.local", "local"],
      server: "dns-corp-primary"
    })
  }

  dnsServers.push(
    { tag: "dns-direct", type: "udp", server: "77.88.8.8", server_port: 53, detour: "direct" },
    { tag: "dns-direct-backup", type: "udp", server: "77.88.8.1", server_port: 53, detour: "direct" },
    { tag: "dns-remote", type: "udp", server: "8.8.8.8", server_port: 53, detour: "proxy-out" },
    { tag: "dns-remote-backup", type: "udp", server: "1.1.1.1", server_port: 53, detour: "proxy-out" }
  )

  dnsRules.push(
    { domain_suffix: RUSSIAN_AND_CIS_DOMAINS, server: "dns-direct" },
    { domain_suffix: DISCORD_DOMAINS, server: "dns-remote" }
  )

  const routeRules: Record<string, unknown>[] = [
    { action: "sniff" },
    { protocol: "dns", action: "hijack-dns" },
    { port: 53, action: "hijack-dns" },
    { ip_version: 6, action: "reject" },
    routeDirectRule
  ]

  if (isOffice) {
    routeRules.push(
      {
        ip_cidr: [
          "192.168.12.0/24",
          "192.168.12.200/32",
          "192.168.12.222/32",
          "192.168.12.223/32"
        ],
        outbound: "direct"
      },
      {
        domain_suffix: ["aviabasa.local", "local"],
        outbound: "direct"
      },
      {
        port: [7070],
        outbound: "direct"
      }
    )
  }

  routeRules.push(
    { ip_is_private: true, outbound: "direct" },
    { domain_suffix: RUSSIAN_AND_CIS_DOMAINS, outbound: "direct" },
    { domain_suffix: DISCORD_DOMAINS, outbound: "proxy-out" },
    {
      ip_cidr: ["149.154.160.0/20", "91.108.4.0/22", "91.108.8.0/22", "91.108.56.0/22"],
      outbound: "proxy-out"
    }
  )

  const proxyOutbound: Record<string, unknown> = {
    type: "vless",
    tag: "proxy-out",
    server: server,
    server_port: port,
    uuid: uuid,
    domain_strategy: "ipv4_only",
    domain_resolver: "dns-direct",
    tcp_fast_open: !isOffice
  }

  if (flow) {
    proxyOutbound.flow = flow
  }

  if (type === 'ws') {
    proxyOutbound.transport = {
      type: "ws",
      path: wsPath
    }
  }

  if (security === 'reality') {
    proxyOutbound.tls = {
      enabled: true,
      server_name: sni,
      utls: { enabled: true, fingerprint: fp },
      reality: { enabled: true, public_key: pbk, short_id: sid }
    }
  } else if (security === 'tls') {
    proxyOutbound.tls = {
      enabled: true,
      server_name: sni
    }
  }

  const config: Record<string, unknown> = {
    log: { level: "info", timestamp: true },
    dns: {
      servers: dnsServers,
      rules: dnsRules,
      final: isOffice ? "dns-direct" : "dns-remote",
      strategy: "ipv4_only",
      cache_capacity: 10000
    },
    inbounds: [
      {
        type: "tun",
        tag: "tun-in",
        interface_name: "singbox-tun0",
        address: isOffice ? ["172.19.0.1/30"] : ["172.19.0.1/30", "fd00::1/126"],
        mtu: 1400,
        auto_route: true,
        strict_route: !isOffice,
        endpoint_independent_nat: true,
        stack: "mixed"
      }
    ],
    outbounds: [
      proxyOutbound,
      { type: "direct", tag: "direct", domain_resolver: "dns-direct" }
    ],
    route: {
      auto_detect_interface: true,
      default_domain_resolver: "dns-direct",
      rules: routeRules,
      final: "proxy-out"
    }
  }

  return { config, name }
}
