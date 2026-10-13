param([ValidateSet('VerifyLease','Assess','Retire','AssessClaim','RetireClaim')][string]$Action,[uint32]$LeasePid,[string]$LeaseBirth,[uint32]$NodePid,[string]$NewClaimId,[string]$ExpectedSnapshot)
$ErrorActionPreference='Stop';[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$binding=Get-Content -LiteralPath (Join-Path $PSScriptRoot '..\binding.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$recoveryRoot=$binding.root
$recoveryProfile=$binding.profile
$recoveryNode=$binding.node
$recoveryPs=$binding.powershell
$recoveryVersion='0.10.0-alpha.1'
$recoveryHeld=$null;$recoveryPipe=[IntPtr]::Zero
try{
 if($PSScriptRoot -ine (Join-Path $recoveryRoot 'scripts') -or $LeaseBirth -notmatch '^[a-f0-9]{16}$' -or $NewClaimId -notmatch '^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$'){throw 'RECOVERY_SCOPE'}
 Add-Type @'
using System;using System.IO;using System.Text;using System.Collections.Generic;using System.Runtime.InteropServices;using Microsoft.Win32.SafeHandles;
public sealed class DeadStateHandles:IDisposable {
 [StructLayout(LayoutKind.Sequential)]public struct FileInfo {public uint attributes;public System.Runtime.InteropServices.ComTypes.FILETIME creation,access,write;public uint volume,sizeHi,sizeLo,links,indexHi,indexLo;}
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)]static extern IntPtr CreateFile(string p,uint a,uint s,IntPtr sec,uint create,uint flags,IntPtr template);
 [DllImport("kernel32.dll",SetLastError=true)]static extern bool GetFileInformationByHandle(IntPtr h,out FileInfo info);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)]static extern uint GetFinalPathNameByHandle(IntPtr h,StringBuilder p,uint n,uint flags);
 [DllImport("kernel32.dll",SetLastError=true)]static extern bool CloseHandle(IntPtr h);
 [DllImport("kernel32.dll",SetLastError=true)]static extern bool SetFileInformationByHandle(IntPtr h,int cls,IntPtr b,uint n);
 [DllImport("kernel32.dll",SetLastError=true)]static extern IntPtr OpenProcess(uint a,bool inherit,uint pid);
 [DllImport("kernel32.dll")]static extern uint WaitForSingleObject(IntPtr h,uint ms);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)]static extern IntPtr OpenMutex(uint a,bool inherit,string name);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)]static extern bool WaitNamedPipe(string name,uint ms);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)]static extern IntPtr CreateNamedPipe(string name,uint mode,uint type,uint count,uint outSize,uint inSize,uint timeout,IntPtr security);
 [DllImport("shell32.dll",CharSet=CharSet.Unicode)]static extern IntPtr CommandLineToArgvW(string text,out int count);
 [DllImport("kernel32.dll")]static extern IntPtr LocalFree(IntPtr p);
 public static string[] Args(string text){int n;IntPtr p=CommandLineToArgvW(text,out n);if(p==IntPtr.Zero)throw new Exception("RECOVERY_COMMAND_UNKNOWN");try{string[] args=new string[n];for(int i=0;i<n;i++)args[i]=Marshal.PtrToStringUni(Marshal.ReadIntPtr(p,i*IntPtr.Size));return args;}finally{LocalFree(p);}}
 static bool Invalid(IntPtr h){return h==IntPtr.Zero||h==new IntPtr(-1);}
 List<IntPtr> held=new List<IntPtr>(),readFiles=new List<IntPtr>();public IntPtr state,parent;
 public IntPtr HoldDirectory(string p,bool rename){IntPtr h=CreateFile(p,0x80u|(rename?0x10000u:0u),3,IntPtr.Zero,3,0x02200000,IntPtr.Zero);if(Invalid(h))throw new Exception("RECOVERY_DIRECTORY_BUSY_OR_UNKNOWN");try{Check(h,p,true);held.Add(h);return h;}catch{CloseHandle(h);throw;}}
 public void Ancestors(string p){for(string q=Path.GetFullPath(p);!String.IsNullOrEmpty(q);q=Path.GetDirectoryName(q)){HoldDirectory(q,false);if(q==Path.GetPathRoot(q))break;}}
 static void Check(IntPtr h,string p,bool dir){FileInfo info;if(!GetFileInformationByHandle(h,out info)||(info.attributes&0x400)!=0||((info.attributes&16)!=0)!=dir||(!dir&&info.links!=1))throw new Exception("RECOVERY_FILE_TYPE");StringBuilder final=new StringBuilder(32768);uint n=GetFinalPathNameByHandle(h,final,32768,0);string actual=final.ToString();if(actual.StartsWith("\\\\?\\"))actual=actual.Substring(4);if(n==0||n>=32768||!String.Equals(actual,Path.GetFullPath(p),StringComparison.OrdinalIgnoreCase))throw new Exception("RECOVERY_FINAL_PATH");}
 public byte[] ReadHeld(string p){IntPtr h=CreateFile(p,0x80000000,1,IntPtr.Zero,3,0x00200000,IntPtr.Zero);if(Invalid(h))throw new Exception("RECOVERY_STATE_BUSY_OR_UNKNOWN");try{Check(h,p,false);FileInfo info;GetFileInformationByHandle(h,out info);if(info.sizeHi!=0||info.sizeLo>65536)throw new Exception("RECOVERY_STATE_LIMIT");held.Add(h);readFiles.Add(h);using(var f=new FileStream(new SafeFileHandle(h,false),FileAccess.Read)){byte[] b=new byte[info.sizeLo];int offset=0;while(offset<b.Length){int n=f.Read(b,offset,b.Length-offset);if(n==0)throw new Exception("RECOVERY_READ_UNKNOWN");offset+=n;}return b;}}catch{if(!held.Contains(h))CloseHandle(h);throw;}}
 // Windows directory rename rejects our own non-share-delete child handles.
 // Close ONLY this helper's reads after the final snapshot check. Keep the
 // exclusive state/ancestor handles and pipe/start lease; other processes'
 // incompatible handles still make the atomic rename fail, with no fallback.
 public void ReleaseOwnReads(){foreach(IntPtr h in readFiles){CloseHandle(h);held.Remove(h);}readFiles.Clear();}
 public static void Dead(uint pid){if(pid==0)throw new Exception("RECOVERY_PID_INVALID");IntPtr h=OpenProcess(0x00101000,false,pid);if(Invalid(h)){if(Marshal.GetLastWin32Error()==87)return;throw new Exception("RECOVERY_PID_UNKNOWN");}try{if(WaitForSingleObject(h,0)==0)return;throw new Exception("RECOVERY_PID_LIVE_OR_REUSED");}finally{CloseHandle(h);}}
 public static void NoMutex(string name){IntPtr h=OpenMutex(0x00100000,false,name);if(!Invalid(h)){CloseHandle(h);throw new Exception("RECOVERY_MUTEX_IN_USE");}if(Marshal.GetLastWin32Error()!=2)throw new Exception("RECOVERY_MUTEX_UNKNOWN");}
 public static void PipeAbsent(string name){if(WaitNamedPipe(name,1))throw new Exception("RECOVERY_PIPE_IN_USE");if(Marshal.GetLastWin32Error()!=2)throw new Exception("RECOVERY_PIPE_UNKNOWN");}
 public static IntPtr ReservePipe(string name,string sid){IntPtr sd;uint n;if(!ConvertStringSecurityDescriptorToSecurityDescriptor("D:P(A;;GA;;;"+sid+")",1,out sd,out n))throw new Exception("RECOVERY_PIPE_ACL");try{Security sa=new Security();sa.length=Marshal.SizeOf(typeof(Security));sa.descriptor=sd;IntPtr mem=Marshal.AllocHGlobal(sa.length);try{Marshal.StructureToPtr(sa,mem,false);IntPtr p=CreateNamedPipe(name,0x00080003,8,1,4096,4096,0,mem);if(Invalid(p))throw new Exception("RECOVERY_PIPE_RACE");return p;}finally{Marshal.FreeHGlobal(mem);}}finally{LocalFree(sd);}}
 [StructLayout(LayoutKind.Sequential)]struct Security{public int length;public IntPtr descriptor;public int inherit;}
 [DllImport("advapi32.dll",CharSet=CharSet.Unicode,SetLastError=true)]static extern bool ConvertStringSecurityDescriptorToSecurityDescriptor(string s,uint revision,out IntPtr p,out uint size);
 public static void Close(IntPtr h){if(!Invalid(h))CloseHandle(h);}
 public static string PhysicalDirectory(string p){IntPtr h=CreateFile(p,0x80,7,IntPtr.Zero,3,0x02000000,IntPtr.Zero);if(Invalid(h))throw new Exception("RECOVERY_PROFILE_PATH_UNKNOWN");try{FileInfo info;if(!GetFileInformationByHandle(h,out info)||(info.attributes&16)==0)throw new Exception("RECOVERY_PROFILE_PATH_UNKNOWN");StringBuilder final=new StringBuilder(32768);uint n=GetFinalPathNameByHandle(h,final,32768,0);if(n==0||n>=32768)throw new Exception("RECOVERY_PROFILE_PATH_UNKNOWN");string r=final.ToString();return (r.StartsWith("\\\\?\\")?r.Substring(4):r).TrimEnd('\\');}finally{CloseHandle(h);}}
 public void Rename(string leaf){if(leaf.IndexOfAny(new char[]{'\\','/',':'})>=0)throw new Exception("RECOVERY_TARGET_SCOPE");StringBuilder root=new StringBuilder(32768);uint n=GetFinalPathNameByHandle(parent,root,32768,0);if(n==0||n>=32768)throw new Exception("RECOVERY_PARENT_UNKNOWN");string canonical=root.ToString();if(canonical.StartsWith("\\\\?\\"))canonical=canonical.Substring(4);string target=Path.Combine(canonical,leaf);byte[] name=Encoding.Unicode.GetBytes(target);int rootOffset=IntPtr.Size==8?8:4,lengthOffset=rootOffset+IntPtr.Size,nameOffset=lengthOffset+4;int size=nameOffset+name.Length+2;IntPtr buffer=Marshal.AllocHGlobal(size);try{for(int i=0;i<size;i++)Marshal.WriteByte(buffer,i,0);Marshal.WriteInt32(buffer,lengthOffset,name.Length);Marshal.Copy(name,0,new IntPtr(buffer.ToInt64()+nameOffset),name.Length);if(!SetFileInformationByHandle(state,3,buffer,(uint)size))throw new Exception("RECOVERY_RENAME_FAILED_"+Marshal.GetLastWin32Error());}finally{Marshal.FreeHGlobal(buffer);}}
 public void Dispose(){for(int i=held.Count-1;i>=0;i--)CloseHandle(held[i]);held.Clear();}
}
'@
 # Prove the startup owner is this exact trusted wrapper and remains alive.
 $recoveryLease=Get-CimInstance Win32_Process -Filter "ProcessId=$LeasePid"
 $recoveryChild=Get-CimInstance Win32_Process -Filter "ProcessId=$NodePid"
 $recoverySelf=Get-CimInstance Win32_Process -Filter "ProcessId=$PID"
 if(-not $recoveryLease -or -not $recoveryChild -or $recoverySelf.ParentProcessId -ne $NodePid -or $recoveryChild.ParentProcessId -ne $LeasePid -or $recoveryLease.ExecutablePath -ine $recoveryPs -or $recoveryChild.ExecutablePath -ine $recoveryNode){throw 'START_LEASE_PARENT'}
 if([Diagnostics.Process]::GetProcessById($LeasePid).StartTime.ToUniversalTime().ToFileTimeUtc().ToString('x16') -cne $LeaseBirth){throw 'START_LEASE_BIRTH'}
 $recoveryLeaseArgs=[DeadStateHandles]::Args($recoveryLease.CommandLine)
 $recoveryFileIndex=[Array]::IndexOf($recoveryLeaseArgs,'-File')
 if($recoveryFileIndex -lt 0 -or [IO.Path]::GetFullPath($recoveryLeaseArgs[$recoveryFileIndex+1]) -ine (Join-Path $recoveryRoot 'scripts\start-owner.ps1') -or $recoveryLeaseArgs[-2] -cne '-ClaimId' -or $recoveryLeaseArgs[-1] -cne $NewClaimId){throw 'START_LEASE_COMMAND'}
 $recoverySid=[Security.Principal.WindowsIdentity]::GetCurrent().User
 $recoveryMutex=[Threading.Mutex]::OpenExisting('Local\AgentBrowser.Native.Start.'+$recoverySid.Value)
 try{$recoveryGot=$false;try{$recoveryGot=$recoveryMutex.WaitOne(0)}catch [Threading.AbandonedMutexException]{$recoveryGot=$true};if($recoveryGot){$recoveryMutex.ReleaseMutex();throw 'START_LEASE_NOT_HELD'}}finally{$recoveryMutex.Dispose()}
 if($Action -ceq 'VerifyLease'){'{"ok":true,"leaseVerified":true}';exit 0}
 $recoveryState=Join-Path $recoveryRoot '.state'
 $recoveryHeld=[DeadStateHandles]::new();$recoveryHeld.Ancestors($recoveryRoot);$recoveryHeld.Ancestors($recoveryProfile)
 $recoveryHeld.parent=$recoveryHeld.HoldDirectory($recoveryRoot,$false);$recoveryHeld.state=$recoveryHeld.HoldDirectory($recoveryState,$true)
 $recoveryAcl=Get-Acl -LiteralPath $recoveryState;$recoveryRules=@($recoveryAcl.Access)
 if(-not $recoveryAcl.AreAccessRulesProtected -or $recoveryRules.Count -ne 1 -or $recoveryAcl.GetOwner([Security.Principal.SecurityIdentifier]).Value -cne $recoverySid.Value -or $recoveryRules[0].IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -cne $recoverySid.Value -or $recoveryRules[0].AccessControlType -ne 'Allow' -or ($recoveryRules[0].FileSystemRights -band [Security.AccessControl.FileSystemRights]::FullControl) -ne [Security.AccessControl.FileSystemRights]::FullControl){throw 'RECOVERY_STATE_ACL'}
 $recoveryRecords=@{};$recoveryHash=[Security.Cryptography.SHA256]::Create();$recoveryLines=@();$recoveryFiles=@(Get-ChildItem -LiteralPath $recoveryState -Force)
 if($recoveryFiles.Count -gt 256){throw 'RECOVERY_STATE_LIMIT'}
 foreach($recoveryFile in ($recoveryFiles|Sort-Object Name)){
  if($recoveryFile.PSIsContainer -or $recoveryFile.Name -notmatch '^(candidate-state|service|last-exit|gate-exit-\d+|startup-failure-\d+|launch-[a-f0-9-]{36}|task-[A-Za-z0-9_-]{1,40})\.json$'){throw 'RECOVERY_STATE_UNKNOWN_FILE'}
  $recoveryBytes=$recoveryHeld.ReadHeld($recoveryFile.FullName);$recoveryText=[Text.UTF8Encoding]::new($false,$true).GetString($recoveryBytes)
  $recoveryRecords[$recoveryFile.Name]=$recoveryText|ConvertFrom-Json
  $recoveryLines+=($recoveryFile.Name+':'+([BitConverter]::ToString($recoveryHash.ComputeHash($recoveryBytes)).Replace('-','').ToLowerInvariant()))
 }
 $recoverySnapshot=[BitConverter]::ToString($recoveryHash.ComputeHash([Text.Encoding]::UTF8.GetBytes(($recoveryLines -join "`n")))).Replace('-','').ToLowerInvariant()
 $recoveryMeta=$recoveryRecords['service.json'];$recoveryMarker=$recoveryRecords['candidate-state.json']
 $recoveryClaimOnly=$Action -in @('AssessClaim','RetireClaim')
 if($recoveryMarker.version -cne $recoveryVersion -or $recoveryMarker.ownerSid -cne $recoverySid.Value){throw 'RECOVERY_REGISTRATION_UNKNOWN'}
 if($recoveryClaimOnly){
  if($recoveryRecords.ContainsKey('service.json')){throw 'RECOVERY_REGISTRATION_PRESENT'}
  if(@($recoveryRecords.Keys|Where-Object {$_ -like 'task-*'}).Count){throw 'RECOVERY_UNREGISTERED_TASK_UNKNOWN'}
  $recoveryClaim=$NewClaimId;$recoveryLaunch=$recoveryRecords['launch-'+$recoveryClaim+'.json']
  if(-not $recoveryLaunch -or $recoveryLaunch.created -ne $true -or $recoveryLaunch.claimId -cne $recoveryClaim -or $recoveryLaunch.launchMode -cne 'isolated-native' -or $recoveryLaunch.gateCreationHex -notmatch '^[a-f0-9]{16}$' -or $recoveryLaunch.gateCreationHex -ceq '0000000000000000'){throw 'RECOVERY_LAUNCH_UNKNOWN'}
  foreach($recoveryId in @($recoveryLaunch.gatePid,$recoveryLaunch.servicePid,$recoveryLaunch.hostPid,$recoveryLaunch.launcherPid)){if($recoveryId -isnot [int] -and $recoveryId -isnot [long]){throw 'RECOVERY_LAUNCH_UNKNOWN'};if($recoveryId -le 0 -or $recoveryId -gt [uint32]::MaxValue){throw 'RECOVERY_LAUNCH_UNKNOWN'}}
 }else{
 if(-not $recoveryMeta -or $recoveryMeta.claimId -notmatch '^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$' -or $recoveryMeta.cap -notmatch '^[a-f0-9]{64}$'){throw 'RECOVERY_REGISTRATION_UNKNOWN'}
 $recoveryClaim=$recoveryMeta.claimId
 $recoveryLaunch=$recoveryRecords['launch-'+$recoveryMeta.claimId+'.json']
 if(-not $recoveryLaunch -or $recoveryLaunch.created -ne $true -or $recoveryLaunch.claimId -cne $recoveryMeta.claimId -or $recoveryLaunch.servicePid -ne $recoveryMeta.pid -or $recoveryLaunch.hostPid -ne $recoveryMeta.hostPid -or $recoveryLaunch.gateCreationHex -notmatch '^[a-f0-9]{16}$' -or $recoveryLaunch.launchMode -cne 'isolated-native' -or $recoveryMeta.fixture -cne 'http://127.0.0.1:49189'){throw 'RECOVERY_LAUNCH_UNKNOWN'}
 foreach($recoveryTaskName in @($recoveryRecords.Keys|Where-Object {$_ -like 'task-*'})){$recoveryTask=$recoveryRecords[$recoveryTaskName];if($recoveryTask.claimId -cne $recoveryMeta.claimId -or $recoveryTask.servicePid -ne $recoveryMeta.pid -or $recoveryTask.cap -notmatch '^[a-f0-9]{64}$'){throw 'RECOVERY_TASK_UNKNOWN'}}
 }
 function Confirm-DeadExclusive {
  foreach($recoveryOldId in @($recoveryLaunch.gatePid,$recoveryLaunch.servicePid,$recoveryLaunch.hostPid)){[DeadStateHandles]::Dead([uint32]$recoveryOldId)}
  foreach($recoveryName in @('Local\AgentBrowser.WP19C.CLI','Local\AgentBrowser.WP19D.CLI','Local\AgentBrowser.WP19E.CLI')){[DeadStateHandles]::NoMutex($recoveryName)}
  $recoveryBrowserRoot=Join-Path $recoveryProfile 'EBWebView'
  foreach($recoveryBrowser in @(Get-CimInstance Win32_Process -Filter "Name='msedgewebview2.exe'")){
   if(-not $recoveryBrowser.CommandLine){throw 'RECOVERY_PROFILE_BROWSER_UNKNOWN'}
   $recoveryBrowserArgs=[DeadStateHandles]::Args($recoveryBrowser.CommandLine)
   $recoveryHasUdf=$false
   for($recoveryArgIndex=0;$recoveryArgIndex -lt $recoveryBrowserArgs.Count;$recoveryArgIndex++){
    $recoveryArg=$recoveryBrowserArgs[$recoveryArgIndex];$recoveryUdfArg=$null
    if($recoveryArg.StartsWith('--user-data-dir=',[StringComparison]::OrdinalIgnoreCase)){$recoveryUdfArg=$recoveryArg.Substring(16)}elseif($recoveryArg -ieq '--user-data-dir'){if($recoveryArgIndex+1 -ge $recoveryBrowserArgs.Count){throw 'RECOVERY_PROFILE_BROWSER_UNKNOWN'};$recoveryUdfArg=$recoveryBrowserArgs[++$recoveryArgIndex]}
    if($null -ne $recoveryUdfArg){$recoveryHasUdf=$true;$recoveryUdf=[DeadStateHandles]::PhysicalDirectory([IO.Path]::GetFullPath($recoveryUdfArg));if($recoveryUdf -ieq $recoveryBrowserRoot -or $recoveryUdf -ieq $recoveryProfile){throw 'RECOVERY_PROFILE_IN_USE'}}
   }
   if(-not $recoveryHasUdf -and -not @($recoveryBrowserArgs|Where-Object {$_ -like '--type=*'}).Count){throw 'RECOVERY_PROFILE_BROWSER_UNKNOWN'}
  }
 }
 $recoveryPipeName='\\.\pipe\AgentBrowserNative.'+$recoverySid.Value
 Confirm-DeadExclusive;[DeadStateHandles]::PipeAbsent($recoveryPipeName)
 if($Action -in @('Assess','AssessClaim')){[pscustomobject]@{ok=$true;dead=$true;exclusive=$true;snapshot=$recoverySnapshot}|ConvertTo-Json -Compress;exit 0}
 if($ExpectedSnapshot -notmatch '^[a-f0-9]{64}$' -or $ExpectedSnapshot -cne $recoverySnapshot){throw 'RECOVERY_STATE_CHANGED'}
 # Reserve the absent pipe while rechecking and renaming by the held directory
 # handle; never weaken sharing to bypass another process holding old state.
 $recoveryPipe=[DeadStateHandles]::ReservePipe($recoveryPipeName,$recoverySid.Value)
 Confirm-DeadExclusive
 # A bounded caller may disappear while WMI/native assessment is running.
 # Never retire on behalf of an already lost startup owner or child.
 $recoveryLeaseNow=Get-CimInstance Win32_Process -Filter "ProcessId=$LeasePid"
 $recoveryChildNow=Get-CimInstance Win32_Process -Filter "ProcessId=$NodePid"
 if(-not $recoveryLeaseNow -or -not $recoveryChildNow -or $recoveryChildNow.ParentProcessId -ne $LeasePid -or $recoveryLeaseNow.ExecutablePath -ine $recoveryPs -or $recoveryChildNow.ExecutablePath -ine $recoveryNode -or [Diagnostics.Process]::GetProcessById($LeasePid).StartTime.ToUniversalTime().ToFileTimeUtc().ToString('x16') -cne $LeaseBirth){throw 'START_LEASE_LOST'}
 if(@(Get-ChildItem -LiteralPath $recoveryState -Force).Count -ne $recoveryFiles.Count){throw 'RECOVERY_STATE_CHANGED'}
 $recoveryLeaf='.state-recovery-'+$recoveryClaim+'-'+[Guid]::NewGuid().ToString('D')
 $recoveryTarget=Join-Path $recoveryRoot $recoveryLeaf
 if([IO.Path]::GetDirectoryName([IO.Path]::GetFullPath($recoveryTarget)) -cne $recoveryRoot -or (Test-Path -LiteralPath $recoveryTarget)){throw 'RECOVERY_TARGET_SCOPE'}
 $recoveryHeld.ReleaseOwnReads()
 $recoveryHeld.Rename($recoveryLeaf)
 [pscustomobject]@{ok=$true;retired=$true;snapshot=$recoverySnapshot;archiveLeaf=$recoveryLeaf;profileUntouched=$true;processKilled=$false}|ConvertTo-Json -Compress
}catch{
 $recoveryException=$_.Exception;while($recoveryException.InnerException){$recoveryException=$recoveryException.InnerException}
 $recoveryCode=if($recoveryException.Message -match '^[A-Z][A-Z0-9_]+$'){$recoveryException.Message}else{'DEAD_RECOVERY_UNPROVEN'}
 [pscustomobject]@{ok=$false;code=$recoveryCode;profileUntouched=$true;processKilled=$false}|ConvertTo-Json -Compress;exit 1
}finally{if($recoveryPipe -ne [IntPtr]::Zero){[DeadStateHandles]::Close($recoveryPipe)};if($recoveryHeld){$recoveryHeld.Dispose()}}
