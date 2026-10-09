param([Parameter(Mandatory=$true)][uint32]$BrowserPid,[Parameter(Mandatory=$true)][string]$CreationHex,[Parameter(Mandatory=$true)][string]$ExpectedUdf,[ValidateRange(0,20000)][int]$WaitForExitMs=0)
$ErrorActionPreference='Stop';$binding=Get-Content -LiteralPath (Join-Path $PSScriptRoot '..\binding.json') -Raw -Encoding UTF8 | ConvertFrom-Json;Import-Module (Join-Path $PSScriptRoot 'observer-policy.psm1') -Force
$wvHandle=[IntPtr]::Zero;$wvFolder=[IntPtr]::Zero;$wvBrowserFolder=[IntPtr]::Zero
try{
 $wvFull=[IO.Path]::GetFullPath($ExpectedUdf);$wvRun=[IO.Directory]::GetParent($wvFull)
 if($CreationHex -notmatch '^[0-9a-fA-F]{16}$' -or $wvFull -ine $binding.profile){throw 'OBSERVER_UDF_SCOPE'}
 Add-Type @'
using System;using System.Runtime.InteropServices;using System.Text;using System.Collections.Generic;
public static class WV19ProcessIdentity {
 [DllImport("kernel32.dll",SetLastError=true)]public static extern IntPtr OpenProcess(uint access,bool inherit,uint pid);
 [DllImport("kernel32.dll")]public static extern bool GetProcessTimes(IntPtr handle,out System.Runtime.InteropServices.ComTypes.FILETIME created,out System.Runtime.InteropServices.ComTypes.FILETIME exited,out System.Runtime.InteropServices.ComTypes.FILETIME kernel,out System.Runtime.InteropServices.ComTypes.FILETIME user);
 [DllImport("kernel32.dll")]public static extern uint WaitForSingleObject(IntPtr handle,uint timeout);
 [DllImport("kernel32.dll")]public static extern bool CloseHandle(IntPtr handle);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode)]public static extern bool QueryFullProcessImageName(IntPtr h,uint flags,StringBuilder path,ref uint length);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)]public static extern IntPtr CreateFile(string p,uint access,uint share,IntPtr security,uint creation,uint flags,IntPtr template);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode)]public static extern uint GetFinalPathNameByHandle(IntPtr h,StringBuilder path,uint length,uint flags);
 [DllImport("shell32.dll",CharSet=CharSet.Unicode)]static extern IntPtr CommandLineToArgvW(string command,out int count);
 [DllImport("kernel32.dll")]static extern IntPtr LocalFree(IntPtr memory);
 public static string[] Args(string command){int count;var memory=CommandLineToArgvW(command,out count);if(memory==IntPtr.Zero)throw new Exception("COMMAND_PARSE_UNKNOWN");try{var r=new List<string>();for(int i=0;i<count;i++)r.Add(Marshal.PtrToStringUni(Marshal.ReadIntPtr(memory,i*IntPtr.Size)));return r.ToArray();}finally{LocalFree(memory);}}
}
'@
 # Environment7 remains the configured UDF root. The Runtime appends exactly
 # EBWebView for its Chromium user-data-dir (Microsoft Learn Step 2 contract).
 $wvBrowserFull=Join-Path $wvFull 'EBWebView'
 $wvAncestors=@($wvBrowserFull);for($wvAncestor=$wvFull;$wvAncestor;$wvAncestor=[IO.Path]::GetDirectoryName($wvAncestor)){$wvAncestors+=$wvAncestor;if($wvAncestor -eq [IO.Path]::GetPathRoot($wvAncestor)){break}}
 foreach($wvPath in $wvAncestors){if(-not(Test-Path -LiteralPath $wvPath -PathType Container) -or ((Get-Item -LiteralPath $wvPath -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)){throw 'UDF_CANONICAL_UNKNOWN'}}
 $wvFolder=[WV19ProcessIdentity]::CreateFile($wvFull,0x80,3,[IntPtr]::Zero,3,0x02200000,[IntPtr]::Zero);if($wvFolder.ToInt64() -eq -1){throw 'UDF_HANDLE_UNKNOWN'}
 $wvCanonicalBuffer=[Text.StringBuilder]::new(32768);if([WV19ProcessIdentity]::GetFinalPathNameByHandle($wvFolder,$wvCanonicalBuffer,32768,0) -eq 0){throw 'UDF_CANONICAL_UNKNOWN'};$wvCanonical=$wvCanonicalBuffer.ToString();if($wvCanonical.StartsWith('\\?\')){$wvCanonical=$wvCanonical.Substring(4)}
 if(-not [string]::Equals($wvCanonical,$wvFull,[StringComparison]::OrdinalIgnoreCase)){throw 'UDF_CANONICAL_MISMATCH'}
 $wvBrowserFolder=[WV19ProcessIdentity]::CreateFile($wvBrowserFull,0x80,3,[IntPtr]::Zero,3,0x02200000,[IntPtr]::Zero);if($wvBrowserFolder.ToInt64() -eq -1){throw 'BROWSER_UDF_HANDLE_UNKNOWN'}
 $wvBrowserBuffer=[Text.StringBuilder]::new(32768);if([WV19ProcessIdentity]::GetFinalPathNameByHandle($wvBrowserFolder,$wvBrowserBuffer,32768,0) -eq 0){throw 'BROWSER_UDF_CANONICAL_UNKNOWN'};$wvBrowserCanonical=$wvBrowserBuffer.ToString();if($wvBrowserCanonical.StartsWith('\\?\')){$wvBrowserCanonical=$wvBrowserCanonical.Substring(4)}
 if(-not [string]::Equals($wvBrowserCanonical,$wvBrowserFull,[StringComparison]::OrdinalIgnoreCase)){throw 'BROWSER_UDF_CANONICAL_MISMATCH'}
 $wvHandle=[WV19ProcessIdentity]::OpenProcess(0x00101000,$false,$BrowserPid);if($wvHandle -eq [IntPtr]::Zero){throw 'BROWSER_IDENTITY_UNKNOWN'}
 $wvCreated=[Runtime.InteropServices.ComTypes.FILETIME]::new();$wvExited=$wvCreated;$wvKernel=$wvCreated;$wvUser=$wvCreated
 if(-not [WV19ProcessIdentity]::GetProcessTimes($wvHandle,[ref]$wvCreated,[ref]$wvExited,[ref]$wvKernel,[ref]$wvUser)){throw 'CREATION_IDENTITY_UNKNOWN'}
 $wvHigh=[BitConverter]::ToUInt32([BitConverter]::GetBytes($wvCreated.dwHighDateTime),0);$wvLow=[BitConverter]::ToUInt32([BitConverter]::GetBytes($wvCreated.dwLowDateTime),0);$wvActual=('{0:x8}{1:x8}' -f $wvHigh,$wvLow)
 $wvImage=[Text.StringBuilder]::new(32768);$wvLength=[uint32]32768;if(-not [WV19ProcessIdentity]::QueryFullProcessImageName($wvHandle,0,$wvImage,[ref]$wvLength)){throw 'IMAGE_IDENTITY_UNKNOWN'}
 $wvProcess=Get-CimInstance Win32_Process -Filter "ProcessId=$BrowserPid" -ErrorAction Stop;if(-not $wvProcess){throw 'CIM_IDENTITY_UNKNOWN'}
 $wvPolicy=Test-WVObserverPolicy -ProcessInfo $wvProcess -Arguments ([WV19ProcessIdentity]::Args($wvProcess.CommandLine)) -ExpectedPid $BrowserPid -ExpectedCreation $CreationHex -ActualCreation $wvActual -ExpectedCanonical $wvBrowserCanonical -ActualImage $wvImage.ToString() -Live ([WV19ProcessIdentity]::WaitForSingleObject($wvHandle,0) -eq 258)
 if([WV19ProcessIdentity]::WaitForSingleObject($wvHandle,0) -ne 258){throw 'EARLY_EXIT_BEFORE_READY'}
 [pscustomobject]@{observerReady=$true;creationIdentityMatch=$true;udfCanonicalMatch=$true;imageIdentityMatch=$true;browserStillLive=$true} | ConvertTo-Json -Compress
 $wvIsExited=[WV19ProcessIdentity]::WaitForSingleObject($wvHandle,$WaitForExitMs) -eq 0
 [pscustomobject]@{creationIdentityMatch=$true;browserExited=$wvIsExited;cleanupPermitted=$wvIsExited;processKilled=$false} | ConvertTo-Json -Compress
}catch{
 $wvReason=if($_.Exception.Message -match '^[A-Z_]+$'){$_.Exception.Message}else{'OBSERVER_IDENTITY_UNKNOWN'}
 [pscustomobject]@{observerReady=$false;cleanupPermitted=$false;browserExited=$false;reason=$wvReason;runMustBeRetained=$true} | ConvertTo-Json -Compress
 exit 1
}finally{if($wvHandle -ne [IntPtr]::Zero){[WV19ProcessIdentity]::CloseHandle($wvHandle)|Out-Null};if($wvFolder -ne [IntPtr]::Zero -and $wvFolder.ToInt64() -ne -1){[WV19ProcessIdentity]::CloseHandle($wvFolder)|Out-Null};if($wvBrowserFolder -ne [IntPtr]::Zero -and $wvBrowserFolder.ToInt64() -ne -1){[WV19ProcessIdentity]::CloseHandle($wvBrowserFolder)|Out-Null}}
