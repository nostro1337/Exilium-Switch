import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, dialog, shell, Notification } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import http from 'node:http'
import { fileURLToPath } from 'node:url'
import { execFile, spawn, ChildProcess } from 'node:child_process'
import { promisify } from 'node:util'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const execFileAsync = promisify(execFile)

const APP_AUMID = 'com.nostro.exiliumswitch'
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
export interface AppSettings {
  realZone: string
  fakeZone: string
  autoStart: boolean
  minimizeToTray: boolean
  startMinimized: boolean
  activeProfileId?: string | null
}

export interface ConfigProfile {
  id: string
  name: string
  filename: string
  path: string
  createdAt: number
  isActive?: boolean
}

const DEFAULT_SETTINGS: AppSettings = {
  realZone: 'Tomsk Standard Time',
  fakeZone: 'W. Europe Standard Time',
  autoStart: false,
  minimizeToTray: true,
  startMinimized: false,
  activeProfileId: null
}

// ============================================================
// Application State & Logging
// ============================================================
let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let appStartTime: number | null = null
let singBoxProcess: ChildProcess | null = null
let isToggling = false

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
    sessionLogStream.write(`=== EXILIUM SWITCH v1.1 SESSION STARTED [${new Date().toISOString()}] (by Nostro) ===\n`)
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
// Windows Native Toast Notifications (Windows 10 & 11)
// ============================================================
function getAppIconPath(): string | undefined {
  const candidates = [
    path.join(process.resourcesPath, 'build', 'icon.png'),
    path.join(process.resourcesPath, 'build', 'icon.ico'),
    path.join(app.getAppPath(), 'build', 'icon.png'),
    path.join(app.getAppPath(), 'src', 'assets', 'ExiliumAppIcon.png'),
    path.resolve('build', 'icon.png'),
    path.resolve('ExiliumAppIcon.ico')
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  return undefined
}

// Ensure Windows 10 Action Center registration
function registerWindows10Notifications() {
  try {
    const exe = process.execPath
    const shortcutPath = path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Exilium Switch.lnk')
    if (!fs.existsSync(shortcutPath)) {
      execFile('powershell.exe', [
        '-NoProfile', '-Command',
        `$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('${shortcutPath}'); $s.TargetPath = '${exe}'; $s.Save()`
      ], () => {})
    }
  } catch {}
}

function showNotification(title: string, body: string, isUrgent = false) {
  try {
    const iconPath = getAppIconPath()
    if (Notification.isSupported()) {
      const notif = new Notification({
        title,
        body,
        icon: iconPath ? iconPath : getAppIcon(),
        urgency: isUrgent ? 'critical' : 'normal',
        silent: false
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
// Icon Resolution (ExiliumAppIcon.ico / .png)
// ============================================================
function getAppIcon() {
  const candidates = [
    path.join(process.resourcesPath, 'build', 'icon.ico'),
    path.join(process.resourcesPath, 'build', 'icon.png'),
    path.join(app.getAppPath(), 'src', 'assets', 'ExiliumAppIcon.png'),
    path.join(app.getAppPath(), 'build', 'icon.ico'),
    path.join(app.getAppPath(), 'build', 'icon.png'),
    path.join(app.getAppPath(), 'ExiliumAppIcon.ico'),
    path.join(__dirname, '..', 'src', 'assets', 'ExiliumAppIcon.png'),
    path.join(__dirname, '..', 'build', 'icon.ico'),
    path.resolve('build', 'icon.ico'),
    path.resolve('ExiliumAppIcon.ico')
  ]

  for (const cand of candidates) {
    if (fs.existsSync(cand)) {
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
// Settings Management
// ============================================================
function getSettingsPath(): string {
  return path.join(app.getPath('userData'), 'exilium_settings.json')
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
    app.setLoginItemSettings({
      openAtLogin: updated.autoStart,
      openAsHidden: updated.startMinimized
    })
    return updated
  } catch (err) {
    addLog(`Ошибка сохранения настроек: ${err}`, 'error')
    return loadSettings()
  }
}

// ============================================================
// Profile Management (100% User Managed, Zero Bundled Configs)
// ============================================================
function getProfilesDir(): string {
  const dir = path.join(app.getPath('userData'), 'profiles')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
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

function getProfilesList(): ConfigProfile[] {
  const profilesDir = getProfilesDir()
  const settings = loadSettings()
  const activeId = settings.activeProfileId

  const files = fs.readdirSync(profilesDir).filter(f => f.endsWith('.json') && f !== 'default.json')
  const profiles: ConfigProfile[] = []

  for (const file of files) {
    const fullPath = path.join(profilesDir, file)
    const id = path.basename(file, '.json')
    const name = id.replace(/[-_]/g, ' ')
    
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
      isActive: id === activeId
    })
  }

  if (!profiles.some(p => p.isActive) && profiles.length > 0) {
    profiles[0].isActive = true
    saveSettings({ activeProfileId: profiles[0].id })
  }

  return profiles.sort((a, b) => b.createdAt - a.createdAt)
}

function getActiveProfile(): ConfigProfile | null {
  const list = getProfilesList()
  if (list.length === 0) return null
  return list.find(p => p.isActive) || list[0]
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
async function getFullStatus() {
  const isRunning = await checkIsProcessRunning()
  const currentZone = await getSystemTimezone()
  const lfsvcStatus = await getLfsvcStatus()
  const activeProfile = getActiveProfile()

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
    activeProfileName: activeProfile?.name || undefined
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
    addLog('━━━ АКТИВАЦИЯ RESIDENT SHIELD (Amsterdam Mode) ━━━', 'info')

    const activeProfile = getActiveProfile()
    if (!activeProfile) {
      addLog('Отсутствует профиль конфигурации! Добавьте .json конфиг перед запуском.', 'error')
      showNotification('Exilium Switch', 'Пожалуйста, добавьте .json конфигурацию перед запуском Shield.')
      return { success: false, error: 'Сначала добавьте .json конфиг' }
    }

    const alreadyRunning = await checkIsProcessRunning()
    if (alreadyRunning) {
      addLog('sing-box уже запущен.', 'info')
      appStartTime = appStartTime || Date.now()
      await updateStatusBroadcast()
      return { success: true }
    }

    const settings = loadSettings()

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
    const started = await startSingBox()

    if (started) {
      appStartTime = Date.now()
      addLog('✓ RESIDENT SHIELD АКТИВЕН (Amsterdam / NL Resident Masking Active)', 'success')
      showNotification(
        'Exilium Switch — Защита активна',
        `Resident Shield включен [${activeProfile.name}]. Часовой пояс, DNS и геолокация защищены.`
      )
      await updateStatusBroadcast()
      return { success: true }
    } else {
      addLog('✗ Ошибка старта sing-box — откат системных настроек...', 'error')
      await setSystemTimezone(settings.realZone)
      await startLfsvc()
      await restoreRegularNetwork()
      showNotification('Exilium Switch — Ошибка старта', 'Не удалось запустить sing-box. Настройки сети восстановлены.', true)
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
    addLog('━━━ ДЕАКТИВАЦИЯ RESIDENT SHIELD ━━━', 'info')

    const settings = loadSettings()

    // Step 1: Stop sing-box
    addLog('[1/4] Остановка ядра sing-box...', 'info')
    await stopSingBox()

    // Step 2: Restore Real Timezone
    addLog(`[2/4] Восстановление часового пояса → ${settings.realZone}`, 'info')
    await setSystemTimezone(settings.realZone)

    // Step 3: Restore Location Service
    addLog('[3/4] Восстановление службы геолокации Windows...', 'info')
    await startLfsvc()

    // Step 4: Restore Physical DNS & IPv6
    addLog('[4/4] Восстановление стандартного DNS и сетевых интерфейсов...', 'info')
    await restoreRegularNetwork()

    appStartTime = null
    addLog('✓ Resident Mode отключен. Стандартный системный трафик и DNS восстановлены.', 'success')
    showNotification(
      'Exilium Switch — Защита отключена',
      'Resident Shield выключен. Стандартный системный трафик и DNS восстановлены.'
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
        mainWindow.show()
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
    { label: 'Exilium Switch v1.1 (by Nostro)', enabled: false },
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
          mainWindow.show()
          mainWindow.focus()
        } else {
          createWindow()
        }
      }
    },
    { label: 'Выход', click: () => app.exit(0) }
  ])

  tray.setContextMenu(contextMenu)
  tray.setToolTip(`Exilium Switch v1.1: ${isRunning ? '● Защищен' : '○ Ожидание'} [${activeProfile?.name || 'Нет профиля'}]`)
}

function createWindow() {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show()
      mainWindow.focus()
      return
    }

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
      show: true,
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
        mainWindow.show()
        mainWindow.focus()
      }
      addLog('Интерфейс Exilium Switch v1.1 успешно загружен.', 'info')
    })

    mainWindow.on('close', (event) => {
      const settings = loadSettings()
      if (settings.minimizeToTray) {
        event.preventDefault()
        mainWindow?.hide()
      }
    })
  } catch (err) {
    addLog(`createWindow exception: ${err}`, 'error')
  }
}

