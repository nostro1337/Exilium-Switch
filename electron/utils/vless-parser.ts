import type { AppMode } from '../../shared/types'

export const DEFAULT_REALITY_SNI = 'github.com'
export const DEFAULT_UTLS_FINGERPRINT = 'firefox'

export const TELEGRAM_IP_CIDRS = [
  "149.154.160.0/20",
  "91.108.4.0/22",
  "91.108.8.0/22",
  "91.108.12.0/22",
  "91.108.16.0/22",
  "91.108.20.0/22",
  "91.108.56.0/22",
  "91.105.192.0/23",
  "185.76.151.0/24"
]

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
  "discord.media", "discordcdn.com", "discordstatus.com", "discord.co",
  "discord.dev", "discordapp.io", "discord.gift"
]

export const STREAMING_AND_AI_DOMAINS = [
  // Google Core, Identity, Auth & CDN (Crucial for IDE / OAuth / Gemini login)
  "google.com", "google.co", "google.net", "google.org", "google.dev", "google.io",
  "accounts.google.com", "myaccount.google.com", "oauth2.googleapis.com",
  // Google APIs, Cloud & IDE Backends
  "googleapis.com", "gstatic.com", "googleusercontent.com", "googlevideo.com", "1e100.net",
  "cloud.google.com", "cloudresourcemanager.googleapis.com",
  "cloudaicompanion.googleapis.com", "generativelanguage.googleapis.com",
  "aiplatform.googleapis.com", "developerconnect.googleapis.com",
  "firebase.googleapis.com", "firebaseio.com",
  // Gemini, MakerSuite, AI Studio & Developer Tools
  "gemini.google.com", "ai.google.dev", "aistudio.google.com",
  "alkalimakersuite-pa.clients6.google.com",
  // YouTube
  "youtube.com", "youtu.be", "ytimg.com", "googlevideo.com", "yt.be",
  "youtubei.googleapis.com", "youtube-nocookie.com", "ggpht.com",
  // Google Video / Tools / Extension CDN
  "gvt1.com", "gvt2.com", "gvt3.com",
  // Modern AI & Dev Ecosystem
  "openai.com", "anthropic.com", "claude.ai", "groq.com", "huggingface.co",
  "deepseek.com", "mistral.ai", "cohere.com", "cursor.sh", "cursor.com", "codeium.com"
]

export const TORRENT_TRACKER_DOMAINS = [
  // Rutracker & mirrors
  "rutracker.org", "rutracker.net", "rutracker.cc", "rutracker.nl", "rutracker.ru", "t-ru.org", "rutracker.wiki",
  // NNM-Club & mirrors
  "nnmclub.to", "nnmclub.ro", "nnmclub.ru", "nnm-club.me", "nnm-club.name", "nnm-club.ws", "nnm-club.lib", "nnm-club.ru",
  // Rutor & mirrors
  "rutor.info", "rutor.is", "rutor.org", "openrutor.org", "openrutor.is", "free-rutor.org",
  // Pornolab & mirrors
  "pornolab.net", "pornolab.cc",
  // Kinozal & Cinema trackers
  "kinozal.tv", "kinozal.guru", "kinozal.me", "lostfilm.tv", "lostfilm.run", "lostfilm.today", "baibako.tv", "anilibria.tv", "animelayer.ru",
  // Other popular CIS trackers
  "rustorka.com", "megapeer.vip", "megapeer.org", "tapochek.net", "seedoff.net", "seedoff.tv", "torlook.info", "riper.am", "underverse.biz", "underverse.su",
  // Public trackers & announcers
  "opentrackr.org", "openbittorrent.com", "torrent.eu.org", "open.stealth.si", "stealth.si",
  "explodie.org", "dler.org", "leechers-paradise.org", "zerobytes.xyz", "tamersunion.org",
  "demonii.com", "desync.com", "coppersurfer.tk", "cyberia.is", "moeking.me", "harry.lu",
  "bittorrent.am", "armun.pw", "dump.cl", "filemail.com", "therarbg.com", "torrent.ubuntu.com"
]

