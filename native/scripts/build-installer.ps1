param([Parameter(Mandatory=$true)][string]$SdkPath,[Parameter(Mandatory=$true)][string]$DevCmdPath,[Parameter(Mandatory=$true)][string]$TemporaryParent)
$ErrorActionPreference='Stop';$buildRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$buildOutput=Join-Path $buildRoot 'build';[IO.Directory]::CreateDirectory($buildOutput)|Out-Null
$buildTemp=Join-Path $TemporaryParent ('abw-installer-build-'+[Guid]::NewGuid().ToString('D'));[IO.Directory]::CreateDirectory($buildTemp)|Out-Null
$buildLoader=Join-Path $SdkPath 'build\native\x64\WebView2LoaderStatic.lib'
if((Get-FileHash -LiteralPath $buildLoader).Hash -cne 'E66284970876A616C82E7DCDA75A17FD46D04827F9DE81D4299B8862D34D25D6'){throw 'SDK_PIN'}
$buildFlags='cl.exe /nologo /std:c++17 /utf-8 /MT /EHsc /W4 /DUNICODE /D_UNICODE /D_WIN32_WINNT=0x0A00'
$buildInclude=' /I"'+$SdkPath+'\build\native\include" /I"'+$buildOutput+'"'
$buildPrefix=@('@echo off','chcp 65001 >nul',('set "TEMP='+$buildTemp+'"'),('set "TMP='+$buildTemp+'"'),('call "'+$DevCmdPath+'" -no_logo -arch=amd64 -host_arch=amd64'),'if errorlevel 1 exit /b 1')
$buildLines=$buildPrefix+@(($buildFlags+$buildInclude+' /Fo"'+$buildOutput+'\main.obj" /Fe"'+$buildOutput+'\abw19e-host.exe" "'+$buildRoot+'\src\main.cpp" /link /SUBSYSTEM:WINDOWS "'+$buildLoader+'" user32.lib gdi32.lib ole32.lib shlwapi.lib shell32.lib version.lib dcomp.lib windowscodecs.lib uuid.lib advapi32.lib dwmapi.lib ws2_32.lib winhttp.lib comctl32.lib bcrypt.lib wintrust.lib crypt32.lib'),'if errorlevel 1 exit /b 1',($buildFlags+' /Fo"'+$buildOutput+'\gate.obj" /Fe"'+$buildOutput+'\pipe-gate.exe" "'+$buildRoot+'\src\pipe-gate.cpp" /link advapi32.lib bcrypt.lib wintrust.lib crypt32.lib'),'exit /b %errorlevel%')
$buildCmd=Join-Path $buildTemp 'compile-core.cmd';[IO.File]::WriteAllLines($buildCmd,$buildLines,[Text.UTF8Encoding]::new($false));& $env:ComSpec /d /c $buildCmd;if($LASTEXITCODE -ne 0){throw 'CORE_BUILD_FAILED'}
& python (Join-Path $PSScriptRoot 'prepare-payload.py');if($LASTEXITCODE -ne 0){throw 'PAYLOAD_FAILED'}
$buildLines=$buildPrefix+@(($buildFlags+$buildInclude+' /Fo"'+$buildOutput+'\launcher.obj" /Fe"'+$buildOutput+'\abw.exe" "'+$buildRoot+'\src\launcher.cpp" /link "'+$buildLoader+'" user32.lib ole32.lib shell32.lib version.lib advapi32.lib bcrypt.lib wintrust.lib crypt32.lib'),'exit /b %errorlevel%')
$buildCmd=Join-Path $buildTemp 'compile-launcher.cmd';[IO.File]::WriteAllLines($buildCmd,$buildLines,[Text.UTF8Encoding]::new($false));& $env:ComSpec /d /c $buildCmd;if($LASTEXITCODE -ne 0){throw 'LAUNCHER_BUILD_FAILED'}
Copy-Item -LiteralPath (Join-Path $buildOutput 'abw.exe') -Destination (Join-Path $buildRoot 'payload\abw.exe')
[pscustomobject]@{coreCompiled=$true;launcherCompiled=$true;temporary=$buildTemp;browserStarted=$false}|ConvertTo-Json -Compress
