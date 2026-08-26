Add-Type -AssemblyName System.Drawing

$buildDir = Join-Path $PSScriptRoot "..\build"
$setupIco = Join-Path $PSScriptRoot "..\ExiliumSetupIcon.ico"
$appIco = Join-Path $PSScriptRoot "..\ExiliumSwitchIcon.ico"

# Copy installerIcon.ico
Copy-Item -Path $setupIco -Destination (Join-Path $buildDir "installerIcon.ico") -Force
Copy-Item -Path $setupIco -Destination (Join-Path $buildDir "uninstallerIcon.ico") -Force
Write-Host "installerIcon.ico updated"

# Create Sidebar BMP (164 x 314)
$sbWidth = 164
$sbHeight = 314
$sbBmp = New-Object System.Drawing.Bitmap($sbWidth, $sbHeight, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$g = [System.Drawing.Graphics]::FromImage($sbBmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

# Dark Background
$bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(9, 9, 12))
$g.FillRectangle($bgBrush, 0, 0, $sbWidth, $sbHeight)

# Subtle Gradient Glow in Center
$glowPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$glowPath.AddEllipse(22, 45, 120, 120)
$pbg = New-Object System.Drawing.Drawing2D.PathGradientBrush($glowPath)
$pbg.CenterColor = [System.Drawing.Color]::FromArgb(40, 255, 255, 255)
$pbg.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 9, 9, 12))
$g.FillPath($pbg, $glowPath)

# Draw Icon in Sidebar
$iconStream = [System.IO.File]::OpenRead($setupIco)
$icon = New-Object System.Drawing.Icon($iconStream, 64, 64)
$iconBmp = $icon.ToBitmap()
$g.DrawImage($iconBmp, [int](($sbWidth - 64) / 2), 65, 64, 64)

# Draw Glowing Branding Typography
$fontTitle = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
$fontSub = New-Object System.Drawing.Font("Segoe UI", 7.5, [System.Drawing.FontStyle]::Regular)
$fontVer = New-Object System.Drawing.Font("Segoe UI", 7, [System.Drawing.FontStyle]::Regular)

$textBrushWhite = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(245, 245, 247))
$textBrushGray = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(140, 140, 150))
$textBrushMuted = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(90, 90, 100))

$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = [System.Drawing.StringAlignment]::Center

$g.DrawString("EXILIUM", $fontTitle, $textBrushWhite, [float]($sbWidth / 2), 145, $sf)
$g.DrawString("SWITCH", $fontTitle, $textBrushWhite, [float]($sbWidth / 2), 165, $sf)
$g.DrawString("Resident Shield", $fontSub, $textBrushGray, [float]($sbWidth / 2), 195, $sf)
$g.DrawString("v1.3 • Nostro", $fontVer, $textBrushMuted, [float]($sbWidth / 2), 290, $sf)

$sidebarPath = Join-Path $buildDir "installerSidebar.bmp"
$unsidebarPath = Join-Path $buildDir "uninstallerSidebar.bmp"
$sbBmp.Save($sidebarPath, [System.Drawing.Imaging.ImageFormat]::Bmp)
$sbBmp.Save($unsidebarPath, [System.Drawing.Imaging.ImageFormat]::Bmp)
Write-Host "Saved installerSidebar.bmp and uninstallerSidebar.bmp"

$g.Dispose()
$sbBmp.Dispose()
$iconBmp.Dispose()
$icon.Dispose()
$iconStream.Dispose()

# Create Header BMP (150 x 57)
$hWidth = 150
$hHeight = 57
$hBmp = New-Object System.Drawing.Bitmap($hWidth, $hHeight, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$gh = [System.Drawing.Graphics]::FromImage($hBmp)
$gh.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

$gh.FillRectangle($bgBrush, 0, 0, $hWidth, $hHeight)

$iconStream2 = [System.IO.File]::OpenRead($setupIco)
$icon2 = New-Object System.Drawing.Icon($iconStream2, 32, 32)
$iconBmp2 = $icon2.ToBitmap()
$gh.DrawImage($iconBmp2, [int]($hWidth - 42), [int](($hHeight - 32) / 2), 32, 32)

$headerPath = Join-Path $buildDir "installerHeader.bmp"
$hBmp.Save($headerPath, [System.Drawing.Imaging.ImageFormat]::Bmp)
Write-Host "Saved installerHeader.bmp"

$gh.Dispose()
$hBmp.Dispose()
$iconBmp2.Dispose()
$icon2.Dispose()
$iconStream2.Dispose()

Write-Host "NSIS styling assets generated successfully!"