export const TORRENT_PROCESSES = [
  // qBittorrent
  "qbittorrent.exe",
  "qBittorrent.exe",
  // uTorrent
  "utorrent.exe",
  "uTorrent.exe",
  "utorrentweb.exe",
  "uTorrentWeb.exe",
  // BitTorrent (official)
  "bittorrent.exe",
  "BitTorrent.exe",
  "bittorrentweb.exe",
  "BitTorrentWeb.exe",
  // Transmission
  "transmission.exe",
  "Transmission.exe",
  "transmission-qt.exe",
  "Transmission-qt.exe",
  "transmission-daemon.exe",
  // Deluge
  "deluge.exe",
  "Deluge.exe",
  "deluged.exe",
  // BitComet
  "bitcomet.exe",
  "BitComet.exe",
  // Tixati
  "tixati.exe",
  "Tixati.exe",
  // BiglyBT & Vuze
  "biglybt.exe",
  "BiglyBT.exe",
  "vuze.exe",
  "Vuze.exe",
  // Tribler
  "tribler.exe",
  "Tribler.exe",
  // PicoTorrent
  "picotorrent.exe",
  "PicoTorrent.exe",
  // Free Download Manager
  "fdm.exe",
  "freedownloadmanager.exe",
  "FreeDownloadManager.exe",
  // Motrix & Aria2
  "aria2c.exe",
  "motrix.exe",
  "Motrix.exe"
]

const DISCORD_VOICE_UDP_PORTS = ["19294:19344", "50000:50100"]

