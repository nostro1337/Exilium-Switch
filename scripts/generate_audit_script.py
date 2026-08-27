import os

script_content = r'''<#
.SYNOPSIS
    Exilium Switch - Корпоративный аудит рабочей станции (Work Environment Scanner).
.DESCRIPTION
    Скрипт проводит глубокое, 100% безопасное (read-only) сканирование рабочей системы:
    - Конфигурация Active Directory, контроллеры домена, корпоративные DNS-суффиксы
    - Сетевые интерфейсы, шлюзы, статические/DHCP DNS-серверы, MTU
    - Корпоративные сертификаты SSL-инспекции (Kaspersky, Fortinet, Zscaler, Palo Alto)
    - Таблица маршрутизации и внутренние корпоративные подсети
    - Сессии удаленного доступа (RDP к домашнему ПК, AnyDesk, RustDesk, Parsec, TeamViewer)
    - Корпоративные прокси (WinINet, WinHTTP, PAC, WPAD, переменные окружения)
    - Установленные EDR/Антивирусы/DLP и сторонние VPN-адаптеры
    - Тестирование связности с сервером Exilium (89.124.94.246:443, UDP 53, DoH, TLS Handshake)
    - Формирование отчета (.md) и структурированных данных (.json)
.NOTES
    Автор: Exilium Switch Team
    Безопасность: 100% Read-Only, ничего не изменяет в системе.
#>

[CmdletBinding()]
param(
    [string]$VpsIp = "89.124.94.246",
    [int]$VpsPort = 443,
    [string]$DecoySni = "dl.google.com",
    [string]$ReportOutputDir = "."
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "SilentlyContinue"

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "   EXILIUM SWITCH - АУДИТ КОРПОРАТИВНОГО ОКРУЖЕНИЯ (WORK PC)    " -ForegroundColor White -BackgroundColor DarkBlue
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "Режим работы: 100% Read-Only (Безопасная диагностика)`n" -ForegroundColor Green

$AuditData = [ordered]@{}

# -------------------------------------------------------------
# 1. СИСТЕМНАЯ ИНФОРМАЦИЯ И ПРАВА ДОСТУПА
# -------------------------------------------------------------
Write-Host "[1/9] Сбор системной информации и прав доступа..." -ForegroundColor Yellow

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]$identity
$isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

$osInfo = Get-CimInstance -ClassName Win32_OperatingSystem -ErrorAction SilentlyContinue
$csInfo = Get-CimInstance -ClassName Win32_ComputerSystem -ErrorAction SilentlyContinue

$domainJoined = $false
$domainName = "WORKGROUP"
if ($csInfo) {
    $domainJoined = [bool]$csInfo.PartOfDomain
    if ($domainJoined) {
        $domainName = $csInfo.Domain
    } else {
        $domainName = $csInfo.Workgroup
    }
}

$AuditData["System"] = [ordered]@{
    Hostname        = $env:COMPUTERNAME
    CurrentUser     = "$env:USERDOMAIN\$env:USERNAME"
    IsAdministrator = $isAdmin
    OSName          = $osInfo.Caption
    OSVersion       = $osInfo.Version
    OSBuild         = $osInfo.BuildNumber
    OSArchitecture  = $osInfo.OSArchitecture
    DomainJoined    = $domainJoined
    DomainWorkgroup = $domainName
    ScanTimestamp   = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
}

$adminStatusText = if ($isAdmin) { "ДА (Администратор)" } else { "НЕТ (Ограниченный пользователь)" }
$adminColor = if ($isAdmin) { "Green" } else { "Yellow" }
$domainStatusText = if ($domainJoined) { "ДОМЕН ($domainName)" } else { "Рабочая группа ($domainName)" }

Write-Host "  -> Компьютер: $($AuditData.System.Hostname) | Пользователь: $($AuditData.System.CurrentUser)" -ForegroundColor Gray
Write-Host "  -> Права Администратора: $adminStatusText" -ForegroundColor $adminColor
Write-Host "  -> Членство в домене: $domainStatusText" -ForegroundColor Gray

# -------------------------------------------------------------
# 2. ACTIVE DIRECTORY И КОРПОРАТИВНЫЕ ДОМЕНЫ
# -------------------------------------------------------------
Write-Host "`n[2/9] Анализ Active Directory и корпоративного DNS..." -ForegroundColor Yellow

$adInfo = [ordered]@{
    PartOfDomain          = $domainJoined
    DomainName            = $domainName
    DomainControllers     = @()
    DnsSuffixSearchList   = @()
    ConnectionDnsSuffixes = @()
}

if ($domainJoined) {
    try {
        $domainObj = [System.DirectoryServices.ActiveDirectory.Domain]::GetCurrentDomain()
        if ($domainObj) {
            $adInfo.DomainName = $domainObj.Name
            foreach ($dc in $domainObj.DomainControllers) {
                $dcIp = ""
                try {
                    $dcIp = ([System.Net.Dns]::GetHostAddresses($dc.Name) | Where-Object { $_.AddressFamily -eq 'InterNetwork' } | Select-Object -First 1).IPAddressToString
                } catch {}
                $adInfo.DomainControllers += [ordered]@{
                    Name = $dc.Name
                    IP   = $dcIp
                    Site = $dc.SiteName
                }
            }
        }
    } catch {
        $nltest = nltest /dsgetdc: 2>$null
        if ($nltest) {
            $dcMatch = $nltest | Where-Object { $_ -match "DC:\s*\\\\([^\s]+)" }
            $ipMatch = $nltest | Where-Object { $_ -match "Address:\s*\\\\([^\s]+)" }
            $dcName = if ($dcMatch -and $Matches[1]) { $Matches[1] } else { "" }
            $dcIp = if ($ipMatch -and $Matches[1]) { $Matches[1] } else { "" }
            if ($dcName) {
                $adInfo.DomainControllers += [ordered]@{
                    Name = $dcName
                    IP   = $dcIp
                    Site = "Discovered via nltest"
                }
            }
        }
    }
}

try {
    $dnsGlobal = Get-DnsClientGlobalSetting -ErrorAction SilentlyContinue
    if ($dnsGlobal -and $dnsGlobal.SuffixSearchList) {
        $adInfo.DnsSuffixSearchList = @($dnsGlobal.SuffixSearchList | Where-Object { $_ })
    }
} catch {}

try {
    $dnsClients = Get-DnsClient -ErrorAction SilentlyContinue
    $suffixes = @()
    foreach ($client in $dnsClients) {
        if ($client.ConnectionSpecificSuffix) {
            $suffixes += $client.ConnectionSpecificSuffix
        }
    }
    $adInfo.ConnectionDnsSuffixes = @($suffixes | Select-Object -Unique)
} catch {}

$AuditData["ActiveDirectory"] = $adInfo
Write-Host "  -> Контроллеров домена найдено: $($adInfo.DomainControllers.Count)" -ForegroundColor Gray
foreach ($dc in $adInfo.DomainControllers) {
    Write-Host "     - $($dc.Name) (IP: $($dc.IP))" -ForegroundColor Gray
}
$allSuffixes = @($adInfo.DnsSuffixSearchList + $adInfo.ConnectionDnsSuffixes | Select-Object -Unique)
Write-Host "  -> Корпоративные DNS суффиксы: $($allSuffixes -join ', ')" -ForegroundColor Gray

# -------------------------------------------------------------
# 3. СЕТЕВЫЕ АДАПТЕРЫ, DNS СЕРВЕРЫ И MTU
# -------------------------------------------------------------
Write-Host "`n[3/9] Сканирование сетевых интерфейсов, DNS серверов и MTU..." -ForegroundColor Yellow

$adaptersList = @()
$physicalAdapters = Get-NetAdapter -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq "Up" }
$dnsAddresses = Get-DnsClientServerAddress -ErrorAction SilentlyContinue
$ipConfigs = Get-NetIPAddress -ErrorAction SilentlyContinue
$ipInterfaces = Get-NetIPInterface -AddressFamily IPv4 -ErrorAction SilentlyContinue
$allDnsServersList = @()

foreach ($adapter in $physicalAdapters) {
    $ipv4 = @($ipConfigs | Where-Object { $_.InterfaceAlias -eq $adapter.Name -and $_.AddressFamily -eq 'IPv4' } | Select-Object -ExpandProperty IPAddress)
    $ipv6 = @($ipConfigs | Where-Object { $_.InterfaceAlias -eq $adapter.Name -and $_.AddressFamily -eq 'IPv6' -and $_.IPAddress -notlike "fe80*" } | Select-Object -ExpandProperty IPAddress)
    
    $adapterDns = @($dnsAddresses | Where-Object { $_.InterfaceAlias -eq $adapter.Name -and $_.AddressFamily -eq 2 } | Select-Object -ExpandProperty ServerAddresses)
    if ($adapterDns.Count -gt 0) {
        $allDnsServersList += $adapterDns
    }

    $ipInt = $ipInterfaces | Where-Object { $_.InterfaceAlias -eq $adapter.Name } | Select-Object -First 1
    $mtu = if ($ipInt) { $ipInt.NlMtu } else { 1500 }

    $isVirtual = [bool]($adapter.InterfaceDescription -match "TAP|TUN|VPN|Wintun|Virtual|Hyper-V|Cisco|AnyConnect|GlobalProtect|Forti|CheckPoint")

    $adaptersList += [ordered]@{
        Name                 = $adapter.Name
        Description          = $adapter.InterfaceDescription
        Status               = $adapter.Status
        LinkSpeed            = $adapter.LinkSpeed
        MacAddress           = $adapter.MacAddress
        Mtu                  = $mtu
        IsVirtualOrVPN       = $isVirtual
        IPv4                 = $ipv4
        IPv6                 = $ipv6
        DnsServers           = $adapterDns
    }
}

$AuditData["Adapters"] = $adaptersList
$AuditData["DiscoveredDnsServers"] = @($allDnsServersList | Select-Object -Unique)

Write-Host "  -> Активных сетевых интерфейсов: $($adaptersList.Count)" -ForegroundColor Gray
foreach ($ad in $adaptersList) {
    $tag = if ($ad.IsVirtualOrVPN) { "[VPN/Virtual]" } else { "[Physical]" }
    Write-Host "     * $($ad.Name) $tag : IP $($ad.IPv4 -join ', ') | DNS: $($ad.DnsServers -join ', ') (MTU: $($ad.Mtu))" -ForegroundColor Gray
}

# -------------------------------------------------------------
# 4. ТАБЛИЦА МАРШРУТИЗАЦИИ И ШЛЮЗЫ
# -------------------------------------------------------------
Write-Host "`n[4/9] Анализ таблицы маршрутизации и шлюзов..." -ForegroundColor Yellow

$routes = Get-NetRoute -AddressFamily IPv4 -ErrorAction SilentlyContinue
$defaultRoutes = $routes | Where-Object { $_.DestinationPrefix -eq "0.0.0.0/0" } | Sort-Object RouteMetric

$defaultGateways = @()
foreach ($dr in $defaultRoutes) {
    $defaultGateways += [ordered]@{
        InterfaceAlias = $dr.InterfaceAlias
        Gateway        = $dr.NextHop
        Metric         = $dr.RouteMetric
    }
}

$corporateSubnets = @()
$filteredRoutes = $routes | Where-Object { 
    $_.DestinationPrefix -ne "0.0.0.0/0" -and 
    $_.DestinationPrefix -ne "127.0.0.1/32" -and 
    $_.DestinationPrefix -ne "255.255.255.255/32" -and
    $_.DestinationPrefix -notlike "224.*" -and
    $_.NextHop -ne "0.0.0.0"
}

foreach ($r in $filteredRoutes) {
    $corporateSubnets += [ordered]@{
        DestinationPrefix = $r.DestinationPrefix
        NextHop           = $r.NextHop
        InterfaceAlias    = $r.InterfaceAlias
    }
}

$AuditData["Routing"] = [ordered]@{
    DefaultGateways = $defaultGateways
    CorporateRoutes = $corporateSubnets
}

if ($defaultGateways.Count -gt 0) {
    Write-Host "  -> Основной шлюз: $($defaultGateways[0].Gateway) (на $($defaultGateways[0].InterfaceAlias), метрика $($defaultGateways[0].Metric))" -ForegroundColor Gray
} else {
    Write-Host "  -> Основной шлюз не обнаружен!" -ForegroundColor Yellow
}
Write-Host "  -> Активных специфических маршрутов: $($corporateSubnets.Count)" -ForegroundColor Gray

# -------------------------------------------------------------
# 5. СЕССИИ УДАЛЕННОГО ДОСТУПА (ЗАЩИТА ОТ ОБРЫВА СВЯЗИ)
# -------------------------------------------------------------
Write-Host "`n[5/9] Поиск сессий удаленного подключения (RDP, AnyDesk, RustDesk, Parsec)..." -ForegroundColor Yellow

$remoteSessions = @()
$tcpConnections = Get-NetTCPConnection -State Established -ErrorAction SilentlyContinue
$remoteProcs = Get-Process | Where-Object { $_.ProcessName -match "mstsc|AnyDesk|TeamViewer|RustDesk|LiteManager|vnc|rdpclip|parsecd" }

# Check for RDP (both inbound work PC, and outbound from work PC to home PC!)
foreach ($conn in $tcpConnections) {
    $tool = ""
    $direction = ""

    if ($conn.LocalPort -eq 3389) {
        $tool = "RDP (Входящее на этот ПК)"
        $direction = "Inbound"
    } elseif ($conn.RemotePort -eq 3389) {
        $tool = "RDP (Исходящее к домашнему ПК)"
        $direction = "Outbound"
    } elseif ($conn.LocalPort -eq 7070 -or $conn.RemotePort -eq 7070) {
        $tool = "AnyDesk"
        $direction = "Session"
    } elseif ($conn.LocalPort -eq 5938 -or $conn.RemotePort -eq 5938) {
        $tool = "TeamViewer"
        $direction = "Session"
    } elseif ($conn.LocalPort -ge 21115 -and $conn.LocalPort -le 21119) {
        $tool = "RustDesk"
        $direction = "Session"
    }

    if ($tool -ne "") {
        $remoteSessions += [ordered]@{
            Tool       = $tool
            Direction  = $direction
            LocalIP    = $conn.LocalAddress
            LocalPort  = $conn.LocalPort
            RemoteIP   = $conn.RemoteAddress
            RemotePort = $conn.RemotePort
            PID        = $conn.OwningProcess
        }
    }
}

$procList = @()
if ($remoteProcs) {
    foreach ($p in $remoteProcs) {
        $procList += [ordered]@{
            ProcessName = $p.ProcessName
            Id          = $p.Id
        }
    }
}

$AuditData["RemoteAccess"] = [ordered]@{
    DetectedProcesses = $procList
    ActiveSessions    = $remoteSessions
}

if ($remoteSessions.Count -gt 0) {
    Write-Host "  -> КРИТИЧЕСКИ ВАЖНО: Обнаружены активные сессии удаленного доступа!" -ForegroundColor Magenta
    foreach ($rs in $remoteSessions) {
        Write-Host "     [!] $($rs.Tool) : $($rs.LocalIP):$($rs.LocalPort) <---> $($rs.RemoteIP):$($rs.RemotePort)" -ForegroundColor Magenta
    }
} else {
    Write-Host "  -> Активных RDP/AnyDesk сессий на стандартных портах не зафиксировано." -ForegroundColor Gray
}

# -------------------------------------------------------------
# 6. КОРПОРАТИВНЫЙ ПРОКСИ, PAC, WPAD И ОКРУЖЕНИЕ
# -------------------------------------------------------------
Write-Host "`n[6/9] Проверка корпоративного прокси (WinINet, WinHTTP, PAC)..." -ForegroundColor Yellow

$proxySettings = [ordered]@{
    WinINet_ProxyEnable   = $false
    WinINet_ProxyServer   = ""
    WinINet_AutoConfigURL = ""
    WinHTTP_Proxy         = "Direct (No proxy)"
    Env_HTTP_PROXY        = [string]$env:HTTP_PROXY
    Env_HTTPS_PROXY       = [string]$env:HTTPS_PROXY
    Env_ALL_PROXY         = [string]$env:ALL_PROXY
    Env_NO_PROXY          = [string]$env:NO_PROXY
}

try {
    $reg = Get-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings" -ErrorAction SilentlyContinue
    if ($reg) {
        $proxySettings.WinINet_ProxyEnable   = [bool]$reg.ProxyEnable
        $proxySettings.WinINet_ProxyServer   = [string]$reg.ProxyServer
        $proxySettings.WinINet_AutoConfigURL = [string]$reg.AutoConfigURL
    }
} catch {}

try {
    $winHttp = netsh winhttp show proxy 2>$null
    if ($winHttp -match "Proxy Server\(s\)\s*:\s*([^\r\n]+)") {
        $proxySettings.WinHTTP_Proxy = $Matches[1].Trim()
    }
} catch {}

$AuditData["Proxy"] = $proxySettings

$proxyStatus = if ($proxySettings.WinINet_ProxyEnable) { "ВКЛЮЧЕН ($($proxySettings.WinINet_ProxyServer))" } else { "Отключен" }
Write-Host "  -> WinINet Прокси: $proxyStatus" -ForegroundColor Gray
if ($proxySettings.WinINet_AutoConfigURL) {
    Write-Host "  -> PAC Скрипт: $($proxySettings.WinINet_AutoConfigURL)" -ForegroundColor Yellow
}
Write-Host "  -> WinHTTP Прокси: $($proxySettings.WinHTTP_Proxy)" -ForegroundColor Gray

# -------------------------------------------------------------
# 7. СЕРТИФИКАТЫ SSL-ИНСПЕКЦИИ (DPI / MITM ПРОКСИ)
# -------------------------------------------------------------
Write-Host "`n[7/9] Проверка корпоративных сертификатов SSL-инспекции (MITM)..." -ForegroundColor Yellow

$corporateRootCerts = @()
try {
    $allRoots = Get-ChildItem -Path "Cert:\LocalMachine\Root" -ErrorAction SilentlyContinue
    $trustedVendorsPattern = "Microsoft|DigiCert|Sectigo|Let's Encrypt|GlobalSign|VeriSign|Entrust|Amazon|Google|GoDaddy|USERTrust|ISRG|Baltimore|Comodo|Thawte|GeoTrust|Certum|Cybertrust|AAA Certificate|DST Root"
    
    foreach ($cert in $allRoots) {
        if ($cert.Issuer -notmatch $trustedVendorsPattern -and $cert.Subject -notmatch $trustedVendorsPattern) {
            $corporateRootCerts += [ordered]@{
                Subject   = $cert.Subject
                Issuer    = $cert.Issuer
                Thumbprint = $cert.Thumbprint
                NotAfter  = $cert.NotAfter.ToString("yyyy-MM-dd")
            }
        }
    }
} catch {}

$AuditData["CustomRootCertificates"] = $corporateRootCerts
if ($corporateRootCerts.Count -gt 0) {
    Write-Host "  -> ВНИМАНИЕ: Обнаружены локальные/корпоративные корневые сертификаты ($($corporateRootCerts.Count) шт.):" -ForegroundColor Yellow
    foreach ($c in $corporateRootCerts | Select-Object -First 3) {
        Write-Host "     - $($c.Subject)" -ForegroundColor Gray
    }
} else {
    Write-Host "  -> Подозрительных сертификатов корпоративной SSL-инспекции не найдено." -ForegroundColor Gray
}

# -------------------------------------------------------------
# 8. АНТИВИРУСЫ, СИСТЕМЫ ЗАЩИТЫ (EDR/DLP) И VPN ПО
# -------------------------------------------------------------
Write-Host "`n[8/9] Проверка средств безопасности (EDR/AV) и сторонних VPN..." -ForegroundColor Yellow

$avProducts = @()
try {
    $avList = Get-CimInstance -Namespace root\SecurityCenter2 -ClassName AntiVirusProduct -ErrorAction SilentlyContinue
    foreach ($av in $avList) {
        $avProducts += [ordered]@{
            Name     = $av.displayName
            Path     = $av.pathToSignedProductExe
            StateHex = "0x{0:X}" -f $av.productState
        }
    }
} catch {}

$knownEdrProcesses = @(
    "csagent", "CSFalconContainer", "SentinelAgent", "SentinelStaticEngine",
    "kavfs", "avp", "klnagent", "ekrn", "bdservicehost", "Traps", "CylanceSvc",
    "TaniumClient", "QualysAgent", "cb", "edpa", "wspd_proxy", "fsvs"
)
$allRunning = Get-Process
$detectedEdr = @($allRunning | Where-Object { $knownEdrProcesses -contains $_.ProcessName } | Select-Object -Property ProcessName, Id -Unique)

$knownVpnProcesses = @(
    "vpnui", "vpnagent", "PanGPA", "PanGPS", "FortiClient", "openvpn",
    "wireguard", "CheckPointCapsule", "openconnect"
)
$detectedVpns = @($allRunning | Where-Object { $knownVpnProcesses -contains $_.ProcessName } | Select-Object -Property ProcessName, Id -Unique)

$AuditData["Security"] = [ordered]@{
    RegisteredAV       = $avProducts
    DetectedEDR_Agents = @($detectedEdr)
    DetectedVPN_Agents = @($detectedVpns)
}

$avNames = @($avProducts | ForEach-Object { $_.Name })
Write-Host "  -> Зарегистрированный AV: $($avNames -join ', ')" -ForegroundColor Gray
if ($detectedEdr.Count -gt 0) {
    $edrNames = @($detectedEdr | ForEach-Object { $_.ProcessName })
    Write-Host "  -> ВНИМАНИЕ: Обнаружены агенты EDR/DLP: $($edrNames -join ', ')" -ForegroundColor Yellow
}
if ($detectedVpns.Count -gt 0) {
    $vpnNames = @($detectedVpns | ForEach-Object { $_.ProcessName })
    Write-Host "  -> Обнаружены другие VPN: $($vpnNames -join ', ')" -ForegroundColor Gray
}

# -------------------------------------------------------------
# 9. СЕТЕВЫЕ ТЕСТЫ ДО СЕРВЕРА EXILIUM (89.124.94.246)
# -------------------------------------------------------------
Write-Host "`n[9/9] Тестирование доступности сервера Exilium ($VpsIp`:$VpsPort)..." -ForegroundColor Yellow

$netTests = [ordered]@{
    VpsTcpPortOpen   = $false
    VpsPingSuccess   = $false
    VpsPingLatencyMs = -1
    TlsHandshakeOk   = $false
    Udp53OutboundOk  = $false
    DoHOutboundOk    = $false
}

# A. Ping
try {
    $ping = Test-Connection -ComputerName $VpsIp -Count 1 -Quiet -ErrorAction SilentlyContinue
    $netTests.VpsPingSuccess = [bool]$ping
    if ($ping) {
        $pingObj = Test-Connection -ComputerName $VpsIp -Count 1 -ErrorAction SilentlyContinue
        $netTests.VpsPingLatencyMs = $pingObj.ResponseTime
    }
} catch {}

# B. TCP Port Test (Timeout 2500ms)
try {
    $socket = New-Object System.Net.Sockets.TcpClient
    $connect = $socket.BeginConnect($VpsIp, $VpsPort, $null, $null)
    $success = $connect.AsyncWaitHandle.WaitOne(2500, $false)
    if ($success -and $socket.Connected) {
        $netTests.VpsTcpPortOpen = $true
        $socket.EndConnect($connect)
    }
    $socket.Close()
} catch {}

# C. Outbound UDP 53 Test
try {
    $udpClient = New-Object System.Net.Sockets.UdpClient
    $udpClient.Client.ReceiveTimeout = 2000
    $udpClient.Client.SendTimeout = 2000
    $udpClient.Connect("77.88.8.8", 53)
    [byte[]]$dnsPacket = @(
        0xAA, 0xBB, 0x01, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x06, 0x79, 0x61, 0x6E, 0x64, 0x65, 0x78, 0x02, 0x72, 0x75, 0x00, 0x00,
        0x01, 0x00, 0x01
    )
    [void]$udpClient.Send($dnsPacket, $dnsPacket.Length)
    $remoteEp = New-Object System.Net.IPEndPoint([System.Net.IPAddress]::Any, 0)
    $recvBytes = $udpClient.Receive([ref]$remoteEp)
    if ($recvBytes -and $recvBytes.Length -gt 12) {
        $netTests.Udp53OutboundOk = $true
    }
    $udpClient.Close()
} catch {}

# D. DoH Test
try {
    $req = [System.Net.WebRequest]::Create("https://8.8.8.8/dns-query?name=google.com&type=A")
    $req.Timeout = 3000
    $req.Headers.Add("Accept", "application/dns-json")
    $res = $req.GetResponse()
    if ($res.StatusCode -eq 200) {
        $netTests.DoHOutboundOk = $true
    }
    $res.Close()
} catch {}

# E. TLS Handshake Check
try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $tcpConnect = $tcp.BeginConnect($VpsIp, $VpsPort, $null, $null)
    if ($tcpConnect.AsyncWaitHandle.WaitOne(2500, $false) -and $tcp.Connected) {
        $sslStream = New-Object System.Net.Security.SslStream($tcp.GetStream(), $false, {
            param($sender, $cert, $chain, $errors)
            return $true
        })
        $sslStream.AuthenticateAsClient($DecoySni)
        if ($sslStream.IsAuthenticated) {
            $netTests.TlsHandshakeOk = $true
        }
        $sslStream.Close()
    }
    $tcp.Close()
} catch {}

$AuditData["ConnectivityTests"] = $netTests

$tcpStatus = if ($netTests.VpsTcpPortOpen) { "ОТКРЫТ [OK]" } else { "ЗАБЛОКИРОВАН [FAIL]" }
$tcpColor  = if ($netTests.VpsTcpPortOpen) { "Green" } else { "Red" }
$tlsStatus = if ($netTests.TlsHandshakeOk) { "УСПЕШНО [OK]" } else { "ОШИБКА ИЛИ DPI" }
$tlsColor  = if ($netTests.TlsHandshakeOk) { "Green" } else { "Yellow" }
$udpStatus = if ($netTests.Udp53OutboundOk) { "РАЗРЕШЕН [OK]" } else { "ЗАБЛОКИРОВАН" }
$dohStatus = if ($netTests.DoHOutboundOk) { "РАЗРЕШЕН [OK]" } else { "НЕДОСТУПЕН" }

Write-Host "  -> Прямой доступ TCP $VpsIp`:$VpsPort : $tcpStatus" -ForegroundColor $tcpColor
Write-Host "  -> TLS Handshake (SNI: $DecoySni) : $tlsStatus" -ForegroundColor $tlsColor
Write-Host "  -> Внешний UDP 53 (DNS)         : $udpStatus" -ForegroundColor Gray
Write-Host "  -> Внешний DoH (HTTPS DNS)      : $dohStatus" -ForegroundColor Gray

# -------------------------------------------------------------
# 10. ИТОГОВАЯ ОЦЕНКА РИСКОВ ДЛЯ EXILIUM SWITCH
# -------------------------------------------------------------
Write-Host "`n=================================================================" -ForegroundColor Cyan
Write-Host "            ИТОГОВАЯ ОЦЕНКА РИСКОВ И СОВМЕСТИМОСТИ              " -ForegroundColor White -BackgroundColor DarkBlue
Write-Host "=================================================================" -ForegroundColor Cyan

$risks = @()

# Риск 1: Домен и DNS
if ($domainJoined) {
    $dnsJoinedList = ($AuditData.DiscoveredDnsServers) -join ', '
    $risks += [ordered]@{
        Level       = "КРИТИЧЕСКИЙ"
        Area        = "Active Directory / Домен"
        Description = "ПК состоит в домене $domainName. Стандартный перехват DNS (hijack-dns -> 8.8.8.8) приведет к отказу авторизации в домене, отказу доступа к сетевым дискам и Kerberos."
        Mitigation  = "В sing-box DNS необходимо жестко направить корпоративные суффиксы на внутренние DNS-серверы: $dnsJoinedList."
    }
}

# Риск 2: Удаленная сессия
if ($remoteSessions.Count -gt 0) {
    $remoteIps = (($remoteSessions | Select-Object -ExpandProperty RemoteIP -Unique) -join ', ')
    $risks += [ordered]@{
        Level       = "КРИТИЧЕСКИЙ"
        Area        = "Удаленное подключение"
        Description = "Обнаружено активное удаленное подключение к домашнему ПК / RDP. Любое изменение основного шлюза (Default Gateway) МГНОВЕННО ОБОРВЕТ ТЕКУЩУЮ СВЯЗЬ!"
        Mitigation  = "IP-адрес(а) удаленного хоста [$remoteIps] и текущий шлюз должны быть в direct-маршрутах sing-box."
    }
}

# Риск 3: UAC Права
if (-not $isAdmin) {
    $risks += [ordered]@{
        Level       = "ВЫСОКИЙ"
        Area        = "Права доступа (UAC)"
        Description = "Текущий пользователь не имеет прав локального Администратора. Создание TUN/WinTun адаптера будет заблокировано."
        Mitigation  = "Использовать режим 'System Proxy' (без TUN) или запустить Exilium Switch от имени локального администратора."
    }
}

# Риск 4: Файрвол
if (-not $netTests.VpsTcpPortOpen) {
    $risks += [ordered]@{
        Level       = "БЛОКИРУЮЩИЙ"
        Area        = "Корпоративный файрвол"
        Description = "Прямой TCP-порт $VpsPort на $VpsIp заблокирован граничным файрволом компании."
        Mitigation  = "Необходимо настроить проксирование через корпоративный прокси, либо сменить внешний порт/протокол."
    }
}

# Риск 5: Прокси
if ($proxySettings.WinINet_ProxyEnable -or $proxySettings.WinINet_AutoConfigURL) {
    $risks += [ordered]@{
        Level       = "СРЕДНИЙ"
        Area        = "Корпоративный Прокси"
        Description = "В системе активен корпоративный прокси или PAC-скрипт."
        Mitigation  = "Связать sing-box с корпоративным upstream-прокси или явно пустить трафик в обход него."
    }
}

# Риск 6: SSL MITM Инспекция
if ($corporateRootCerts.Count -gt 0) {
    $risks += [ordered]@{
        Level       = "СРЕДНИЙ"
        Area        = "SSL MITM / Корпоративные CA"
        Description = "Обнаружены нестандартные корневые сертификаты. В корпоративной сети может работать расшифровка HTTPS (SSL Inspection)."
        Mitigation  = "VLESS Reality защищен от MITM, но корпоративный DPI может детектировать аномальный трафик на порт 443."
    }
}

$AuditData["RiskAssessment"] = $risks

foreach ($r in $risks) {
    $color = switch ($r.Level) {
        "КРИТИЧЕСКИЙ" { "Red" }
        "БЛОКИРУЮЩИЙ" { "Red" }
        "ВЫСОКИЙ"     { "Magenta" }
        "СРЕДНИЙ"     { "Yellow" }
        Default       { "Gray" }
    }
    Write-Host "[$($r.Level)] $($r.Area):" -ForegroundColor $color
    Write-Host "  Угроза : $($r.Description)" -ForegroundColor Gray
    Write-Host "  Решение: $($r.Mitigation)`n" -ForegroundColor Green
}

# -------------------------------------------------------------
# 11. ЭКСПОРТ ОТЧЕТОВ (.MD И .JSON)
# -------------------------------------------------------------
$jsonPath = Join-Path $ReportOutputDir "WorkPC_Audit_Data.json"
$mdPath = Join-Path $ReportOutputDir "WorkPC_Audit_Report.md"

$AuditData | ConvertTo-Json -Depth 6 | Out-File -FilePath $jsonPath -Encoding UTF8

$reportLines = @()
$reportLines += "# Отчет аудита рабочего компьютера (Work PC Audit Report)"
$reportLines += "Сформирован: $($AuditData.System.ScanTimestamp)"
$reportLines += "Хост: **$($AuditData.System.Hostname)** | Пользователь: **$($AuditData.System.CurrentUser)**"
$reportLines += ""
$reportLines += "---"
$reportLines += ""
$reportLines += "## 1. Сводка и статус совместимости"
$reportLines += ""
$reportLines += "| Параметр | Значение | Оценка для Exilium Switch |"
$reportLines += "| :--- | :--- | :--- |"
$reportLines += "| **Членство в домене** | $(if($domainJoined){"В ДОМЕНЕ ($domainName)"}else{"Рабочая группа"}) | $(if($domainJoined){"⚠️ Требуется корпоративный DNS"}else{"✅ Штатный режим"}) |"
$reportLines += "| **Права админа (UAC)** | $adminStatusText | $(if($isAdmin){"✅ Доступен TUN/WinTun"}else{"⚠️ Нужен UAC или Proxy-режим"}) |"
$reportLines += "| **Связь с Exilium** | $(if($netTests.VpsTcpPortOpen){"ДОСТУПЕН ($VpsIp`:$VpsPort)"}else{"ЗАБЛОКИРОВАН"}) | $(if($netTests.VpsTcpPortOpen){"✅ Связь подтверждена"}else{"❌ Блокировка файрволом"}) |"
$reportLines += "| **Сессии RDP/AnyDesk** | $($remoteSessions.Count) активных сессий | $(if($remoteSessions.Count -gt 0){"⚠️ Защита от разрыва обязательна!"}else{"✅ Безопасно"}) |"
$reportLines += "| **Корпоративный прокси** | $(if($proxySettings.WinINet_ProxyEnable){"Включен"}else{"Отключен"}) | $(if($proxySettings.WinINet_ProxyEnable){"⚠️ Учесть прокси"}else{"✅ Прямой доступ"}) |"
$reportLines += "| **Сертификаты MITM** | $($corporateRootCerts.Count) обнаружено | $(if($corporateRootCerts.Count -gt 0){"⚠️ Возможна инспекция трафика"}else{"✅ Чисто"}) |"
$reportLines += ""
$reportLines += "---"
$reportLines += ""
$reportLines += "## 2. Обнаруженные риски и меры защиты"
$reportLines += ""

if ($risks.Count -eq 0) {
    $reportLines += "✅ **Критических угроз не обнаружено.** Система совместима со стандартным профилем."
} else {
    $reportLines += "| Уровень | Зона | Суть риска | Необходимое действие |"
    $reportLines += "| :--- | :--- | :--- | :--- |"
    foreach ($r in $risks) {
        $reportLines += "| **$($r.Level)** | $($r.Area) | $($r.Description) | $($r.Mitigation) |"
    }
}

$reportLines += ""
$reportLines += "---"
$reportLines += ""
$reportLines += "## 3. Active Directory и параметры сети"
$reportLines += ""
$reportLines += "| Параметр | Значение |"
$reportLines += "| :--- | :--- |"
$dcString = if ($adInfo.DomainControllers.Count -gt 0) {
    ($adInfo.DomainControllers | ForEach-Object { "$($_.Name) ($($_.IP))" }) -join '<br>'
} else {
    "Не обнаружено"
}
$reportLines += "| **Контроллеры домена (DC)** | $dcString |"
$reportLines += "| **DNS-серверы адаптеров** | $(if($AuditData.DiscoveredDnsServers.Count -gt 0){($AuditData.DiscoveredDnsServers) -join ', '}else{'Не обнаружены'}) |"
$reportLines += "| **DNS-суффиксы домена** | $(if($allSuffixes.Count -gt 0){$allSuffixes -join ', '}else{'Не обнаружены'}) |"
$gwString = if ($defaultGateways.Count -gt 0) {
    "$($defaultGateways[0].Gateway) [$($defaultGateways[0].InterfaceAlias)]"
} else {
    "Не обнаружен"
}
$reportLines += "| **Основной шлюз (Gateway)** | $gwString |"
$reportLines += ""
$reportLines += "---"
$reportLines += ""
$reportLines += "## 4. Активные сессии удаленного доступа (Remote Access)"
$reportLines += ""

if ($remoteSessions.Count -eq 0) {
    $reportLines += "Сессий RDP/AnyDesk на стандартных портах не зафиксировано."
} else {
    $reportLines += "| Утилита | Направление | Локальный сокет | Удаленный сокет (Адрес подключения) | PID |"
    $reportLines += "| :--- | :--- | :--- | :--- | :--- |"
    foreach ($s in $remoteSessions) {
        $reportLines += "| **$($s.Tool)** | $($s.Direction) | $($s.LocalIP):$($s.LocalPort) | **$($s.RemoteIP):$($s.RemotePort)** | $($s.PID) |"
    }
}

$reportLines += ""
$reportLines += "---"
$reportLines += ""
$reportLines += "## 5. Корпоративные маршруты и подсети"
$reportLines += ""
$reportLines += "| Назначение (Подсеть) | Шлюз | Интерфейс |"
$reportLines += "| :--- | :--- | :--- |"
if ($corporateSubnets.Count -eq 0) {
    $reportLines += "| Нет специфических маршрутов (только шлюз по умолчанию) | - | - |"
} else {
    foreach ($sub in $corporateSubnets) {
        $reportLines += "| $($sub.DestinationPrefix) | $($sub.NextHop) | $($sub.InterfaceAlias) |"
    }
}

$reportLines += ""
$reportLines += "---"
$reportLines += ""
$reportLines += "## 6. Средства защиты (Антивирусы / EDR / SSL-инспекция)"
$reportLines += ""
$reportLines += "| Компонент | Название / Процесс |"
$reportLines += "| :--- | :--- |"
$avString = if ($avProducts.Count -gt 0) { ($avProducts | ForEach-Object { $_.Name }) -join ', ' } else { "Не зарегистрирован" }
$reportLines += "| **Зарегистрированный AV** | $avString |"
$edrString = if ($detectedEdr.Count -gt 0) { ($detectedEdr | ForEach-Object { "$($_.ProcessName) (PID: $($_.Id))" }) -join ', ' } else { "Не обнаружены" }
$reportLines += "| **Обнаруженные EDR-агенты** | $edrString |"
$vpnString = if ($detectedVpns.Count -gt 0) { ($detectedVpns | ForEach-Object { "$($_.ProcessName) (PID: $($_.Id))" }) -join ', ' } else { "Не обнаружены" }
$reportLines += "| **Другие VPN** | $vpnString |"
$certString = if ($corporateRootCerts.Count -gt 0) { ($corporateRootCerts | ForEach-Object { $_.Subject }) -join '<br>' } else { "Не обнаружены" }
$reportLines += "| **Подозрительные корневые CA** | $certString |"
$reportLines += ""
$reportLines += "---"
$reportLines += "*Сгенерировано автоматически скриптом Exilium Switch Audit.*"

$reportLines -join "`r`n" | Out-File -FilePath $mdPath -Encoding UTF8

Write-Host "`nОтчеты успешно сохранены:" -ForegroundColor Cyan
Write-Host "  -> Текстовый Markdown-отчет: $mdPath" -ForegroundColor White
Write-Host "  -> Полный JSON для импорта : $jsonPath" -ForegroundColor White
Write-Host "`nГотово! Вы можете передать файл $jsonPath или содержимое $mdPath в чат для сборки безопасного рабочего конфига." -ForegroundColor Green
'''

target_path = os.path.join(os.path.dirname(__file__), "Audit-WorkEnvironment.ps1")
with open(target_path, "w", encoding="utf-8-sig") as f:
    f.write(script_content)

print(f"Generated {target_path} successfully with UTF-8 BOM!")