// ============================================================
// Lifecycle & IPC Handlers
// ============================================================
app.whenReady().then(async () => {
  initSessionLogger()
  purgeLegacyDefaultProfile()
  registerWindows10Notifications()

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

  // IPC: Profile Management
  ipcMain.handle('get-profiles', () => getProfilesList())

  ipcMain.handle('import-profile', async () => {
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

      const originalName = path.basename(sourcePath, '.json')
      const safeId = originalName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase() + '-' + Date.now().toString(36)
      const profilesDir = getProfilesDir()
      const destPath = path.join(profilesDir, `${safeId}.json`)

      fs.writeFileSync(destPath, rawContent, 'utf-8')

      saveSettings({ activeProfileId: safeId })

      const newProfile: ConfigProfile = {
        id: safeId,
        name: originalName,
        filename: `${safeId}.json`,
        path: destPath,
        createdAt: Date.now(),
        isActive: true
      }

      addLog(`Новый профиль "${originalName}" успешно импортирован!`, 'success')
      await updateStatusBroadcast()
      return { success: true, profile: newProfile }
    } catch (err: any) {
      addLog(`Ошибка импорта профиля: ${err.message}`, 'error')
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('select-profile', async (_event, profileId: string) => {
    try {
      const isRunning = await checkIsProcessRunning()
      if (isRunning) {
        return { success: false, error: 'Нельзя сменить профиль при активном VPN. Сначала отключите Shield.' }
      }

      const profilesDir = getProfilesDir()
      const targetPath = path.join(profilesDir, `${profileId}.json`)
      if (!fs.existsSync(targetPath)) {
        return { success: false, error: 'Профиль не найден' }
      }

      saveSettings({ activeProfileId: profileId })
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
    else app.exit(0)
  })

  // Periodic Status Broadcast
  setInterval(async () => {
    await updateStatusBroadcast()
  }, 3500)
})

app.on('window-all-closed', () => {
  const settings = loadSettings()
  if (!settings.minimizeToTray) app.exit(0)
})
