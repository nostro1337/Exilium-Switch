; Exilium Switch NSIS Custom Script
; Modern Dark Minimalist Theme & Windows 10/11 Integration

!macro customInstall
  DetailPrint "Configuring Exilium Switch Windows AUMID..."
  
  ; Write AppUserModelID registry key for Windows Action Center and Taskbar
  WriteRegStr HKCU "Software\Classes\AppUserModelId\Exilium Switch" "DisplayName" "Exilium Switch"
  WriteRegStr HKCU "Software\Classes\AppUserModelId\Exilium Switch" "IconUri" "$INSTDIR\Exilium Switch.exe,0"
  
  ; Ensure clean shortcuts in Start Menu and Desktop
  CreateDirectory "$SMPROGRAMS"
  CreateShortCut "$SMPROGRAMS\Exilium Switch.lnk" "$INSTDIR\Exilium Switch.exe" "" "$INSTDIR\Exilium Switch.exe" 0 "" "" "Exilium Switch — Resident Shield"
  CreateShortCut "$DESKTOP\Exilium Switch.lnk" "$INSTDIR\Exilium Switch.exe" "" "$INSTDIR\Exilium Switch.exe" 0 "" "" "Exilium Switch — Resident Shield"
!macroend

!macro customUnInstall
  Delete "$SMPROGRAMS\Exilium Switch.lnk"
  Delete "$DESKTOP\Exilium Switch.lnk"
  DeleteRegKey HKCU "Software\Classes\AppUserModelId\Exilium Switch"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Exilium Switch"
!macroend