export function convertVlessToSingBoxConfig(vlessUrl: string, mode: AppMode = 'home'): { config: Record<string, unknown>; name: string } {
  let parsed: URL
  try {
    parsed = new URL(vlessUrl.trim())
  } catch {
    throw new Error('Некорректный формат ссылки')
  }

  const isHysteria2 = parsed.protocol === 'hysteria2:' || parsed.protocol === 'hy2:'
  if (parsed.protocol !== 'vless:' && !isHysteria2) {
    throw new Error('Ссылка должна начинаться с vless:// или hysteria2://')
  }

  const credential = decodeURIComponent(parsed.username || '')
  if (!credential) {
    throw new Error(isHysteria2 ? 'В ссылке отсутствует пароль Hysteria 2' : 'В ссылке отсутствует UUID пользователя')
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
  let proxyOutbound: Record<string, unknown>

  if (isHysteria2) {
    const sni = params.get('sni') || server
    const insecure = params.get('insecure') === '1' || params.get('insecure') === 'true'
    const obfsType = params.get('obfs') || ''
    const obfsPassword = params.get('obfs-password') || ''
    const upMbps = parseInt(params.get('upmbps') || '100', 10) || 100
    const downMbps = parseInt(params.get('downmbps') || '250', 10) || 250

    const tlsObj: Record<string, unknown> = {
      enabled: true,
      server_name: sni
    }
    if (insecure) {
      tlsObj.insecure = true
    }

    proxyOutbound = {
      type: "hysteria2",
      tag: "proxy-out",
      server,
      server_port: port,
      up_mbps: upMbps,
      down_mbps: downMbps,
      password: credential,
      domain_resolver: "dns-direct",
      tls: tlsObj
    }

    if (obfsType === 'salamander' && obfsPassword) {
      proxyOutbound.obfs = {
        type: 'salamander',
        password: obfsPassword
      }
    }
  } else {
    const type = params.get('type') || 'tcp'
    const security = params.get('security') || 'reality'
    const flow = params.get('flow') || (security === 'reality' ? 'xtls-rprx-vision' : '')
    const pbk = params.get('pbk') || ''
    const sid = params.get('sid') || ''
    const rawSni = params.get('sni')
    const sni = rawSni || server
    const rawFp = (params.get('fp') || '').trim().toLowerCase()
    // Normalize chrome -> firefox: sing-box 1.14 uTLS chrome ClientHello is silently dropped by RU TSPU on foreign VPS TCP:443
    const fp = (!rawFp || rawFp === 'chrome') ? DEFAULT_UTLS_FINGERPRINT : rawFp
    const wsPath = params.get('path') || '/office-ws'

    if (security !== 'reality' && security !== 'tls' && security !== 'none') {
      throw new Error(`Тип безопасности "${security}" не поддерживается (требуется Reality или TLS)`)
    }

    proxyOutbound = {
      type: "vless",
      tag: "proxy-out",
      server,
      server_port: port,
      uuid: credential,
      domain_strategy: "ipv4_only",
      domain_resolver: "dns-direct",
      tcp_fast_open: false,
      tcp_keep_alive: "30s",
      tcp_keep_alive_interval: "10s",
      connect_timeout: "8s"
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
        server_name: sni,
        utls: { enabled: true, fingerprint: fp }
      }
    }
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
    { tag: "dns-remote", type: "udp", server: "8.8.8.8", server_port: 53, detour: "proxy-out" }
  )

  // Real-IP Split DNS (avoid FakeIP on Windows to preserve Discord WebRTC voice, RMS, and 1C)
  dnsRules.push(
    { domain_suffix: TORRENT_TRACKER_DOMAINS, server: "dns-remote" },
    { domain_suffix: RUSSIAN_AND_CIS_DOMAINS, server: "dns-direct" },
    { domain_suffix: DISCORD_DOMAINS, server: "dns-remote" },
    { domain_suffix: STREAMING_AND_AI_DOMAINS, server: "dns-remote" }
  )

  // Rely on protocol sniffing + protocol:"dns" hijack (avoid blind port:53 hijack),
  // and reject non-DNS traffic aimed at virtual TUN gateway 172.19.0.2 (e.g. Tailscale NAT-PMP/PCP on UDP:5351)
  // which otherwise collides with sing-box 1.14's port-agnostic TUN dnsHijackAddress check.
  const routeRules: Record<string, unknown>[] = [
    { action: "sniff" },
    { protocol: "dns", action: "hijack-dns" },
    { ip_cidr: ["172.19.0.2/32"], action: "reject" }
  ]

  // Block inner browser QUIC/HTTP3 across ALL protocols (both TCP VLESS and UDP Hysteria 2)
  // so video CDNs (phncdn, xvideos-cdn, cloudflare) stream over fast HTTP/2 without ERR_QUIC_PROTOCOL_ERROR
  // or QUIC-in-QUIC overhead, while keeping Hysteria 2 outer transport and voice/game UDP untouched.
  routeRules.push({ protocol: "quic", action: "reject" })

  routeRules.push(routeDirectRule)

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
    { ip_cidr: ["224.0.0.0/4"], outbound: "direct" },
    { ip_cidr: TELEGRAM_IP_CIDRS, outbound: "proxy-out" },
    { domain_suffix: TORRENT_TRACKER_DOMAINS, outbound: "proxy-out" },
    { process_name: TORRENT_PROCESSES, outbound: "direct" },
    { domain_suffix: RUSSIAN_AND_CIS_DOMAINS, outbound: "direct" },
    { domain_suffix: DISCORD_DOMAINS, outbound: "proxy-out" },
    { domain_suffix: STREAMING_AND_AI_DOMAINS, outbound: "proxy-out" },
    {
      network: "udp",
      port_range: DISCORD_VOICE_UDP_PORTS,
      outbound: "proxy-out"
    }
  )

  const config: Record<string, unknown> = {
    log: { level: "warn", timestamp: true },
    dns: {
      servers: dnsServers,
      rules: dnsRules,
      final: "dns-remote",
      strategy: "ipv4_only",
      cache_capacity: 10000,
      reverse_mapping: true
    },
    inbounds: [
      {
        type: "tun",
        tag: "tun-in",
        interface_name: "singbox-tun0",
        address: ["172.19.0.1/30"],
        // Explicit dns_address keeps Wintun DNS at 172.19.0.2 while bypassing sing-box 1.14's
        // port-agnostic dnsHijackAddress shortcut (which hijacked Tailscale UDP:5351 NAT-PMP as DNS).
        dns_address: ["172.19.0.2"],
        mtu: 1400,
        auto_route: true,
        strict_route: true,
        endpoint_independent_nat: true,
        stack: "system"
      }
    ],
    outbounds: [
      proxyOutbound,
      { type: "direct", tag: "direct", domain_resolver: "dns-direct" }
    ],
    route: {
      auto_detect_interface: true,
      default_domain_resolver: "dns-direct",
      find_process: true,
      rules: routeRules,
      final: "proxy-out"
    }
  }

  return { config, name }
}

export const convertProxyLinkToSingBoxConfig = convertVlessToSingBoxConfig

