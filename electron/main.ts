import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, dialog, shell, Notification } from 'electron'
import { autoUpdater } from 'electron-updater'
import path from 'node:path'
import fs from 'node:fs'
import http from 'node:http'
import net from 'node:net'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { execFile, execFileSync, spawn, ChildProcess } from 'node:child_process'
import { promisify } from 'node:util'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const execFileAsync = promisify(execFile)

// Single Instance Lock (Prevents duplicate background processes)
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
}

const APP_AUMID = 'Exilium Switch'
app.setName('Exilium Switch')
try {
  app.setAppUserModelId(APP_AUMID)
} catch {}

// High DPI & 2K/4K Crispness
app.commandLine.appendSwitch('high-dpi-support', '1')

// Global exception handling
process.on('uncaughtException', (error) => {
  console.error('[MAIN] UNCAUGHT EXCEPTION:', error)
})
process.on('unhandledRejection', (reason) => {
  console.error('[MAIN] UNHANDLED REJECTION:', reason)
})

// ============================================================
// Type Definitions
// ============================================================
export type AppMode = 'home' | 'office' | 'gaming'

export interface AppSettings {
  realZone: string
  fakeZone: string
  autoStart: boolean
  minimizeToTray: boolean
  startMinimized: boolean
  activeProfileId?: string | null
  appMode?: AppMode
  activeProfileIdByMode?: Record<string, string>
}

export interface ConfigProfile {
  id: string
  name: string
  filename: string
  path: string
  createdAt: number
  isActive?: boolean
  mode?: AppMode
}

export interface AuditDiagnosisResult {
  hostname: string
  currentUser: string
  isAdministrator: boolean
  domainJoined: boolean
  domainName: string
  domainControllers: Array<{ name: string; ip: string }>
  dnsServers: string[]
  dnsSuffixes: string[]
  defaultGateway: string
  ipAddress: string
  vpsReachable: boolean
  vpsLatencyMs: number
  recommendedMode: AppMode
  recommendationReason: string
}

const DEFAULT_SETTINGS: AppSettings = {
  realZone: 'Tomsk Standard Time',
  fakeZone: 'W. Europe Standard Time',
  autoStart: false,
  minimizeToTray: true,
  startMinimized: false,
  activeProfileId: null,
  appMode: 'home',
  activeProfileIdByMode: {}
}

// ============================================================
// Application State & Logging
// ============================================================
let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let appStartTime: number | null = null
let singBoxProcess: ChildProcess | null = null
let isToggling = false
let isQuitting = false

// RAM Ring Buffer (for fast UI rendering)
const logsBuffer: Array<{ time: string; text: string; type: 'info' | 'warn' | 'error' | 'success' }> = []

// Persistent Session File Logger
let sessionLogFilePath: string = ''
let sessionLogStream: fs.WriteStream | null = null

function initSessionLogger() {
  try {
    const logsDir = path.join(app.getPath('userData'), 'logs')
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true })
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    sessionLogFilePath = path.join(logsDir, `exilium-session-${timestamp}.log`)
    sessionLogStream = fs.createWriteStream(sessionLogFilePath, { flags: 'a', encoding: 'utf-8' })
    sessionLogStream.write(`=== EXILIUM SWITCH v1.3 SESSION STARTED [${new Date().toISOString()}] (by Nostro) ===\n`)
  } catch (err) {
    console.error('Failed to init session logger:', err)
  }
}

function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').trim()
}

function addLog(text: string, type: 'info' | 'warn' | 'error' | 'success' = 'info') {
  const clean = stripAnsi(text)
  if (!clean) return
  const now = new Date()
  const time = now.toLocaleTimeString('ru-RU', { hour12: false })
  const isoTime = now.toISOString()
  const prefix = type === 'error' ? 'ERR' : type === 'warn' ? 'WRN' : type === 'success' ? 'OK ' : 'INF'
  
  const entry = { time, text: clean, type }
  logsBuffer.push(entry)
  if (logsBuffer.length > 1000) logsBuffer.shift()

  if (sessionLogStream) {
    try {
      sessionLogStream.write(`[${isoTime}] [${prefix}] ${clean}\n`)
    } catch {}
  }

  console.log(`[${time}] [${prefix}] ${clean}`)

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('sing-box-log', entry)
  }
}

// ============================================================
// Real Executable Path Resolution (Handles Portable .exe)
// ============================================================
function getRealExePath(): string {
  if (process.env.PORTABLE_EXECUTABLE_FILE && fs.existsSync(process.env.PORTABLE_EXECUTABLE_FILE)) {
    return process.env.PORTABLE_EXECUTABLE_FILE
  }
  return process.execPath
}

// ============================================================
// Cached Icon Assets (Ensures Physical Path for Windows API / Toast)
// ============================================================
function ensureCachedIcons(): { pngPath: string; icoPath: string } {
  const userData = app.getPath('userData')
  const pngPath = path.join(userData, 'app-icon.png')
  const icoPath = path.join(userData, 'app-icon.ico')

  try {
    if (!fs.existsSync(userData)) {
      fs.mkdirSync(userData, { recursive: true })
    }

    const icoCandidates = [
      path.join(app.getAppPath(), 'build', 'icon.ico'),
      path.join(process.resourcesPath, 'build', 'icon.ico'),
      path.join(__dirname, '..', 'build', 'icon.ico'),
      path.resolve('build', 'icon.ico'),
      path.resolve('ExiliumSwitchIcon.ico')
    ]
    for (const cand of icoCandidates) {
      if (fs.existsSync(cand)) {
        try {
          fs.copyFileSync(cand, icoPath)
        } catch {}
        break
      }
    }

    const pngCandidates = [
      path.join(app.getAppPath(), 'build', 'icon.png'),
      path.join(app.getAppPath(), 'src', 'assets', 'ExiliumAppIcon.png'),
      path.join(process.resourcesPath, 'build', 'icon.png'),
      path.join(__dirname, '..', 'build', 'icon.png'),
      path.join(__dirname, '..', 'src', 'assets', 'ExiliumAppIcon.png'),
      path.resolve('build', 'icon.png')
    ]
    for (const cand of pngCandidates) {
      if (fs.existsSync(cand)) {
        try {
          fs.copyFileSync(cand, pngPath)
        } catch {}
        break
      }
    }
  } catch (e) {
    console.error('Error caching icons:', e)
  }

  return { pngPath, icoPath }
}

// ============================================================
// Windows Integration: Start Menu Shortcut & Taskbar Pinning
// ============================================================
function registerWindowsIntegration() {
  try {
    const exePath = getRealExePath()
    const { icoPath } = ensureCachedIcons()
    const shortcutDir = path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs')
    if (!fs.existsSync(shortcutDir)) {
      fs.mkdirSync(shortcutDir, { recursive: true })
    }
    const shortcutPath = path.join(shortcutDir, 'Exilium Switch.lnk')
    const iconTarget = fs.existsSync(icoPath) ? icoPath : exePath

    const exists = fs.existsSync(shortcutPath)
    shell.writeShortcutLink(shortcutPath, exists ? 'update' : 'create', {
      target: exePath,
      cwd: path.dirname(exePath),
      description: 'Exilium Switch — Resident Shield (by Nostro)',
      icon: iconTarget,
      iconIndex: 0,
      appUserModelId: APP_AUMID
    })
  } catch (err) {
    console.error('registerWindowsIntegration error:', err)
  }
}

