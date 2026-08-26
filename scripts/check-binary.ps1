$exe = Join-Path $PSScriptRoot "..\release\win-unpacked\Exilium Switch.exe"
if (Test-Path $exe) {
    $item = Get-Item $exe
    $vi = $item.VersionInfo
    Write-Host "File Name:         " $item.Name
    Write-Host "File Description:  " $vi.FileDescription
    Write-Host "Product Name:      " $vi.ProductName
    Write-Host "Product Version:   " $vi.ProductVersion
    Write-Host "File Version:      " $vi.FileVersion
    Write-Host "Company Name:      " $vi.CompanyName
    Write-Host "Legal Copyright:   " $vi.LegalCopyright
} else {
    Write-Host "Binary not found!"
}
