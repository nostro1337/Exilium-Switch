$ProcessName = "sing-box"
$ExePath = "C:\sing-box\sing-box.exe"
$ConfigPath = "C:\sing-box\config.json"

# Часовые пояса
$FakeZone = "W. Europe Standard Time"
$RealZone = "Tomsk Standard Time"

# Проверка прав администратора
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Warning "Administrator rights required!"
    Exit
}

$Process = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue

if ($Process) {
    Write-Host ">>> DISABLING RESIDENT MODE..." -ForegroundColor Yellow
    Stop-Process -Name $ProcessName -Force
    Set-TimeZone -Id $RealZone
    Start-Service -Name "lfsvc" -ErrorAction SilentlyContinue
    Write-Host "[OFF] Default traffic, timezone, and geolocation restored." -ForegroundColor Green
} else {
    Write-Host ">>> ENABLING RESIDENT MODE..." -ForegroundColor Cyan
    if (Test-Path $ExePath) {
        Set-TimeZone -Id $FakeZone
        Stop-Service -Name "lfsvc" -Force -ErrorAction SilentlyContinue
        Start-Process -FilePath $ExePath -ArgumentList "run", "-c", "`"$ConfigPath`"" -WorkingDirectory "C:\sing-box" -WindowStyle Hidden -ErrorAction Stop
        Write-Host "[ON] Netherlands Resident Mode activated." -ForegroundColor Green
    } else {
        Write-Error "sing-box.exe not found at $ExePath"
    }
}