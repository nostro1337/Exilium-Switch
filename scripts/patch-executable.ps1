$rcedit = "C:\Users\Nostro\AppData\Local\electron-builder\Cache\winCodeSign\178917387\rcedit-x64.exe"
$exe = Join-Path $PSScriptRoot "..\release\win-unpacked\Exilium Switch.exe"
$icon = Join-Path $PSScriptRoot "..\build\icon.ico"

if (-not (Test-Path $rcedit)) {
    # Search for rcedit anywhere in Cache
    $found = Get-ChildItem -Path "$env:LOCALAPPDATA\electron-builder\Cache" -Filter "rcedit-x64.exe" -Recurse -File | Select-Object -First 1
    if ($found) { $rcedit = $found.FullName }
}

if ((Test-Path $rcedit) -and (Test-Path $exe)) {
    Write-Host "Patching PE metadata on $exe..."
    & $rcedit $exe `
        --set-icon $icon `
        --set-version-string "FileDescription" "Exilium Switch" `
        --set-version-string "ProductName" "Exilium Switch" `
        --set-version-string "CompanyName" "Nostro" `
        --set-version-string "LegalCopyright" "Copyright © 2026 Nostro" `
        --set-version-string "OriginalFilename" "Exilium Switch.exe" `
        --set-version-string "InternalName" "Exilium Switch" `
        --set-product-version "1.3.0" `
        --set-file-version "1.3.0"
    Write-Host "rcedit completed with code: $LASTEXITCODE"
} else {
    Write-Host "rcedit ($rcedit) or exe ($exe) not found!"
}