// ============================================================
// Windows Native Toast Notifications (Windows 10 & 11)
// ============================================================
function showNotification(title: string, body: string, isUrgent = false) {
  try {
    const { pngPath, icoPath } = ensureCachedIcons()
    const iconFile = fs.existsSync(pngPath) ? pngPath : fs.existsSync(icoPath) ? icoPath : undefined

    if (Notification.isSupported()) {
      const notif = new Notification({
        title,
        body,
        icon: iconFile,
        urgency: isUrgent ? 'critical' : 'normal',
        silent: false
      })
      notif.on('click', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          if (mainWindow.isMinimized()) mainWindow.restore()
          if (!mainWindow.isVisible()) mainWindow.show()
          mainWindow.focus()
        } else {
          createWindow()
        }
      })
      notif.show()
    }
  } catch (err) {
    console.error('Notification error:', err)
  }
}

// ============================================================
// Administrator Privileges Check
// ============================================================
async function checkIsAdmin(): Promise<boolean> {
  try {
    await execFileAsync('net.exe', ['session'])
    return true
  } catch {
    try {
      await execFileAsync('fltmc.exe')
      return true
    } catch {
      return false
    }
  }
}

// ============================================================
// Icon Resolution (ExiliumSwitchIcon / NativeImage)
// ============================================================
function getAppIcon() {
  const { icoPath, pngPath } = ensureCachedIcons()
  const candidates = [
    icoPath,
    pngPath,
    path.join(process.resourcesPath, 'build', 'icon.ico'),
    path.join(process.resourcesPath, 'build', 'icon.png'),
    path.join(app.getAppPath(), 'src', 'assets', 'ExiliumAppIcon.png'),
    path.join(app.getAppPath(), 'build', 'icon.ico'),
    path.join(app.getAppPath(), 'build', 'icon.png'),
    path.join(__dirname, '..', 'src', 'assets', 'ExiliumAppIcon.png'),
    path.join(__dirname, '..', 'build', 'icon.ico'),
    path.resolve('build', 'icon.ico'),
    path.resolve('ExiliumSwitchIcon.ico')
  ]

  for (const cand of candidates) {
    if (cand && fs.existsSync(cand)) {
      try {
        const img = nativeImage.createFromPath(cand)
        if (!img.isEmpty()) return img
      } catch {}
    }
  }

  const iconSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="14" fill="#09090b" stroke="#ffffff" stroke-width="2.5"/>
      <path d="M16 8 L16 16 L21 21" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="16" cy="16" r="3" fill="#ffffff"/>
    </svg>
  `
  return nativeImage.createFromBuffer(Buffer.from(iconSvg))
}

// ============================================================
// Settings Management & Autostart Synchronization
// ============================================================
function getSettingsPath(): string {
  return path.join(app.getPath('userData'), 'exilium_settings.json')
}

function applyAutoStartSetting(autoStart: boolean, startMinimized: boolean) {
  try {
    const exePath = getRealExePath()
    const args = startMinimized ? ['--hidden'] : []

    // 1. Electron API
    app.setLoginItemSettings({
      openAtLogin: autoStart,
      path: exePath,
      args: args
    })

    // 2. Direct registry synchronization for 100% guarantee on all Windows versions
    const regKey = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'
    if (autoStart) {
      const commandStr = args.length > 0 ? `"${exePath}" ${args.join(' ')}` : `"${exePath}"`
      execFile('reg.exe', ['add', regKey, '/v', 'Exilium Switch', '/t', 'REG_SZ', '/d', commandStr, '/f'], () => {})
    } else {
      execFile('reg.exe', ['delete', regKey, '/v', 'Exilium Switch', '/f'], () => {})
      execFile('reg.exe', ['delete', regKey, '/v', 'exilium-switch', '/f'], () => {})
      execFile('reg.exe', ['delete', regKey, '/v', 'com.nostro.exiliumswitch', '/f'], () => {})
    }
  } catch (err) {
    console.error('applyAutoStartSetting error:', err)
  }
}

function loadSettings(): AppSettings {
  try {
    const file = getSettingsPath()
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf-8'))
      if (data.activeProfileId === 'default') {
        data.activeProfileId = null
      }
      return { ...DEFAULT_SETTINGS, ...data }
    }
  } catch (err) {
    addLog(`Settings load warning: ${err}`, 'warn')
  }
  return { ...DEFAULT_SETTINGS }
}

function saveSettings(settings: Partial<AppSettings>): AppSettings {
  try {
    const current = loadSettings()
    const updated = { ...current, ...settings }
    fs.writeFileSync(getSettingsPath(), JSON.stringify(updated, null, 2), 'utf-8')
    applyAutoStartSetting(updated.autoStart, updated.startMinimized)
    return updated
  } catch (err) {
    addLog(`Ошибка сохранения настроек: ${err}`, 'error')
    return loadSettings()
  }
}


// ============================================================
// VLESS Link Converter to Sing-box Resident Config
// ============================================================
const RUSSIAN_AND_CIS_DOMAINS = [
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

const DISCORD_DOMAINS = [
  "discord.com", "discord.gg", "discordapp.com", "discordapp.net",
  "discord.media", "discordcdn.com", "discordstatus.com"
]

function convertVlessToSingBoxConfig(vlessUrl: string, mode: AppMode = 'home'): { config: any; name: string } {
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

  const dnsServers: any[] = []
  const dnsRules: any[] = []

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

  const routeRules: any[] = [
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

  const proxyOutbound: any = {
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

  const config: any = {
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

function getProfilesDir(): string {
  const dir = path.join(app.getPath('userData'), 'profiles')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

function getProfileMetaPath(): string {
  return path.join(getProfilesDir(), 'profiles_meta.json')
}

function loadProfileMeta(): Record<string, { name?: string; mode?: AppMode }> {
  try {
    const metaPath = getProfileMetaPath()
    if (fs.existsSync(metaPath)) {
      return JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
    }
  } catch {}
  return {}
}

function saveProfileMeta(id: string, meta: { name?: string; mode?: AppMode }) {
  try {
    const current = loadProfileMeta()
    current[id] = { ...(current[id] || {}), ...meta }
    fs.writeFileSync(getProfileMetaPath(), JSON.stringify(current, null, 2), 'utf-8')
  } catch {}
}

function deleteProfileMeta(id: string) {
  try {
    const current = loadProfileMeta()
    if (current[id]) {
      delete current[id]
      fs.writeFileSync(getProfileMetaPath(), JSON.stringify(current, null, 2), 'utf-8')
    }
  } catch {}
}

function purgeLegacyDefaultProfile() {
  try {
    const dir = getProfilesDir()
    const legacyPath = path.join(dir, 'default.json')
    if (fs.existsSync(legacyPath)) {
      fs.unlinkSync(legacyPath)
    }
  } catch {}
}

function seedOfficeProfileIfNeeded(profilesDir: string) {
  try {
    const files = fs.readdirSync(profilesDir).filter(f => f.endsWith('.json') && f !== 'profiles_meta.json')
    const hasOffice = files.some(f => f.toLowerCase().includes('office') || f.toLowerCase().includes('work') || f.toLowerCase().includes('aviabasa'))
    if (!hasOffice) {
      const candidates = [
        path.join(app.getAppPath(), 'Configs', 'work_aviabasa.json'),
        path.join(process.resourcesPath, 'Configs', 'work_aviabasa.json'),
        path.resolve('Configs', 'work_aviabasa.json'),
        path.join(__dirname, '..', 'Configs', 'work_aviabasa.json')
      ]
      for (const cand of candidates) {
        if (fs.existsSync(cand)) {
          const dest = path.join(profilesDir, 'work_aviabasa.json')
          fs.copyFileSync(cand, dest)
          saveProfileMeta('work_aviabasa', { name: 'Корпоративный (Aviabasa)', mode: 'office' })
          break
        }
      }
    }
  } catch {}
}

function getProfilesList(filterMode?: AppMode): ConfigProfile[] {
  const profilesDir = getProfilesDir()
  const settings = loadSettings()
  const currentMode = filterMode || settings.appMode || 'home'
  const activeId = settings.activeProfileIdByMode?.[currentMode] || settings.activeProfileId
  const meta = loadProfileMeta()

  seedOfficeProfileIfNeeded(profilesDir)

  const files = fs.readdirSync(profilesDir).filter(f => f.endsWith('.json') && f !== 'default.json' && f !== 'profiles_meta.json')
  const profiles: ConfigProfile[] = []

  for (const file of files) {
    const fullPath = path.join(profilesDir, file)
    const id = path.basename(file, '.json')
    let name = meta[id]?.name || id.replace(/[-_]/g, ' ')
    let mode: AppMode = meta[id]?.mode || (id.toLowerCase().includes('office') || id.toLowerCase().includes('work') || id.toLowerCase().includes('aviabasa') ? 'office' : 'home')
    
    let createdAt = Date.now()
    try {
      createdAt = fs.statSync(fullPath).birthtimeMs
    } catch {}

    profiles.push({
      id,
      name,
      filename: file,
      path: fullPath,
      createdAt,
      isActive: id === activeId,
      mode
    })
  }

  const filtered = filterMode ? profiles.filter(p => p.mode === filterMode) : profiles

  if (filtered.length > 0 && !filtered.some(p => p.isActive)) {
    filtered[0].isActive = true
    const updatedMap = { ...(settings.activeProfileIdByMode || {}), [currentMode]: filtered[0].id }
    saveSettings({ activeProfileId: filtered[0].id, activeProfileIdByMode: updatedMap })
  }

  return filtered.sort((a, b) => b.createdAt - a.createdAt)
}

function getActiveProfile(): ConfigProfile | null {
  const settings = loadSettings()
  const currentMode = settings.appMode || 'home'
  const list = getProfilesList(currentMode)
  if (list.length === 0) {
    const all = getProfilesList()
    return all.length > 0 ? all[0] : null
  }
  const modeActiveId = settings.activeProfileIdByMode?.[currentMode] || settings.activeProfileId
  return list.find(p => p.id === modeActiveId) || list[0]
}

async function performSystemAudit(): Promise<AuditDiagnosisResult> {
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

  // 1. Test connection to VPS (89.124.94.246:443)
  try {
    const startTime = Date.now()
    await new Promise<void>((resolve, reject) => {
      const socket = net.createConnection({ host: '89.124.94.246', port: 443, timeout: 2500 }, () => {
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
    const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-Command', psScript])
    if (stdout.trim()) {
      const parsed = JSON.parse(stdout.trim())
      result.hostname = parsed.Hostname || result.hostname
      result.currentUser = parsed.CurrentUser || result.currentUser
      result.isAdministrator = Boolean(parsed.IsAdmin)
      result.domainJoined = Boolean(parsed.DomainJoined)
      result.domainName = parsed.DomainName || result.domainName
      result.defaultGateway = parsed.DefaultGateway || ''
      result.ipAddress = parsed.IpAddress || ''
      result.dnsServers = Array.isArray(parsed.DnsServers) ? parsed.DnsServers : (parsed.DnsServers ? [parsed.DnsServers] : [])
      result.dnsSuffixes = Array.isArray(parsed.DnsSuffixes) ? parsed.DnsSuffixes : (parsed.DnsSuffixes ? [parsed.DnsSuffixes] : [])
      result.domainControllers = Array.isArray(parsed.DomainControllers) ? parsed.DomainControllers.map((d: any) => ({ name: d.Name || '', ip: d.IP || '' })) : []
    }
  } catch (err: any) {
    addLog(`Диагностика системы (предупреждение): ${err.message}`, 'warn')
  }

  // 3. Verdict
  if (result.domainJoined || result.domainControllers.length > 0 || (result.dnsSuffixes.length > 0 && !result.dnsSuffixes.includes('localdomain'))) {
    result.recommendedMode = 'office'
    result.recommendationReason = `Обнаружен корпоративный домен (${result.domainName}). Включен режим «Офис», чтобы защитить Active Directory и связь с серверами компании.`
  } else {
    result.recommendedMode = 'home'
    result.recommendationReason = `Корпоративный домен не обнаружен. Рекомендуется режим «Дом» для максимальной анонимности Resident Shield.`
  }

  return result
}

// ============================================================
// Sing-box Binary Resolver
// ============================================================
function getSingBoxBinaryPath(): { exePath: string; dir: string } | null {
  const candidates = [
    'C:\\sing-box',
    path.join(process.resourcesPath, 'sing-box'),
    path.join(app.getAppPath(), 'sing-box'),
    path.join(__dirname, '..', 'sing-box'),
    path.resolve('sing-box')
  ]

  for (const candidate of candidates) {
    const exe = path.join(candidate, 'sing-box.exe')
    if (fs.existsSync(exe)) {
      return { exePath: exe, dir: candidate }
    }
  }

  addLog(`sing-box.exe НЕ найден в директориях поиска!`, 'error')
  return null
}

// ============================================================
// Native Process Detection
// ============================================================
async function checkIsProcessRunning(): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync('tasklist.exe', [
      '/FI', 'IMAGENAME eq sing-box.exe',
      '/FO', 'CSV',
      '/NH'
    ])
    return stdout.toLowerCase().includes('sing-box.exe')
  } catch {
    return false
  }
}

// ============================================================
// Timezone Management (tzutil.exe)
// ============================================================
async function getSystemTimezone(): Promise<string> {
  try {
    const { stdout } = await execFileAsync('tzutil.exe', ['/g'])
    return stdout.trim()
  } catch (err) {
    return 'Unknown'
  }
}

async function setSystemTimezone(zoneId: string): Promise<boolean> {
  try {
    await execFileAsync('tzutil.exe', ['/s', zoneId])
    addLog(`Часовой пояс изменён → ${zoneId}`, 'success')
    return true
  } catch (err: any) {
    try {
      await execFileAsync('powershell.exe', [
        '-NoProfile', '-Command',
        `Set-TimeZone -Id '${zoneId}'`
      ])
      addLog(`Часовой пояс изменён (PS) → ${zoneId}`, 'success')
      return true
    } catch (psErr: any) {
      addLog(`Ошибка смены часового пояса: ${psErr.message || err.message}`, 'warn')
      return false
    }
  }
}

// ============================================================
// Dynamic Physical Adapter Discovery & Anti-Leak Lockdown
// ============================================================
async function getPhysicalAdapters(): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync('powershell.exe', [
      '-NoProfile', '-Command',
      '(Get-NetAdapter -Physical | Where-Object Status -eq Up).Name'
    ])
    const names = stdout.trim().split(/\r?\n/).map(s => s.trim()).filter(Boolean)
    if (names.length > 0) return names

    const fallback = await execFileAsync('powershell.exe', [
      '-NoProfile', '-Command',
      '(Get-NetAdapter | Where-Object Status -eq Up | Where-Object InterfaceDescription -notmatch "sing-box|Wintun|TAP|Virtual|Hyper-V").Name'
    ])
    const fallbackNames = fallback.stdout.trim().split(/\r?\n/).map(s => s.trim()).filter(Boolean)
    return fallbackNames.length > 0 ? fallbackNames : ['Ethernet', 'Ethernet 2', 'Wi-Fi']
  } catch {
    return ['Ethernet', 'Ethernet 2', 'Wi-Fi']
  }
}

async function applyAntiLeakLockdown(): Promise<void> {
  addLog('Применение защиты от утечек DNS и изоляции IPv6...', 'info')
  const adapters = await getPhysicalAdapters()

  for (const name of adapters) {
    // 1. Disable IPv6 on physical adapter (keeps ::1 loopback in kernel intact)
    try {
      await execFileAsync('powershell.exe', [
        '-NoProfile', '-Command',
        `Disable-NetAdapterBinding -Name '${name}' -ComponentID ms_tcpip6 -ErrorAction SilentlyContinue`
      ])
    } catch {}

    // 2. Set loopback stub on physical adapter so Windows NEVER queries ISP directly past TUN
    try {
      await execFileAsync('powershell.exe', [
        '-NoProfile', '-Command',
        `Set-DnsClientServerAddress -InterfaceAlias '${name}' -ServerAddresses ("127.0.0.1") -ErrorAction SilentlyContinue`
      ])
    } catch {}
  }

  // 3. Disable Smart Multi-Homed Name Resolution (SMHNR) & Parallel A/AAAA
  try {
    await execFileAsync('powershell.exe', [
      '-NoProfile', '-Command',
      `Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows NT\\DNSClient" -Name "DisableSmartNameResolution" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue; Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters" -Name "DisableParallelAandAAAA" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue`
    ])
  } catch {}

  // 4. Flush DNS cache
  try {
    await execFileAsync('ipconfig.exe', ['/flushdns'])
  } catch {}

  addLog(`✓ Защита от утечек DNS активна для адаптеров: [${adapters.join(', ')}].`, 'success')
}

async function restoreRegularNetwork(): Promise<void> {
  addLog('Восстановление стандартных настроек DNS и сетевых адаптеров...', 'info')
  const adapters = await getPhysicalAdapters()

  for (const name of adapters) {
    // 1. Reset physical adapter DNS back to DHCP / automatic ISP DNS
    try {
      await execFileAsync('powershell.exe', [
        '-NoProfile', '-Command',
        `Set-DnsClientServerAddress -InterfaceAlias '${name}' -ResetServerAddresses -ErrorAction SilentlyContinue`
      ])
    } catch {}

    // 2. Re-enable IPv6 on physical adapter
    try {
      await execFileAsync('powershell.exe', [
        '-NoProfile', '-Command',
        `Enable-NetAdapterBinding -Name '${name}' -ComponentID ms_tcpip6 -ErrorAction SilentlyContinue`
      ])
    } catch {}

    // 3. Restore Automatic Metric on physical adapter
    try {
      await execFileAsync('powershell.exe', [
        '-NoProfile', '-Command',
        `Set-NetIPInterface -InterfaceAlias '${name}' -AddressFamily IPv4 -AutomaticMetric Enabled -ErrorAction SilentlyContinue; Set-NetIPInterface -InterfaceAlias '${name}' -AddressFamily IPv6 -AutomaticMetric Enabled -ErrorAction SilentlyContinue`
      ])
    } catch {}
  }

  // 4. Flush DNS cache
  try {
    await execFileAsync('ipconfig.exe', ['/flushdns'])
  } catch {}

  addLog('✓ Сетевой стек и DNS восстановлены в штатный режим.', 'success')
}

// ============================================================
// Geolocation Service (lfsvc) & Windows Location Shield
// ============================================================
async function getLfsvcStatus(): Promise<'Running' | 'Stopped' | 'Stopping' | 'Starting' | 'Unknown'> {
  try {
    const { stdout } = await execFileAsync('sc.exe', ['query', 'lfsvc'])
    const upper = stdout.toUpperCase()
    if (upper.includes('RUNNING')) return 'Running'
    if (upper.includes('STOPPED')) return 'Stopped'
    if (upper.includes('STOP_PENDING')) return 'Stopping'
    if (upper.includes('START_PENDING')) return 'Starting'
    return 'Unknown'
  } catch {
    return 'Stopped'
  }
}

async function stopLfsvc(): Promise<boolean> {
  addLog('Блокировка службы геолокации Windows (lfsvc) и реестра...', 'info')
  try {
    try {
      await execFileAsync('reg.exe', [
        'add',
        'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\location',
        '/v', 'Value',
        '/t', 'REG_SZ',
        '/d', 'Deny',
        '/f'
      ])
    } catch {}

    try {
      await execFileAsync('sc.exe', ['stop', 'lfsvc'])
    } catch {}

    try {
      await execFileAsync('net.exe', ['stop', 'lfsvc', '/y'])
    } catch {}

    try {
      await execFileAsync('sc.exe', ['config', 'lfsvc', 'start=', 'disabled'])
    } catch {}

    try {
      await execFileAsync('powershell.exe', [
        '-NoProfile', '-Command',
        'Stop-Service -Name lfsvc -Force -ErrorAction SilentlyContinue'
      ])
    } catch {}

    await new Promise(r => setTimeout(r, 600))
    const finalStatus = await getLfsvcStatus()
    if (finalStatus === 'Stopped') {
      addLog('Служба геолокации (lfsvc) успешно заблокирована.', 'success')
      return true
    } else {
      addLog(`Служба lfsvc: статус [${finalStatus}]. Доступ к координатам заблокирован в реестре.`, 'info')
      return true
    }
  } catch (err: any) {
    addLog(`Предупреждение блокировки lfsvc: ${err.message || err}`, 'warn')
    return true
  }
}

async function startLfsvc(): Promise<boolean> {
  try {
    try {
      await execFileAsync('reg.exe', [
        'add',
        'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\location',
        '/v', 'Value',
        '/t', 'REG_SZ',
        '/d', 'Allow',
        '/f'
      ])
    } catch {}

    try {
      await execFileAsync('sc.exe', ['config', 'lfsvc', 'start=', 'demand'])
    } catch {}

    try {
      await execFileAsync('sc.exe', ['start', 'lfsvc'])
    } catch {}

    addLog('Служба геолокации Windows (lfsvc) восстановлена.', 'success')
    return true
  } catch (err: any) {
    addLog(`Предупреждение восстановления lfsvc: ${err.message || err}`, 'warn')
    return false
  }
}

// ============================================================
// Full Status Aggregator
// ============================================================
// Full Status Aggregator
// ============================================================
async function getFullStatus() {
  const isRunning = await checkIsProcessRunning()
  const currentZone = await getSystemTimezone()
  const lfsvcStatus = await getLfsvcStatus()
  const activeProfile = getActiveProfile()
  const settings = loadSettings()

  if (isRunning && !appStartTime) {
    appStartTime = Date.now()
  } else if (!isRunning) {
    appStartTime = null
  }

  const uptimeSeconds = appStartTime ? Math.floor((Date.now() - appStartTime) / 1000) : 0

  return {
    isRunning,
    currentZone,
    lfsvcStatus,
    uptimeSeconds,
    startTime: appStartTime || undefined,
    activeProfileName: activeProfile?.name || undefined,
    appMode: settings.appMode || 'home'
  }
}

// ============================================================
// Sing-box Process Runner
// ============================================================
function parseSingBoxLine(line: string) {
  const clean = stripAnsi(line)
  if (!clean) return

  let logType: 'info' | 'warn' | 'error' | 'success' = 'info'
  const upper = clean.toUpperCase()

  if (upper.includes('FATAL') || upper.includes('ERROR') || upper.includes('ACCESS IS DENIED')) {
    logType = 'error'
  } else if (upper.includes('WARN')) {
    logType = 'warn'
  } else if (upper.includes('STARTED') || upper.includes('CONNECTED')) {
    logType = 'success'
  }

  addLog(`[sing-box] ${clean}`, logType)
}

async function startSingBox(): Promise<boolean> {
  const binary = getSingBoxBinaryPath()
  if (!binary) {
    addLog('Исполняемый файл sing-box.exe не найден!', 'error')
    return false
  }

  const activeProfile = getActiveProfile()
  if (!activeProfile || !fs.existsSync(activeProfile.path)) {
    addLog('Конфигурация не выбрана! Пожалуйста, добавьте .json конфиг через менеджер профилей.', 'error')
    return false
  }

  const isAdmin = await checkIsAdmin()
  addLog(`Запуск sing-box [Профиль: "${activeProfile.name}", UAC Admin: ${isAdmin ? 'ДА' : 'НЕТ'}]...`, 'info')

  if (!isAdmin) {
    addLog('Запуск sing-box через UAC elevation для создания сетевого адаптера TUN...', 'info')
    try {
      await execFileAsync('powershell.exe', [
        '-NoProfile', '-Command',
        `Start-Process -FilePath '${binary.exePath}' -ArgumentList 'run', '-c', '\"${activeProfile.path}\"' -WorkingDirectory '${binary.dir}' -Verb RunAs -WindowStyle Hidden`
      ])

      for (let i = 0; i < 6; i++) {
        await new Promise(r => setTimeout(r, 500))
        if (await checkIsProcessRunning()) {
          addLog(`Процесс sing-box успешно запущен с профилем "${activeProfile.name}".`, 'success')
          return true
        }
      }
      addLog('sing-box не запустился. Проверьте валидность .json конфига или запрос прав UAC.', 'error')
      return false
    } catch (err: any) {
      addLog(`Ошибка запуска с повышением прав: ${err.message}`, 'error')
      return false
    }
  }

  return new Promise((resolve) => {
    try {
      const child = spawn(binary.exePath, ['run', '-c', activeProfile.path], {
        cwd: binary.dir,
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true
      })

      child.stdout?.on('data', (data: Buffer) => {
        data.toString().split('\n').forEach(parseSingBoxLine)
      })

      child.stderr?.on('data', (data: Buffer) => {
        data.toString().split('\n').forEach(parseSingBoxLine)
      })

      child.on('error', (err) => {
        addLog(`Ошибка запуска процесса sing-box: ${err.message}`, 'error')
        showNotification('Exilium Switch', `Ошибка запуска sing-box: ${err.message}`, true)
        singBoxProcess = null
        resolve(false)
      })

      child.on('exit', (code) => {
        if (code !== null && code !== 0) {
          addLog(`Процесс sing-box завершился аварийно (код=${code})`, 'error')
          showNotification('Exilium Switch', 'Процесс ядра sing-box был неожиданно прерван.', true)
        }
        singBoxProcess = null
      })

      child.unref()
      singBoxProcess = child

      setTimeout(async () => {
        const alive = await checkIsProcessRunning()
        if (alive) {
          addLog(`sing-box активен (PID: ${child.pid}, Профиль: "${activeProfile.name}").`, 'success')
          resolve(true)
        } else {
          addLog('sing-box завершился сразу после старта. Проверьте JSON-конфиг на ошибки.', 'error')
          singBoxProcess = null
          resolve(false)
        }
      }, 1500)
    } catch (err: any) {
      addLog(`Исключение при старте sing-box: ${err.message}`, 'error')
      resolve(false)
    }
  })
}

async function stopSingBox(): Promise<boolean> {
  addLog('Остановка процесса sing-box...', 'info')

  if (singBoxProcess && !singBoxProcess.killed) {
    try {
      singBoxProcess.kill('SIGTERM')
    } catch {}
  }

  try {
    await execFileAsync('taskkill.exe', ['/F', '/IM', 'sing-box.exe', '/T'])
  } catch {}

  singBoxProcess = null
  await new Promise(r => setTimeout(r, 600))

  const stillRunning = await checkIsProcessRunning()
  if (stillRunning) {
    try {
      await execFileAsync('powershell.exe', [
        '-NoProfile', '-Command',
        'Stop-Process -Name sing-box -Force -ErrorAction SilentlyContinue'
      ])
    } catch {}
  }

  const finalCheck = await checkIsProcessRunning()
  if (!finalCheck) {
    addLog('Процесс sing-box успешно остановлен.', 'info')
    return true
  } else {
    addLog('Предупреждение: процесс sing-box не отвечает на сигналы остановки.', 'warn')
    return false
  }
}

// ============================================================
// Resident Mode Orchestration
// ============================================================
async function enableResidentMode(): Promise<{ success: boolean; error?: string }> {
  if (isToggling) return { success: false, error: 'Операция уже выполняется' }
  isToggling = true

  try {
    const settings = loadSettings()
    const isOffice = settings.appMode === 'office'
    addLog(`━━━ АКТИВАЦИЯ ТУННЕЛЯ [${isOffice ? 'РЕЖИМ ОФИС' : 'RESIDENT SHIELD (Amsterdam)'}] ━━━`, 'info')

    const activeProfile = getActiveProfile()
    if (!activeProfile) {
      addLog('Отсутствует профиль конфигурации! Добавьте .json конфиг перед запуском.', 'error')
      showNotification('Exilium Switch', 'Пожалуйста, добавьте .json конфигурацию перед запуском.')
      return { success: false, error: 'Сначала добавьте .json конфиг' }
    }

    const alreadyRunning = await checkIsProcessRunning()
    if (alreadyRunning) {
      addLog('sing-box уже запущен.', 'info')
      appStartTime = appStartTime || Date.now()
      await updateStatusBroadcast()
      return { success: true }
    }

    if (!isOffice) {
      // Step 1: Spoof Timezone to W. Europe Standard Time (Amsterdam)
      addLog(`[1/4] Маскировка часового пояса → ${settings.fakeZone}`, 'info')
      await setSystemTimezone(settings.fakeZone)

      // Step 2: Location Guard
      addLog('[2/4] Блокировка службы геолокации Windows...', 'info')
      await stopLfsvc()

      // Step 3: Anti-Leak Lockdown (SMHNR, Loopback DNS, IPv6 Isolation)
      addLog('[3/4] Применение анти-утечки DNS и IPv6...', 'info')
      await applyAntiLeakLockdown()

      // Step 4: Launch sing-box Core
      addLog(`[4/4] Запуск ядра sing-box [${activeProfile.name}]...`, 'info')
    } else {
      addLog(`[1/1] Запуск ядра sing-box в режиме «Офис» [${activeProfile.name}] (сетевые адаптеры ОС не изменяются)...`, 'info')
    }

    const started = await startSingBox()

    if (started) {
      appStartTime = Date.now()
      if (isOffice) {
        addLog('✓ OFFICE TUNNEL АКТИВЕН (Корпоративный сплит-туннель активен)', 'success')
        showNotification(
          'Exilium Switch — Режим Офис',
          `Офисный сплит-туннель включен [${activeProfile.name}]. Домен и локальная сеть защищены.`
        )
      } else {
        addLog('✓ RESIDENT SHIELD АКТИВЕН (Amsterdam / NL Resident Masking Active)', 'success')
        showNotification(
          'Exilium Switch — Защита активна',
          `Resident Shield включен [${activeProfile.name}]. Часовой пояс, DNS и геолокация защищены.`
        )
      }
      await updateStatusBroadcast()
      return { success: true }
    } else {
      addLog('✗ Ошибка старта sing-box — откат...', 'error')
      if (!isOffice) {
        await setSystemTimezone(settings.realZone)
        await startLfsvc()
        await restoreRegularNetwork()
      }
      showNotification('Exilium Switch — Ошибка старта', 'Не удалось запустить sing-box.', true)
      await updateStatusBroadcast()
      return { success: false, error: 'sing-box start failed' }
    }
  } finally {
    isToggling = false
  }
}

async function disableResidentMode(): Promise<{ success: boolean; error?: string }> {
  if (isToggling) return { success: false, error: 'Операция уже выполняется' }
  isToggling = true

  try {
    const settings = loadSettings()
    const isOffice = settings.appMode === 'office'
    addLog(`━━━ ДЕАКТИВАЦИЯ [${isOffice ? 'РЕЖИМ ОФИС' : 'RESIDENT SHIELD'}] ━━━`, 'info')

    // Step 1: Stop sing-box
    addLog('[1/1] Остановка ядра sing-box...', 'info')
    await stopSingBox()

    if (!isOffice) {
      // Step 2: Restore Real Timezone
      addLog(`[2/4] Восстановление часового пояса → ${settings.realZone}`, 'info')
      await setSystemTimezone(settings.realZone)

      // Step 3: Restore Location Service
      addLog('[3/4] Восстановление службы геолокации Windows...', 'info')
      await startLfsvc()

      // Step 4: Restore Physical DNS & IPv6
      addLog('[4/4] Восстановление стандартного DNS и сетевых интерфейсов...', 'info')
      await restoreRegularNetwork()
    } else {
      addLog('✓ Офисный режим отключен. Параметры сетевых карт сохранены без изменений.', 'success')
    }

    appStartTime = null
    showNotification(
      'Exilium Switch — Отключено',
      isOffice ? 'Туннель отключен. Сетевые настройки не изменялись.' : 'Resident Shield выключен. Настройки сети восстановлены.'
    )
    await updateStatusBroadcast()
    return { success: true }
  } finally {
    isToggling = false
  }
}

// ============================================================
// Broadcast & Tray Menu
// ============================================================
async function updateStatusBroadcast() {
  const status = await getFullStatus()
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('status-updated', status)
  }
  updateTrayMenu(status.isRunning)
}

// ============================================================
// Stable, Low-Jitter European Ping (Dual-Sample Min Filter)
// ============================================================
function testAmsterdamLatency(): Promise<number | null> {
  return new Promise(async (resolve) => {
    const singlePing = (url: string) => new Promise<number | null>((res) => {
      const start = Date.now()
      const req = http.get(url, { timeout: 2500, agent: new http.Agent({ keepAlive: true }) }, (response) => {
        const rtt = Date.now() - start
        response.resume()
        res(rtt)
      })
      req.on('error', () => res(null))
      req.on('timeout', () => {
        req.destroy()
        res(null)
      })
    })

    const p1 = await singlePing('http://cp.cloudflare.com/generate_204')
    const p2 = await singlePing('http://cp.cloudflare.com/generate_204')

    const valid = [p1, p2].filter((v): v is number => v !== null && v > 0)
    if (valid.length > 0) {
      resolve(Math.min(...valid))
    } else {
      resolve(null)
    }
  })
}

// ============================================================
// Window & Tray Management
// ============================================================
function createTray() {
  try {
    const appIcon = getAppIcon()
    tray = new Tray(appIcon.resize({ width: 24, height: 24 }))
    tray.setToolTip('Exilium Switch — Resident Shield (by Nostro)')

    const showWindow = () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isMinimized()) mainWindow.restore()
        if (!mainWindow.isVisible()) mainWindow.show()
        mainWindow.focus()
      } else {
        createWindow()
      }
    }

    tray.on('click', showWindow)
    tray.on('double-click', showWindow)
    updateTrayMenu(false)
  } catch (err) {
    addLog(`Ошибка создания трея: ${err}`, 'error')
  }
}

function updateTrayMenu(isRunning: boolean) {
  if (!tray) return

  const activeProfile = getActiveProfile()
  const profileLabel = activeProfile ? `Профиль: ${activeProfile.name}` : 'Профиль: (не выбран)'

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Exilium Switch v1.3 (by Nostro)', enabled: false },
    { type: 'separator' },
    {
      label: isRunning ? '● Resident Mode: ВКЛЮЧЕН' : '○ Resident Mode: ВЫКЛЮЧЕН',
      enabled: false
    },
    {
      label: profileLabel,
      enabled: false
    },
    { type: 'separator' },
    {
      label: isRunning ? 'Отключить Resident Shield' : 'Включить Resident Shield',
      click: async () => {
        if (isRunning) await disableResidentMode()
        else await enableResidentMode()
      }
    },
    { type: 'separator' },
    {
      label: 'Открыть панель управления',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          if (mainWindow.isMinimized()) mainWindow.restore()
          if (!mainWindow.isVisible()) mainWindow.show()
          mainWindow.focus()
        } else {
          createWindow()
        }
      }
    },
    {
      label: 'Выход',
      click: () => {
        isQuitting = true
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)
  tray.setToolTip(`Exilium Switch v1.3: ${isRunning ? '● Защищен' : '○ Ожидание'} [${activeProfile?.name || 'Нет профиля'}]`)
}

function shouldStartHiddenOnLaunch(): boolean {
  if (process.argv.includes('--hidden') || process.argv.includes('--minimized')) {
    return true
  }
  const settings = loadSettings()
  return Boolean(settings.startMinimized)
}

function createWindow() {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      if (!mainWindow.isVisible()) mainWindow.show()
      mainWindow.focus()
      return
    }

    const startHidden = shouldStartHiddenOnLaunch()

    let preloadPath = path.join(__dirname, 'preload.cjs')
    if (!fs.existsSync(preloadPath)) {
      preloadPath = path.join(app.getAppPath(), 'dist-electron', 'preload.cjs')
    }
    if (!fs.existsSync(preloadPath)) {
      preloadPath = path.join(__dirname, 'preload.js')
    }

    const appIcon = getAppIcon()

    mainWindow = new BrowserWindow({
      width: 450,
      height: 740,
      minWidth: 420,
      minHeight: 680,
      frame: false,
      show: !startHidden,
      center: true,
      icon: appIcon,
      backgroundColor: '#09090b',
      resizable: false,
      maximizable: false,
      webPreferences: {
        preload: preloadPath,
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false
      }
    })

    const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

    if (isDev && process.env.VITE_DEV_SERVER_URL) {
      mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    } else {
      let htmlPath = path.join(__dirname, '../dist/index.html')
      if (!fs.existsSync(htmlPath)) {
        htmlPath = path.join(app.getAppPath(), 'dist', 'index.html')
      }
      mainWindow.loadFile(htmlPath).catch((err) => {
        addLog(`Не удалось загрузить index.html: ${err}`, 'error')
      })
    }

    mainWindow.webContents.on('did-finish-load', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (!startHidden) {
          mainWindow.show()
          mainWindow.focus()
        }
      }
      addLog('Интерфейс Exilium Switch v1.3 успешно загружен.', 'info')
    })

    mainWindow.on('close', (event) => {
      const settings = loadSettings()
      if (settings.minimizeToTray && !isQuitting) {
        event.preventDefault()
        mainWindow?.hide()
      }
    })
  } catch (err) {
    addLog(`createWindow exception: ${err}`, 'error')
  }
}

// Second Instance Lock Handler
app.on('second-instance', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    if (!mainWindow.isVisible()) mainWindow.show()
    mainWindow.focus()
  } else {
    createWindow()
  }
})

// ============================================================
// Lifecycle & IPC Handlers
// ============================================================
app.whenReady().then(async () => {
  ensureCachedIcons()
  initSessionLogger()
  purgeLegacyDefaultProfile()
  registerWindowsIntegration()

  const currentSettings = loadSettings()
  applyAutoStartSetting(currentSettings.autoStart, currentSettings.startMinimized)

  createTray()
  createWindow()

  // IPC: Status & Toggle
  ipcMain.handle('get-status', async () => getFullStatus())

  ipcMain.handle('toggle-vpn', async (_event, targetState?: boolean) => {
    const isCurrentlyRunning = await checkIsProcessRunning()
    const shouldRun = targetState !== undefined ? targetState : !isCurrentlyRunning

    if (shouldRun && !isCurrentlyRunning) {
      const res = await enableResidentMode()
      const finalState = await checkIsProcessRunning()
      return { success: res.success, isRunning: finalState, error: res.error }
    } else if (!shouldRun && isCurrentlyRunning) {
      const res = await disableResidentMode()
      const finalState = await checkIsProcessRunning()
      return { success: res.success, isRunning: finalState, error: res.error }
    } else {
      return { success: true, isRunning: isCurrentlyRunning }
    }
  })

  // IPC: Settings
  ipcMain.handle('get-settings', () => loadSettings())
  ipcMain.handle('save-settings', (_event, newSettings) => saveSettings(newSettings))

  // IPC: Latency Test
  ipcMain.handle('test-latency', async () => {
    addLog('Замер задержки через туннель до европейского узла...', 'info')
    const latency = await testAmsterdamLatency()
    if (latency !== null) {
      addLog(`Пинг: ${latency} ms`, 'success')
    } else {
      addLog('Пинг: превышен таймаут ответа', 'warn')
    }
    return { latencyMs: latency }
  })

  // IPC: Logs
  ipcMain.handle('get-recent-logs', () => logsBuffer)

  // IPC: Export Full Session Logs
  ipcMain.handle('export-logs', async () => {
    try {
      if (!mainWindow) return { success: false, error: 'Окно приложения недоступно' }
      const dateStr = new Date().toISOString().slice(0, 10)
      const saveResult = await dialog.showSaveDialog(mainWindow, {
        title: 'Экспорт полного лога сессии Exilium Switch',
        defaultPath: `exilium-logs-${dateStr}.log`,
        filters: [{ name: 'Log Files', extensions: ['log', 'txt'] }]
      })

      if (saveResult.canceled || !saveResult.filePath) {
        return { success: false, error: 'Отменено пользователем' }
      }

      if (fs.existsSync(sessionLogFilePath)) {
        fs.copyFileSync(sessionLogFilePath, saveResult.filePath)
        addLog(`Полный лог сессии экспортирован: ${saveResult.filePath}`, 'success')
        return { success: true, savedPath: saveResult.filePath }
      } else {
        const content = logsBuffer.map(l => `[${l.time}] [${l.type.toUpperCase()}] ${l.text}`).join('\n')
        fs.writeFileSync(saveResult.filePath, content, 'utf-8')
        addLog(`Логи сессии сохранены: ${saveResult.filePath}`, 'success')
        return { success: true, savedPath: saveResult.filePath }
      }
    } catch (err: any) {
      addLog(`Ошибка экспорта логов: ${err.message}`, 'error')
      return { success: false, error: err.message }
    }
  })

  // IPC: Open Logs Folder
  ipcMain.handle('open-logs-folder', async () => {
    try {
      const logsDir = path.join(app.getPath('userData'), 'logs')
      if (fs.existsSync(logsDir)) {
        await shell.openPath(logsDir)
      }
    } catch {}
  })

  // IPC: Mode Switching
  ipcMain.handle('set-app-mode', async (_event, mode: AppMode) => {
    try {
      const isRunning = await checkIsProcessRunning()
      if (isRunning) {
        return { success: false, error: 'Сначала отключите туннель перед сменой режима' }
      }
      saveSettings({ appMode: mode })
      const active = getActiveProfile()
      const modeName = mode === 'office' ? 'ОФИС' : (mode === 'gaming' ? 'ИГРЫ' : 'ДОМ')
      addLog(`Режим переключен: [${modeName}], активный профиль: "${active?.name || 'не выбран'}"`, 'info')
      await updateStatusBroadcast()
      return { success: true, mode }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // IPC: System Audit
  ipcMain.handle('run-system-audit', async () => {
    addLog('Запуск экспресс-диагностики системы и сети...', 'info')
    const diagnosis = await performSystemAudit()
    addLog(`Диагностика завершена: ${diagnosis.recommendationReason}`, 'success')
    return diagnosis
  })

  // IPC: Profile Management
  ipcMain.handle('get-profiles', (_event, mode?: AppMode) => getProfilesList(mode))

  ipcMain.handle('import-profile', async (_event, targetMode?: AppMode) => {
    try {
      if (!mainWindow) return { success: false, error: 'Окно недоступно' }
      const res = await dialog.showOpenDialog(mainWindow, {
        title: 'Выберите .json конфиг sing-box',
        filters: [{ name: 'sing-box Config (.json)', extensions: ['json'] }],
        properties: ['openFile']
      })

      if (res.canceled || !res.filePaths[0]) {
        return { success: false, error: 'Импорт отменен' }
      }

      const sourcePath = res.filePaths[0]
      const rawContent = fs.readFileSync(sourcePath, 'utf-8')

      // Validate JSON
      try {
        JSON.parse(rawContent)
      } catch {
        addLog(`Файл ${path.basename(sourcePath)} не является корректным JSON!`, 'error')
        return { success: false, error: 'Файл не является валидным JSON' }
      }

      const settings = loadSettings()
      const mode = targetMode || settings.appMode || 'home'
      const originalName = path.basename(sourcePath, '.json')
      const safeId = originalName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase() + '-' + Date.now().toString(36)
      const profilesDir = getProfilesDir()
      const destPath = path.join(profilesDir, `${safeId}.json`)

      fs.writeFileSync(destPath, rawContent, 'utf-8')

      saveProfileMeta(safeId, { name: originalName, mode })
      const updatedMap = { ...(settings.activeProfileIdByMode || {}), [mode]: safeId }
      saveSettings({ activeProfileId: safeId, activeProfileIdByMode: updatedMap })

      const newProfile: ConfigProfile = {
        id: safeId,
        name: originalName,
        filename: `${safeId}.json`,
        path: destPath,
        createdAt: Date.now(),
        isActive: true,
        mode
      }

      addLog(`Новый профиль "${originalName}" [${mode === 'office' ? 'Офис' : 'Дом'}] успешно импортирован!`, 'success')
      await updateStatusBroadcast()
      return { success: true, profile: newProfile }
    } catch (err: any) {
      addLog(`Ошибка импорта профиля: ${err.message}`, 'error')
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('import-vless-link', async (_event, rawLink: string, targetMode?: AppMode) => {
    try {
      const link = (rawLink || '').trim()
      if (!link) {
        return { success: false, error: 'Ссылка пустая' }
      }

      const settings = loadSettings()
      const mode = targetMode || settings.appMode || 'home'
      const { config, name } = convertVlessToSingBoxConfig(link, mode)
      const rawContent = JSON.stringify(config, null, 2)

      const safeId = name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase().slice(0, 32) + '-' + Date.now().toString(36)
      const profilesDir = getProfilesDir()
      const destPath = path.join(profilesDir, `${safeId}.json`)

      fs.writeFileSync(destPath, rawContent, 'utf-8')

      // Verify with sing-box binary
      const binary = getSingBoxBinaryPath()
      if (binary) {
        try {
          await execFileAsync(binary.exePath, ['check', '-c', destPath], { cwd: binary.dir })
        } catch (checkErr: any) {
          try { fs.unlinkSync(destPath) } catch {}
          addLog(`Ошибка валидации конфига: ${checkErr.message}`, 'error')
          return { success: false, error: `Конфиг не прошел валидацию ядра: ${checkErr.message}` }
        }
      }

      saveProfileMeta(safeId, { name, mode })
      const updatedMap = { ...(settings.activeProfileIdByMode || {}), [mode]: safeId }
      saveSettings({ activeProfileId: safeId, activeProfileIdByMode: updatedMap })

      const newProfile: ConfigProfile = {
        id: safeId,
        name: name,
        filename: `${safeId}.json`,
        path: destPath,
        createdAt: Date.now(),
        isActive: true,
        mode
      }

      addLog(`Профиль "${name}" успешно создан из VLESS-ссылки [${mode === 'office' ? 'Офис' : 'Дом'}]!`, 'success')
      await updateStatusBroadcast()
      return { success: true, profile: newProfile }
    } catch (err: any) {
      addLog(`Ошибка создания профиля из VLESS-ссылки: ${err.message}`, 'error')
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('select-profile', async (_event, profileId: string) => {
    try {
      const isRunning = await checkIsProcessRunning()
      if (isRunning) {
        return { success: false, error: 'Нельзя сменить профиль при активном туннеле. Сначала отключите его.' }
      }

      const profilesDir = getProfilesDir()
      const targetPath = path.join(profilesDir, `${profileId}.json`)
      if (!fs.existsSync(targetPath)) {
        return { success: false, error: 'Профиль не найден' }
      }

      const settings = loadSettings()
      const meta = loadProfileMeta()
      const profileMode = meta[profileId]?.mode || settings.appMode || 'home'
      const updatedMap = { ...(settings.activeProfileIdByMode || {}), [profileMode]: profileId }

      saveSettings({ activeProfileId: profileId, activeProfileIdByMode: updatedMap })
      const active = getActiveProfile()
      addLog(`Активный профиль переключен на: "${active?.name || profileId}"`, 'success')
      await updateStatusBroadcast()
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('delete-profile', async (_event, profileId: string) => {
    try {
      const isRunning = await checkIsProcessRunning()
      if (isRunning) {
        return { success: false, error: 'Нельзя удалять профили при включенном VPN' }
      }

      const profilesDir = getProfilesDir()
      const targetPath = path.join(profilesDir, `${profileId}.json`)
      if (fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath)
      }
      deleteProfileMeta(profileId)

      const settings = loadSettings()
      if (settings.activeProfileId === profileId) {
        const remaining = getProfilesList()
        saveSettings({ activeProfileId: remaining.length > 0 ? remaining[0].id : null })
      }

      addLog(`Профиль удален.`, 'info')
      await updateStatusBroadcast()
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // Window Controls
  ipcMain.on('window-minimize', () => { mainWindow?.minimize() })
  ipcMain.on('window-close', () => {
    const settings = loadSettings()
    if (settings.minimizeToTray) mainWindow?.hide()
    else {
      isQuitting = true
      app.quit()
    }
  })

  // Periodic Status Broadcast
  setInterval(async () => {
    await updateStatusBroadcast()
  }, 3500)

  // ============================================================
  // Auto Updater Handlers
  // ============================================================
  initAutoUpdater()
  if (app.isPackaged) {
    const runBackgroundUpdateCheck = () => {
      autoUpdater.checkForUpdates().catch((err) => {
        addLog(`[Updater] Фоновая проверка обновлений: ${err.message}`, 'warn')
      })
    }
    // Initial check after 5 seconds
    setTimeout(runBackgroundUpdateCheck, 5000)
    // Frequent background check every 60 seconds (1 minute)
    setInterval(runBackgroundUpdateCheck, 60 * 1000)
  }

  ipcMain.handle('updater:check', async () => {
    try {
      if (app.isPackaged) {
        addLog('[Updater] Ручной запуск проверки обновлений...', 'info')
        const result = await autoUpdater.checkForUpdates()
        return { success: true, updateAvailable: !!result?.updateInfo, version: result?.updateInfo?.version }
      } else {
        addLog('[Updater] Проверка обновлений отключена в режиме разработки (Dev mode).', 'info')
        return { success: true, updateAvailable: false, error: 'Dev mode' }
      }
    } catch (err: any) {
      addLog(`[Updater] Ошибка при проверке обновлений: ${err.message}`, 'warn')
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('updater:start-download', async () => {
    try {
      addLog('[Updater] Начат процесс загрузки обновления...', 'info')
      await autoUpdater.downloadUpdate()
      return { success: true }
    } catch (err: any) {
      addLog(`[Updater] Ошибка скачивания обновления: ${err.message}`, 'error')
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('get-app-version', () => app.getVersion())

  ipcMain.handle('updater:quit-and-install', async () => {
    try {
      addLog('[Updater] Запрос на установку обновления. Подготовка к безопасному перезапуску...', 'info')
      const isRunning = await checkIsProcessRunning()
      if (isRunning) {
        addLog('[Updater] Корректное отключение Resident Shield перед установкой...', 'info')
        await disableResidentMode()
      }
      isQuitting = true
      // isSilent: true (silent NSIS in-place update), isForceRunAfter: true (relaunches updated app)
      autoUpdater.quitAndInstall(true, true)
    } catch (err: any) {
      addLog(`[Updater] Ошибка перезапуска и установки: ${err.message}`, 'error')
    }
  })
})

// ============================================================
// Auto Updater Core Setup
// ============================================================
let lastNotifiedVersion: string | null = null

function getNotificationIconPath(): string {
  const possiblePaths = [
    path.join(__dirname, '../build/icon.png'),
    path.join(process.resourcesPath, 'build/icon.png'),
    path.join(process.resourcesPath, 'icon.png'),
    path.join(app.getAppPath(), 'build/icon.png')
  ]
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p
  }
  return ''
}

function initAutoUpdater() {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false

  try {
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'nostro1337',
      repo: 'Exilium-Switch'
    })
  } catch (err: any) {
    console.warn('[Updater] setFeedURL fallback notice:', err.message)
  }

  autoUpdater.on('checking-for-update', () => {
    addLog('[Updater] Проверка наличия обновлений на GitHub Releases...', 'info')
    mainWindow?.webContents.send('updater:checking')
  })

  autoUpdater.on('update-available', (info) => {
    addLog(`[Updater] Найдена новая версия: v${info.version}`, 'success')
    mainWindow?.webContents.send('updater:available', {
      version: info.version,
      releaseNotes: info.releaseNotes,
      releaseDate: info.releaseDate
    })

    // Show native Windows notification if not notified for this version yet
    if (lastNotifiedVersion !== info.version) {
      lastNotifiedVersion = info.version
      if (Notification.isSupported()) {
        try {
          const icon = getNotificationIconPath()
          const notification = new Notification({
            title: 'Доступно обновление Exilium Switch',
            body: `Вышла новая версия v${info.version}! Нажмите, чтобы открыть окно обновления.`,
            icon: icon || undefined
          })
          notification.on('click', () => {
            if (mainWindow) {
              if (mainWindow.isMinimized()) mainWindow.restore()
              mainWindow.show()
              mainWindow.focus()
              mainWindow.webContents.send('open-update-modal')
            }
          })
          notification.show()
        } catch (err: any) {
          console.warn('[Updater Notification Error]', err.message)
        }
      }
    }
  })

  autoUpdater.on('update-not-available', () => {
    addLog('[Updater] Установлена актуальная версия Exilium Switch.', 'info')
    mainWindow?.webContents.send('updater:not-available')
  })

  autoUpdater.on('error', (err) => {
    addLog(`[Updater] Ошибка модуля обновлений: ${err.message}`, 'warn')
    mainWindow?.webContents.send('updater:error', { message: err.message })
  })

  autoUpdater.on('download-progress', (progressObj) => {
    mainWindow?.webContents.send('updater:progress', {
      percent: Math.round(progressObj.percent),
      bytesPerSecond: progressObj.bytesPerSecond,
      transferred: progressObj.transferred,
      total: progressObj.total
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    addLog(`[Updater] Обновление v${info.version} успешно скачано и готово к установке.`, 'success')
    mainWindow?.webContents.send('updater:downloaded', {
      version: info.version,
      releaseNotes: info.releaseNotes,
      releaseDate: info.releaseDate
    })
  })
}

app.on('before-quit', () => {
  isQuitting = true
})

app.on('window-all-closed', () => {
  const settings = loadSettings()
  if (!settings.minimizeToTray || isQuitting) {
    app.quit()
  }
})

