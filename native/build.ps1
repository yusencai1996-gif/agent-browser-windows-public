# Trusted local build. Generated bindings and binaries never belong in a source release.
param(
 [Parameter(Mandatory=$true)][string]$InstallRoot,
 [Parameter(Mandatory=$true)][string]$NodePath,
 [Parameter(Mandatory=$true)][string]$SdkPath,
 [Parameter(Mandatory=$true)][string]$DevCmdPath
)
$ErrorActionPreference='Stop'
$buildSource=$PSScriptRoot
$buildUtf8=[Text.UTF8Encoding]::new($false)
function Assert-PlainPath([string]$Target,[bool]$Directory){
 $targetFull=[IO.Path]::GetFullPath($Target)
 for($targetPart=$targetFull;$targetPart;$targetPart=[IO.Path]::GetDirectoryName($targetPart)){
  $targetItem=Get-Item -LiteralPath $targetPart
  if($targetItem.Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'BUILD_REPARSE'}
  if($targetPart -ceq $targetFull -and $targetItem.PSIsContainer -ne $Directory){throw 'BUILD_PATH_TYPE'}
  if($targetPart -eq [IO.Path]::GetPathRoot($targetPart)){break}
 }
 return $targetFull
}
function Write-Utf8([string]$Target,[string]$Text){[IO.File]::WriteAllText($Target,$Text,$buildUtf8)}
function Cpp-Literal([string]$Value){return 'L"'+$Value.Replace('\','\\').Replace('"','\"')+'"'}
$buildRoot=[IO.Path]::GetFullPath($InstallRoot)
if($buildRoot.StartsWith('\\') -or $buildRoot -match '["%!&|<>^\r\n]'){throw 'BUILD_ROOT_UNSUPPORTED'}
if(Test-Path -LiteralPath $buildRoot){throw 'BUILD_ROOT_ALREADY_EXISTS'}
$null=Assert-PlainPath ([IO.Path]::GetDirectoryName($buildRoot)) $true
$buildNode=Assert-PlainPath $NodePath $false
$buildSdk=Assert-PlainPath $SdkPath $true
$buildDev=Assert-PlainPath $DevCmdPath $false
foreach($buildArg in @($buildNode,$buildSdk,$buildDev,$buildSource)){if($buildArg -match '["%!&|<>^\r\n]'){throw 'BUILD_ARGUMENT_UNSUPPORTED'}}
$buildNodeHash=(Get-FileHash -LiteralPath $buildNode -Algorithm SHA256).Hash.ToLowerInvariant()
if($buildNodeHash -cne '96f768b95e8e9d443f5eead1cb2d199744923320bb8240d2c3129362e7ae2a5d'){throw 'OFFICIAL_NODE_26_2_X64_SHA'}
$buildLoader=Join-Path $buildSdk 'build\native\x64\WebView2LoaderStatic.lib'
$null=Assert-PlainPath $buildLoader $false
if((Get-FileHash -LiteralPath $buildLoader).Hash -cne 'E66284970876A616C82E7DCDA75A17FD46D04827F9DE81D4299B8862D34D25D6'){throw 'SDK_1_0_4258_31_PIN'}
# Capture the actual local Windows component hash before any runtime helper launch.
# Component servicing changes require a new empty-root build, not runtime fallback.
$buildPs=Assert-PlainPath (Join-Path ([Environment]::SystemDirectory) 'WindowsPowerShell\v1.0\powershell.exe') $false
$buildPsHash=(Get-FileHash -LiteralPath $buildPs).Hash.ToLowerInvariant()
$env:NODE_OPTIONS='';$env:NODE_PATH=''
$buildVersion=& $buildNode -p 'JSON.stringify({version:process.version,arch:process.arch})'
if($LASTEXITCODE -ne 0){throw 'NODE_EXECUTION'}
$buildVersion=$buildVersion|ConvertFrom-Json
if($buildVersion.version -cne 'v26.2.0' -or $buildVersion.arch -cne 'x64'){throw 'NODE_VERSION'}
$buildPsVersion=& $buildPs -NoProfile -NonInteractive -Command '$PSVersionTable.PSVersion.ToString()'
if($LASTEXITCODE -ne 0 -or $buildPsVersion -notmatch '^5\.1\.'){throw 'SYSTEM_POWERSHELL_5_1'}
New-Item -ItemType Directory -Path $buildRoot|Out-Null
# The source manifest is the copy allowlist: no arbitrary recurse-copy or runtime state.
$buildManifest=Get-Content -LiteralPath (Join-Path $buildSource 'SOURCE-MANIFEST.json') -Raw|ConvertFrom-Json
foreach($buildFile in $buildManifest.files){
 if($buildFile.path -match '(^/|\\|:|(^|/)\.\.(/|$))' -or $buildFile.path -notmatch '^[A-Za-z0-9_.\-/]+$'){throw 'SOURCE_MANIFEST_PATH'}
 $buildInput=Join-Path $buildSource $buildFile.path
 $null=Assert-PlainPath $buildInput $false
 if((Get-FileHash -LiteralPath $buildInput).Hash.ToLowerInvariant() -cne $buildFile.sha256){throw 'SOURCE_MANIFEST_HASH'}
 $buildDest=Join-Path $buildRoot $buildFile.path
 if(-not $buildDest.StartsWith($buildRoot+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'SOURCE_MANIFEST_SCOPE'}
 [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($buildDest))|Out-Null
 Copy-Item -LiteralPath $buildInput -Destination $buildDest
}
foreach($buildDir in @('.local','.local\profile','.local\runs','dist','obj','.local\build-temp')){[IO.Directory]::CreateDirectory((Join-Path $buildRoot $buildDir))|Out-Null}
$buildBinding=@{root=$buildRoot;profile=(Join-Path $buildRoot '.local\profile');runs=(Join-Path $buildRoot '.local\runs');node=$buildNode;powershell=$buildPs}
Write-Utf8 (Join-Path $buildRoot 'binding.json') (($buildBinding|ConvertTo-Json)+"`n")
$buildHeader="#pragma once`nnamespace binding {`n"
foreach($buildName in @('root','profile','runs')){$buildHeader+='inline constexpr wchar_t '+$buildName+'[] = '+(Cpp-Literal $buildBinding[$buildName])+";`n"}
Write-Utf8 (Join-Path $buildRoot 'src\build-binding.h') ($buildHeader+"}`n")
Write-Utf8 (Join-Path $buildRoot 'PROFILE-CREATED.json') ((@{path=$buildBinding.profile;createdEmpty=$true}|ConvertTo-Json)+"`n")
$buildFlags='cl.exe /nologo /std:c++17 /utf-8 /MT /EHsc /W4 /DUNICODE /D_UNICODE /D_WIN32_WINNT=0x0A00'
$buildInclude=' /I"'+$buildSdk+'\build\native\include"'
$buildLines=@('@echo off','chcp 65001 >nul',('set "TEMP='+$buildRoot+'\.local\build-temp"'),('set "TMP='+$buildRoot+'\.local\build-temp"'),('call "'+$buildDev+'" -no_logo -arch=amd64 -host_arch=amd64'),'if errorlevel 1 exit /b 1',
 ($buildFlags+$buildInclude+' /Fo"'+$buildRoot+'\obj\main.obj" /Fe"'+$buildRoot+'\dist\abw19e-host.exe" "'+$buildRoot+'\src\main.cpp" /link /SUBSYSTEM:WINDOWS "'+$buildLoader+'" user32.lib gdi32.lib ole32.lib shlwapi.lib shell32.lib version.lib dcomp.lib windowscodecs.lib uuid.lib advapi32.lib dwmapi.lib ws2_32.lib winhttp.lib comctl32.lib'),'if errorlevel 1 exit /b 1',
 ($buildFlags+' /Fo"'+$buildRoot+'\obj\gate.obj" /Fe"'+$buildRoot+'\dist\pipe-gate.exe" "'+$buildRoot+'\src\pipe-gate.cpp" /link advapi32.lib'),'exit /b %errorlevel%')
$buildCmd=Join-Path $buildRoot '.local\build-temp\compile.cmd'
Write-Utf8 $buildCmd (($buildLines -join "`r`n")+"`r`n")
& (Join-Path ([Environment]::SystemDirectory) 'cmd.exe') /d /c $buildCmd 2>&1|Tee-Object -FilePath (Join-Path $buildRoot '.local\build-temp\compile.log')
if($LASTEXITCODE -ne 0){throw 'BUILD_FAILED_RETAIN_NEW_ROOT'}
$buildBinaries=@{}
foreach($buildExe in @('abw19e-host.exe','pipe-gate.exe')){$buildBinaries[$buildExe]=(Get-FileHash -LiteralPath (Join-Path $buildRoot ('dist\'+$buildExe))).Hash.ToLowerInvariant()}
$buildRuntimes=@{};$buildRuntimes[$buildNode]=$buildNodeHash;$buildRuntimes[$buildPs]=$buildPsHash
Write-Utf8 (Join-Path $buildRoot 'BINARY-PIN.json') ((@{version='0.10.0-alpha.1';candidateRoot=$buildRoot;binaries=$buildBinaries;runtimeHashes=$buildRuntimes}|ConvertTo-Json -Depth 6)+"`n")
$buildEntry=@('@echo off','setlocal','set "NODE_OPTIONS="','set "NODE_PATH="',('"'+$buildNode+'" "%~dp0scripts\public-client.mjs" %*'),'exit /b %errorlevel%')
Write-Utf8 (Join-Path $buildRoot 'abw.cmd') (($buildEntry -join "`r`n")+"`r`n")
Write-Utf8 (Join-Path $buildRoot 'overview.cmd') "@echo off`r`ncall `"%~dp0abw.cmd`" start`r`nexit /b %errorlevel%`r`n"
Write-Output 'BUILD_OK: same-machine binding; no browser started; do not redistribute this generated root.'
