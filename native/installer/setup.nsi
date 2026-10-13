Unicode true
!include "MUI2.nsh"
!include "FileFunc.nsh"
!include "x64.nsh"
!include "WinVer.nsh"
Name "Agent Browser Native 0.10.0-alpha.2"
OutFile "..\out\AgentBrowser-0.10.0-alpha.2-x64-Setup.exe"
InstallDir "$LOCALAPPDATA\AgentBrowserNative"
RequestExecutionLevel user
SetCompressor /SOLID lzma
!define MUI_ABORTWARNING
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "..\LICENSE"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"
!insertmacro MUI_LANGUAGE "SimpChinese"
Var Result
Var LeaseCount
Var LeasePath
Var ParentPath
Var LeaseHandle
Var BootstrapOutput

Function EmitBootstrapError
  ${If} $BootstrapOutput == ""
    StrCpy $BootstrapOutput '{$\"ok$\":false,$\"error$\":{$\"code$\":$\"BOOTSTRAP_OUTPUT_UNKNOWN$\"}}'
  ${EndIf}
  ; abw's failure envelope contains only a bounded uppercase code. Use a
  ; register argument, not an interpolated System::Call string literal.
  StrCpy $2 "$BootstrapOutput$\r$\n"
  StrLen $1 $2
  System::Call 'kernel32::GetStdHandle(i -11) p.r0'
  System::Call 'kernel32::WriteFile(p r0, m r2, i r1, *i.r3, p 0)'
FunctionEnd

Function .onInit
  ${IfNot} ${AtLeastWin10}
    MessageBox MB_ICONSTOP "This preview requires Windows 10/11 x64. Check the release notes for actually validated versions." /SD IDOK
    SetErrorLevel 2
    Abort
  ${EndIf}
  ${IfNot} ${RunningX64}
    MessageBox MB_ICONSTOP "This preview requires Windows x64." /SD IDOK
    SetErrorLevel 2
    Abort
  ${EndIf}
  IfFileExists "$SMPROGRAMS\Agent Browser Native" 0 shortcuts_clear
    MessageBox MB_ICONSTOP "The application's Start Menu directory already exists. This preview will not overwrite unknown shortcuts." /SD IDOK
    SetErrorLevel 2
    Abort
 shortcuts_clear:
  ReadRegStr $Result HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\AgentBrowserNative" "UninstallString"
  ${If} $Result != ""
    MessageBox MB_ICONSTOP "An installation is already registered. This preview does not upgrade or overwrite an existing installation." /SD IDOK
    SetErrorLevel 2
    Abort
  ${EndIf}
  InitPluginsDir
  SetOutPath "$PLUGINSDIR"
  File /oname=abw.exe "..\payload\abw.exe"
  nsExec::ExecToStack '"$PLUGINSDIR\abw.exe" --check-prerequisites'
  Pop $Result
  Pop $BootstrapOutput
  ${If} $Result != 0
    Call EmitBootstrapError
    MessageBox MB_ICONSTOP "Prerequisite check failed: $BootstrapOutput$\r$\nWindows PowerShell 5.1 and WebView2 Evergreen Runtime are required. Official WebView2 guide: https://developer.microsoft.com/microsoft-edge/webview2/ . Install the missing dependency and run Setup again." /SD IDOK
    SetErrorLevel 3
    Abort
  ${EndIf}
FunctionEnd

Function .onVerifyInstDir
  ; Fresh installation only: even an empty pre-existing directory is unknown.
  IfFileExists "$INSTDIR" occupied
  Return
 occupied:
  Abort
FunctionEnd

