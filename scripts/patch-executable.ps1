param(
    [string]$TargetDir = "release/DevBuild/win-unpacked"
)

$rcedit = "C:\Users\Nostro\AppData\Local\electron-builder\Cache\winCodeSign\178917387\rcedit-x64.exe"
$exe = Join-Path $PSScriptRoot "..\$TargetDir\Exilium Switch.exe"
$icon = Join-Path $PSScriptRoot "..\build\icon.ico"

if (-not (Test-Path $rcedit)) {
    # Search for rcedit anywhere in Cache
    $found = Get-ChildItem -Path "$env:LOCALAPPDATA\electron-builder\Cache" -Filter "rcedit-x64.exe" -Recurse -File | Select-Object -First 1
    if ($found) { $rcedit = $found.FullName }
}

$pkg = Get-Content (Join-Path $PSScriptRoot "..\package.json") -Raw | ConvertFrom-Json
$appVersion = $pkg.version

# Ensure app-update.yml exists in resources
$updateYmlSource = Join-Path $PSScriptRoot "..\build\app-update.yml"
$updateYmlDest = Join-Path $PSScriptRoot "..\$TargetDir\resources\app-update.yml"
if (Test-Path $updateYmlSource) {
    $resDir = Split-Path $updateYmlDest -Parent
    if (-not (Test-Path $resDir)) { New-Item -ItemType Directory -Path $resDir -Force | Out-Null }
    Copy-Item $updateYmlSource $updateYmlDest -Force
    Write-Host "Ensured app-update.yml is in $updateYmlDest"
}

if ((Test-Path $rcedit) -and (Test-Path $exe)) {
    Write-Host "Patching PE metadata on $exe for version $appVersion..."
    & $rcedit $exe `
        --set-icon $icon `
        --set-version-string "FileDescription" "Exilium Switch" `
        --set-version-string "ProductName" "Exilium Switch" `
        --set-version-string "CompanyName" "Nostro" `
        --set-version-string "LegalCopyright" "Copyright © 2026 Nostro" `
        --set-version-string "OriginalFilename" "Exilium Switch.exe" `
        --set-version-string "InternalName" "Exilium Switch" `
        --set-product-version $appVersion `
        --set-file-version $appVersion
    Write-Host "rcedit completed with code: $LASTEXITCODE"
} else {
    Write-Host "rcedit ($rcedit) or exe ($exe) not found!"
}
