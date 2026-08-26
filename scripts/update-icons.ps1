Add-Type -AssemblyName System.Drawing

$icoPath = Join-Path $PSScriptRoot "..\ExiliumSwitchIcon.ico"
$buildDir = Join-Path $PSScriptRoot "..\build"
$publicDir = Join-Path $PSScriptRoot "..\public"
$srcAssetsDir = Join-Path $PSScriptRoot "..\src\assets"

Write-Host "Reading $icoPath..."

# Copy ico to build/icon.ico
Copy-Item -Path $icoPath -Destination (Join-Path $buildDir "icon.ico") -Force
Write-Host "Updated build/icon.ico"

# Load icon and get 256x256 bitmap
$icoStream = [System.IO.File]::OpenRead($icoPath)
$icon = New-Object System.Drawing.Icon($icoStream, 256, 256)
$bitmap = $icon.ToBitmap()

$pngTargets = @(
    (Join-Path $buildDir "icon.png"),
    (Join-Path $publicDir "ExiliumAppIcon.png"),
    (Join-Path $publicDir "ExiliumIcon.png"),
    (Join-Path $srcAssetsDir "ExiliumAppIcon.png"),
    (Join-Path $srcAssetsDir "ExiliumIcon.png")
)

foreach ($target in $pngTargets) {
    $parent = Split-Path -Parent $target
    if (-not (Test-Path $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }
    $bitmap.Save($target, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Host "Saved PNG: $target"
}

$bitmap.Dispose()
$icon.Dispose()
$icoStream.Dispose()

Write-Host "All icons converted and updated successfully!"