Section "Install"
  IfFileExists "$INSTDIR" exists
  nsExec::ExecToStack '"$PLUGINSDIR\abw.exe" --prepare-root "$INSTDIR"'
  Pop $Result
  Pop $BootstrapOutput
  ${If} $Result != 0
    Call EmitBootstrapError
    MessageBox MB_ICONSTOP "Cannot create a fresh private installation directory: $BootstrapOutput" /SD IDOK
    SetErrorLevel 2
    Abort
  ${EndIf}
  !include "payload-files.nsh"
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  nsExec::ExecToStack '"$INSTDIR\abw.exe" --install'
  Pop $Result
  Pop $BootstrapOutput
  ${If} $Result != 0
    Call EmitBootstrapError
    MessageBox MB_ICONSTOP "Installation could not be finalized: $BootstrapOutput. Files were retained for inspection; no existing browser data was changed." /SD IDOK
    SetErrorLevel 13
    Abort
  ${EndIf}
  CreateDirectory "$SMPROGRAMS\Agent Browser Native"
  CreateShortcut "$SMPROGRAMS\Agent Browser Native\Agent Browser.lnk" "$INSTDIR\abw.exe" "--overview"
  CreateShortcut "$SMPROGRAMS\Agent Browser Native\Repair Windows Runtime Binding.lnk" "$INSTDIR\abw.exe" "--repair-runtime"
  CreateShortcut "$SMPROGRAMS\Agent Browser Native\Uninstall.lnk" "$INSTDIR\Uninstall.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\AgentBrowserNative" "DisplayName" "Agent Browser Native"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\AgentBrowserNative" "DisplayVersion" "0.10.0-alpha.2"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\AgentBrowserNative" "UninstallString" '$\"$INSTDIR\Uninstall.exe$\"'
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\AgentBrowserNative" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\AgentBrowserNative" "NoRepair" 1
  Goto done
 exists:
  MessageBox MB_ICONSTOP "The selected directory already exists. This preview only supports a fresh installation. Choose a new directory; do not delete existing data." /SD IDOK
  SetErrorLevel 2
  Abort
 done:
SectionEnd

Function un.HoldDirectory
  System::Call 'kernel32::CreateFileW(w "$LeasePath", i 0x80, i 3, p 0, i 3, i 0x2200000, p 0) p.r0'
  StrCpy $LeaseHandle $0
  ${If} $LeaseHandle == -1
    MessageBox MB_ICONSTOP "A program directory is in use or cannot be verified. Uninstall stopped." /SD IDOK
    SetErrorLevel 4
    Abort
  ${EndIf}
  Push $LeaseHandle
  IntOp $LeaseCount $LeaseCount + 1
FunctionEnd

Function un.onInit
  ; Keep a same-version checker available even after partial program removal.
  InitPluginsDir
  SetOutPath "$PLUGINSDIR"
  File /oname=abw.exe "..\payload\abw.exe"
FunctionEnd

Section "Uninstall"
  StrCpy $LeaseCount 0
  StrCpy $LeasePath "$INSTDIR"
 holdParent:
  Call un.HoldDirectory
  ${GetParent} "$LeasePath" $ParentPath
  StrLen $0 $ParentPath
  ${If} $0 == 2
    StrCpy $ParentPath "$ParentPath\"
  ${EndIf}
  ${If} $ParentPath != ""
  ${AndIf} $ParentPath != $LeasePath
    StrCpy $LeasePath "$ParentPath"
    Goto holdParent
  ${EndIf}
  ; Generated list holds only static program directories, never Profile/state.
  !include "payload-hold-directories.nsh"
  ExecWait '"$PLUGINSDIR\abw.exe" --uninstall-check-root "$INSTDIR"' $Result
  ${If} $Result != 0
    MessageBox MB_ICONSTOP "The installation is active, changed or cannot be verified. Nothing was deleted. Close owned tasks normally and retry." /SD IDOK
    SetErrorLevel 4
    Abort
  ${EndIf}
  !include "payload-delete-files.nsh"
  ; Binding/ownership records are retained as data so interrupted removal can
  ; be retried. The uninstaller is the final program entry removed.
  ClearErrors
  Delete "$INSTDIR\Uninstall.exe"
  ${If} ${Errors}
    MessageBox MB_ICONSTOP "The uninstall entry is occupied. Other data and retry records were retained; retry after it is released." /SD IDOK
    SetErrorLevel 5
    Abort
  ${EndIf}
 release:
  ${If} $LeaseCount > 0
    Pop $LeaseHandle
    System::Call 'kernel32::CloseHandle(p $LeaseHandle)'
    IntOp $LeaseCount $LeaseCount - 1
    Goto release
  ${EndIf}
  !include "payload-remove-empty-directories.nsh"
  Delete "$SMPROGRAMS\Agent Browser Native\Agent Browser.lnk"
  Delete "$SMPROGRAMS\Agent Browser Native\Repair Windows Runtime Binding.lnk"
  Delete "$SMPROGRAMS\Agent Browser Native\Uninstall.lnk"
  RMDir "$SMPROGRAMS\Agent Browser Native"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\AgentBrowserNative"
  ; Root/data are intentionally retained. No RMDir /r, wildcard or reboot delete.
  MessageBox MB_OK "Program files removed. Profile, state archives, screenshots and unknown files were retained in the installation directory." /SD IDOK
SectionEnd