function arraysEqual(a: unknown[], b: unknown[]): boolean {
  if (!Array.isArray(a) || !Array.isArray(b)) return false
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

/**
 * Ensures any sing-box configuration has required Option 1 torrent routing rules:
 * - reverse_mapping: true in DNS to restore tracker domains from resolved IPs
 * - DNS rule resolving TORRENT_TRACKER_DOMAINS via dns-remote
 * - find_process: true in route block
 * - Multicast 224.0.0.0/4 -> direct (for UPnP/NAT-PMP and LSD)
 * - TORRENT_TRACKER_DOMAINS -> proxy-out
 * - TORRENT_PROCESSES -> direct (strictly after tracker domain rule)
 *
 * Returns true if changes were made to config, false if already up-to-date.
 */
export function patchConfigWithTorrentRouting(config: Record<string, unknown>): boolean {
  if (!config || typeof config !== 'object') return false
  let changed = false

  // 1. Ensure reverse_mapping: true in dns block
  if (config.dns && typeof config.dns === 'object') {
    const dns = config.dns as Record<string, unknown>
    if (dns.reverse_mapping !== true) {
      dns.reverse_mapping = true
      changed = true
    }

    if (Array.isArray(dns.rules)) {
      const trackerRule = dns.rules.find((r: any) =>
        r && Array.isArray(r.domain_suffix) && r.domain_suffix.includes('rutracker.org')
      ) as Record<string, unknown> | undefined

      if (!trackerRule) {
        dns.rules.unshift({
          domain_suffix: TORRENT_TRACKER_DOMAINS,
          server: 'dns-remote'
        })
        changed = true
      } else if (!arraysEqual(trackerRule.domain_suffix as unknown[], TORRENT_TRACKER_DOMAINS)) {
        trackerRule.domain_suffix = TORRENT_TRACKER_DOMAINS
        changed = true
      }
    }
  }

  // 2. Ensure find_process: true and routing rules in route block
  if (config.route && typeof config.route === 'object') {
    const route = config.route as Record<string, unknown>
    if (route.find_process !== true) {
      route.find_process = true
      changed = true
    }

    if (Array.isArray(route.rules)) {
      const rules = route.rules as Record<string, unknown>[]

      // Ensure multicast rule exists
      const hasMulticast = rules.some(r =>
        Array.isArray(r.ip_cidr) && (r.ip_cidr as string[]).includes('224.0.0.0/4')
      )
      if (!hasMulticast) {
        const privIdx = rules.findIndex(r => r.ip_is_private === true)
        const insertIdx = privIdx !== -1 ? privIdx + 1 : rules.length
        rules.splice(insertIdx, 0, { ip_cidr: ['224.0.0.0/4'], outbound: 'direct' })
        changed = true
      }

      // Ensure tracker rule exists and is up to date
      let trackerIdx = rules.findIndex(r =>
        Array.isArray(r.domain_suffix) &&
        (r.domain_suffix as string[]).includes('rutracker.org') &&
        r.outbound === 'proxy-out'
      )
      if (trackerIdx === -1) {
        const multiIdx = rules.findIndex(r =>
          Array.isArray(r.ip_cidr) && (r.ip_cidr as string[]).includes('224.0.0.0/4')
        )
        const insertIdx = multiIdx !== -1 ? multiIdx + 1 : rules.length
        rules.splice(insertIdx, 0, { domain_suffix: TORRENT_TRACKER_DOMAINS, outbound: 'proxy-out' })
        trackerIdx = insertIdx
        changed = true
      } else {
        const trackerRule = rules[trackerIdx]
        if (!arraysEqual(trackerRule.domain_suffix as unknown[], TORRENT_TRACKER_DOMAINS)) {
          trackerRule.domain_suffix = TORRENT_TRACKER_DOMAINS
          changed = true
        }
      }

      // Ensure torrent process rule exists and is positioned strictly after tracker rule
      let procIdx = rules.findIndex(r =>
        Array.isArray(r.process_name) &&
        (r.process_name as string[]).includes('qbittorrent.exe') &&
        r.outbound === 'direct'
      )
      if (procIdx === -1) {
        rules.splice(trackerIdx + 1, 0, { process_name: TORRENT_PROCESSES, outbound: 'direct' })
        changed = true
      } else {
        const procRule = rules[procIdx]
        if (!arraysEqual(procRule.process_name as unknown[], TORRENT_PROCESSES)) {
          procRule.process_name = TORRENT_PROCESSES
          changed = true
        }
        if (procIdx < trackerIdx) {
          const [removed] = rules.splice(procIdx, 1)
          const newTrackerIdx = rules.findIndex(r =>
            Array.isArray(r.domain_suffix) &&
            (r.domain_suffix as string[]).includes('rutracker.org') &&
            r.outbound === 'proxy-out'
          )
          rules.splice(newTrackerIdx + 1, 0, removed)
          changed = true
        }
      }
    }
  }

  return changed
}

/**
 * Fully migrates legacy sing-box configurations to modern high-stability standards:
 * 1. Patches torrent tracker and process routing rules (patchConfigWithTorrentRouting).
 * 2. Reduces log verbosity from "info" to "warn" to prevent multi-hundred-MB session logs.
 * 3. In tun inbounds: removes IPv6 addresses, keeping IPv4 only and native "system" stack.
 * 4. In VLESS outbounds: disables TCP Fast Open (prevents RU ISP/CGNAT drops), sets TCP keepalive & connect_timeout.
 * 5. In Reality outbound for 89.124.94.246: migrates deprecated Russian target SNIs (vdsina.ru/hostkey.ru) to github.com and ensures valid keys/uTLS/flow.
 * 6. Synchronizes Real-IP Split DNS (removing legacy FakeIP, migrating office dns.final from dns-direct to dns-remote).
 * 7. Adds inner QUIC reject rule across all proxy configs (eliminating QUIC-in-QUIC / HTTP/3 stalls) and narrows Discord UDP range.
 *
 * Returns true if changes were made to config, false if already up-to-date (idempotent).
 */
export function migrateLegacyConfig(config: Record<string, unknown>): boolean {
  if (!config || typeof config !== 'object') return false
  let changed = false

  // 0. Reduce excessive info logging to warn
  if (config.log && typeof config.log === 'object') {
    const log = config.log as Record<string, unknown>
    if (log.level === 'info') {
      log.level = 'warn'
      changed = true
    }
  }

  // 1. Torrent routing patch
  if (patchConfigWithTorrentRouting(config)) {
    changed = true
  }

  // 2. Tun inbounds: remove IPv6 addresses and switch stack to "system"
  if (Array.isArray(config.inbounds)) {
    for (const inbound of config.inbounds as Record<string, unknown>[]) {
      if (!inbound || typeof inbound !== 'object') continue
      if (inbound.type === 'tun') {
        if (Array.isArray(inbound.address)) {
          const original = inbound.address as unknown[]
          const ipv4Only = original.filter(a => typeof a === 'string' && !a.includes(':')) as string[]
          if (ipv4Only.length !== original.length) {
            inbound.address = ipv4Only.length > 0 ? ipv4Only : ['172.19.0.1/30']
            changed = true
          } else if (inbound.address.length === 0) {
            inbound.address = ['172.19.0.1/30']
            changed = true
          }
        } else if (!inbound.address) {
          inbound.address = ['172.19.0.1/30']
          changed = true
        }

        if (inbound.stack !== 'system') {
          inbound.stack = 'system'
          changed = true
        }

        // Explicit dns_address disables sing-box 1.14's port-agnostic TUN dnsHijackAddress shortcut
        // that misclassifies Tailscale NAT-PMP/PCP (172.19.0.2:5351) as DNS packets every ~22s.
        const addrs = inbound.address as string[]
        if (addrs.includes('172.19.0.1/30') && !arraysEqual(inbound.dns_address as unknown[], ['172.19.0.2'])) {
          inbound.dns_address = ['172.19.0.2']
          changed = true
        }
      }
    }
  }

  // 3. Outbounds optimization & Reality alignment
  if (Array.isArray(config.outbounds)) {
    for (const outbound of config.outbounds as Record<string, unknown>[]) {
      if (!outbound || typeof outbound !== 'object') continue
      if (outbound.type === 'hysteria2') {
        if (!outbound.domain_resolver) {
          outbound.domain_resolver = 'dns-direct'
          changed = true
        }
        continue
      }
      if (!outbound.domain_resolver && (outbound.type === 'vless' || outbound.type === 'direct')) {
        outbound.domain_resolver = 'dns-direct'
        changed = true
      }
      if (outbound.type === 'vless') {
        if (outbound.tcp_fast_open !== false) {
          outbound.tcp_fast_open = false
          changed = true
        }
        if (outbound.tcp_keep_alive !== '30s') {
          outbound.tcp_keep_alive = '30s'
          changed = true
        }
        if (outbound.tcp_keep_alive_interval !== '10s') {
          outbound.tcp_keep_alive_interval = '10s'
          changed = true
        }
        if (outbound.connect_timeout !== '8s') {
          outbound.connect_timeout = '8s'
          changed = true
        }

        // Migrate uTLS fingerprint on ALL VLESS TLS/Reality outbounds:
        // sing-box 1.14 chrome ClientHello or plain Go crypto/tls is throttled/dropped by RU TSPU -> use firefox uTLS
        const anyTls = outbound.tls as Record<string, unknown> | undefined
        if (anyTls && typeof anyTls === 'object' && (anyTls.enabled === true || (anyTls.reality && typeof anyTls.reality === 'object'))) {
          if (!anyTls.utls || typeof anyTls.utls !== 'object') {
            anyTls.utls = { enabled: true, fingerprint: DEFAULT_UTLS_FINGERPRINT }
            changed = true
          } else {
            const utls = anyTls.utls as Record<string, unknown>
            if (utls.enabled !== true) {
              utls.enabled = true
              changed = true
            }
            if (!utls.fingerprint || utls.fingerprint === 'chrome') {
              utls.fingerprint = DEFAULT_UTLS_FINGERPRINT
              changed = true
            }
          }
        }
      }
      if (outbound.type === 'vless' && outbound.server === '89.124.94.246') {
        const tls = outbound.tls as Record<string, unknown> | undefined
        if (tls && typeof tls === 'object') {
          const reality = tls.reality as Record<string, unknown> | undefined
          if (reality && typeof reality === 'object') {
            // Migrate legacy RU DDoS-Guard / GFW-flagged SNIs to clean EU target
            if (!tls.server_name || tls.server_name === 'vdsina.ru' || tls.server_name === 'hostkey.ru') {
              tls.server_name = DEFAULT_REALITY_SNI
              changed = true
            }
            if (reality.short_id !== 'd2206270cdf067') {
              reality.short_id = 'd2206270cdf067'
              changed = true
            }
            if (reality.public_key !== 'rtkFblJnh5rBZmpjlFaD7ju8TQHt8gl1LtK6pqwcEAw') {
              reality.public_key = 'rtkFblJnh5rBZmpjlFaD7ju8TQHt8gl1LtK6pqwcEAw'
              changed = true
            }
            if (outbound.flow !== 'xtls-rprx-vision') {
              outbound.flow = 'xtls-rprx-vision'
              changed = true
            }
          }
        }
      }
    }
  }

  // 4. DNS rules synchronization: Real-IP Split DNS (no FakeIP on Windows), reverse_mapping, STREAMING_AND_AI_DOMAINS, DISCORD_DOMAINS
  if (config.dns && typeof config.dns === 'object') {
    const dns = config.dns as Record<string, unknown>
    if (dns.final === 'dns-direct') {
      dns.final = 'dns-remote'
      changed = true
    }
    if (dns.reverse_mapping !== true) {
      dns.reverse_mapping = true
      changed = true
    }

    if (Array.isArray(dns.servers)) {
      const servers = dns.servers as Record<string, unknown>[]
      const filteredServers = servers.filter(s => !(s && (s.tag === 'dns-fakeip' || s.type === 'fakeip')))
      if (filteredServers.length !== servers.length) {
        dns.servers = filteredServers
        changed = true
      }
    }

    if (Array.isArray(dns.rules)) {
      let dnsRules = dns.rules as Record<string, unknown>[]

      // Remove catch-all FakeIP rules if present (preserve Real-IP Split DNS for Discord WebRTC / RMS / 1C)
      const filteredDnsRules = dnsRules.filter(r => !(r && r.server === 'dns-fakeip' && Array.isArray(r.query_type)))
      if (filteredDnsRules.length !== dnsRules.length) {
        dnsRules = filteredDnsRules
        dns.rules = dnsRules
        changed = true
      }

      // STREAMING_AND_AI_DOMAINS
      const streamingRule = dnsRules.find((r: any) =>
        r && Array.isArray(r.domain_suffix) && (
          r.domain_suffix.includes('google.com') ||
          r.domain_suffix.includes('youtube.com') ||
          r.domain_suffix.includes('openai.com') ||
          r.domain_suffix.includes('gemini.google.com')
        )
      )

      if (!streamingRule) {
        dnsRules.push({
          domain_suffix: STREAMING_AND_AI_DOMAINS,
          server: 'dns-remote'
        })
        changed = true
      } else {
        if (!arraysEqual(streamingRule.domain_suffix as unknown[], STREAMING_AND_AI_DOMAINS)) {
          streamingRule.domain_suffix = STREAMING_AND_AI_DOMAINS
          changed = true
        }
        if (streamingRule.server !== 'dns-remote') {
          streamingRule.server = 'dns-remote'
          changed = true
        }
      }

      // DISCORD_DOMAINS
      const discordRule = dnsRules.find((r: any) =>
        r && Array.isArray(r.domain_suffix) && r.domain_suffix.includes('discord.gg')
      )

      if (discordRule) {
        if (!arraysEqual(discordRule.domain_suffix as unknown[], DISCORD_DOMAINS)) {
          discordRule.domain_suffix = DISCORD_DOMAINS
          changed = true
        }
        if (discordRule.server !== 'dns-remote') {
          discordRule.server = 'dns-remote'
          changed = true
        }
      }
    }
  }

  // 5. Route rules synchronization: inner QUIC reject (all proxies), STREAMING_AND_AI_DOMAINS, DISCORD_DOMAINS, narrow UDP voice ports
  if (config.route && typeof config.route === 'object') {
    const route = config.route as Record<string, unknown>
    if (!route.default_domain_resolver) {
      route.default_domain_resolver = 'dns-direct'
      changed = true
    }
    if (route.auto_detect_interface !== true) {
      route.auto_detect_interface = true
      changed = true
    }
    if (Array.isArray(route.rules)) {
      const rules = route.rules as Record<string, unknown>[]

      // Strip legacy blind port:53 hijack-dns rule (keeps sniff + protocol:"dns" hijack-dns)
      // to stop non-DNS binary packets on port 53 from spamming DNS unpack errors every ~22s
      const blindPort53Idx = rules.findIndex(r =>
        r && r.action === 'hijack-dns' && !r.protocol && (r.port === 53 || (Array.isArray(r.port) && r.port.length === 1 && r.port[0] === 53))
      )
      if (blindPort53Idx !== -1) {
        rules.splice(blindPort53Idx, 1)
        const hasSniff = rules.some(r => r && r.action === 'sniff')
        if (!hasSniff) {
          rules.unshift({ action: 'sniff' })
        }
        const hasProtoDns = rules.some(r => r && r.protocol === 'dns' && r.action === 'hijack-dns')
        if (!hasProtoDns) {
          const sniffIdx = rules.findIndex(r => r && r.action === 'sniff')
          rules.splice(sniffIdx !== -1 ? sniffIdx + 1 : 0, 0, { protocol: 'dns', action: 'hijack-dns' })
        }
        changed = true
      }

      // Ensure non-DNS packets to virtual TUN gateway 172.19.0.2 (e.g. Tailscale NAT-PMP/PCP on UDP:5351)
      // are silently rejected right after hijack-dns whenever tun uses dns_address 172.19.0.2
      const usesVirtualTunDns = Array.isArray(config.inbounds) && (config.inbounds as Record<string, unknown>[]).some(
        inb => inb && inb.type === 'tun' && Array.isArray(inb.dns_address) && (inb.dns_address as string[]).includes('172.19.0.2')
      )
      if (usesVirtualTunDns) {
        const hasGatewayReject = rules.some(r =>
          r && r.action === 'reject' && Array.isArray(r.ip_cidr) && (r.ip_cidr as string[]).includes('172.19.0.2/32')
        )
        if (!hasGatewayReject) {
          const hijackIdx = rules.findIndex(r => r && r.action === 'hijack-dns')
          let insertIdx = hijackIdx !== -1 ? hijackIdx + 1 : 0
          while (insertIdx < rules.length && rules[insertIdx]?.action === 'hijack-dns') {
            insertIdx++
          }
          rules.splice(insertIdx, 0, { ip_cidr: ['172.19.0.2/32'], action: 'reject' })
          changed = true
        }
      }

      // Reject inner QUIC/HTTP3 across all proxy types to prevent QUIC-in-QUIC / UDP-over-TCP failures
      const hasQuicReject = rules.some(r => r && r.protocol === 'quic' && r.action === 'reject')
      if (!hasQuicReject) {
        const hijackIdx = rules.findIndex(r => r && r.action === 'hijack-dns')
        const insertIdx = hijackIdx !== -1 ? hijackIdx + 1 : 0
        // Place after the last hijack-dns rule if multiple exist
        let finalInsertIdx = insertIdx
        while (finalInsertIdx < rules.length && rules[finalInsertIdx]?.action === 'hijack-dns') {
          finalInsertIdx++
        }
        rules.splice(finalInsertIdx, 0, { protocol: 'quic', action: 'reject' })
        changed = true
      }

      // Ensure Telegram DC CIDRs are always proxied BEFORE direct RU/torrent rules
      const tgIdx = rules.findIndex(r =>
        r && Array.isArray(r.ip_cidr) && (r.ip_cidr as string[]).includes('149.154.160.0/20') && r.outbound === 'proxy-out'
      )
      const ruDirectIdx = rules.findIndex(r =>
        r && Array.isArray(r.domain_suffix) && (r.domain_suffix as string[]).includes('ru') && r.outbound === 'direct'
      )
      const multiIdx = rules.findIndex(r =>
        r && Array.isArray(r.ip_cidr) && (r.ip_cidr as string[]).includes('224.0.0.0/4')
      )
      const safeTargetIdx =
        (multiIdx !== -1 && (ruDirectIdx === -1 || multiIdx < ruDirectIdx))
          ? multiIdx + 1
          : (ruDirectIdx !== -1 ? ruDirectIdx : rules.length)

      if (tgIdx === -1) {
        rules.splice(safeTargetIdx, 0, { ip_cidr: TELEGRAM_IP_CIDRS, outbound: 'proxy-out' })
        changed = true
      } else {
        const tgRule = rules[tgIdx]
        if (!arraysEqual(tgRule.ip_cidr as unknown[], TELEGRAM_IP_CIDRS)) {
          tgRule.ip_cidr = TELEGRAM_IP_CIDRS
          changed = true
        }
        if (ruDirectIdx !== -1 && tgIdx > ruDirectIdx) {
          const [removed] = rules.splice(tgIdx, 1)
          const targetIdx = (multiIdx !== -1 && multiIdx < ruDirectIdx) ? multiIdx + 1 : ruDirectIdx
          rules.splice(targetIdx, 0, removed)
          changed = true
        }
      }

      // STREAMING_AND_AI_DOMAINS
      const streamingRouteRule = rules.find((r: any) =>
        r && Array.isArray(r.domain_suffix) && (
          r.domain_suffix.includes('google.com') ||
          r.domain_suffix.includes('youtube.com') ||
          r.domain_suffix.includes('openai.com') ||
          r.domain_suffix.includes('gemini.google.com')
        ) && r.outbound === 'proxy-out'
      )

      if (!streamingRouteRule) {
        rules.push({
          domain_suffix: STREAMING_AND_AI_DOMAINS,
          outbound: 'proxy-out'
        })
        changed = true
      } else if (!arraysEqual(streamingRouteRule.domain_suffix as unknown[], STREAMING_AND_AI_DOMAINS)) {
        streamingRouteRule.domain_suffix = STREAMING_AND_AI_DOMAINS
        changed = true
      }

      // DISCORD_DOMAINS
      const discordRouteRule = rules.find((r: any) =>
        r && Array.isArray(r.domain_suffix) && r.domain_suffix.includes('discord.gg') && r.outbound === 'proxy-out'
      )

      if (
        discordRouteRule &&
        !arraysEqual(discordRouteRule.domain_suffix as unknown[], DISCORD_DOMAINS)
      ) {
        discordRouteRule.domain_suffix = DISCORD_DOMAINS
        changed = true
      }

      // Discord voice UDP range (narrowed from 50000:65535 -> 50000:50100 to avoid proxying unrelated UDP)
      const discordUdpRule = rules.find((r: any) =>
        r && r.network === 'udp' && Array.isArray(r.port_range) && (r.port_range as string[]).includes('19294:19344')
      )
      if (!discordUdpRule) {
        rules.push({
          network: 'udp',
          port_range: DISCORD_VOICE_UDP_PORTS,
          outbound: 'proxy-out'
        })
        changed = true
      } else if (!arraysEqual(discordUdpRule.port_range as unknown[], DISCORD_VOICE_UDP_PORTS)) {
        discordUdpRule.port_range = DISCORD_VOICE_UDP_PORTS
        changed = true
      }
    }
  }

  return changed
}
