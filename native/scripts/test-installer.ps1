param([Parameter(Mandatory=$true)][string]$SetupPath,[Parameter(Mandatory=$true)][string]$TestParent)
$ErrorActionPreference='Stop';$acceptSource=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'));$acceptRoot=Join-Path $TestParent ('installer-acceptance-'+[Guid]::NewGuid().ToString('D'))
[IO.Directory]::CreateDirectory($acceptRoot)|Out-Null
$acceptSid=[Security.Principal.WindowsIdentity]::GetCurrent().User;$acceptAcl=[Security.AccessControl.DirectorySecurity]::new();$acceptAcl.SetOwner($acceptSid);$acceptAcl.SetAccessRuleProtection($true,$false);$acceptAcl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($acceptSid,'FullControl','ContainerInherit,ObjectInherit','None','Allow'));Set-Acl -LiteralPath $acceptRoot -AclObject $acceptAcl
Add-Type -Path (Join-Path $acceptSource 'test\restricted-process.cs')
$acceptInstall=Join-Path $acceptRoot '中文 Space Install';$acceptResult=@{scope='restricted-token same-user installation on this host';root=$acceptRoot;checks=@();sharedBrowserTouched=$false;hostGuiValidated=$false;crossMachineClaims=$false}
function Read-SafeCode([string]$File){
 if(-not(Test-Path -LiteralPath $File -PathType Leaf)){return $null}
 $info=Get-Item -LiteralPath $File;if($info.Length -gt 65536 -or ($info.Attributes -band [IO.FileAttributes]::ReparsePoint)){return $null}
 try{$reply=Get-Content -LiteralPath $File -Raw -Encoding UTF8|ConvertFrom-Json;$code=$reply.error.code;if($code -is [string] -and $code -cmatch '^[A-Z][A-Z0-9_]{0,79}$'){return $code}}catch{}
 return $null
}
function Read-WebViewPresence {
 $values=@{}
 foreach($scope in @('CurrentUser','LocalMachine')){
  $hive=[Microsoft.Win32.RegistryHive]::$scope
  $base=[Microsoft.Win32.RegistryKey]::OpenBaseKey($hive,[Microsoft.Win32.RegistryView]::Registry32)
  try{$key=$base.OpenSubKey('SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}');if($key){try{$pv=[string]$key.GetValue('pv');if($pv -match '^\d+(\.\d+){1,3}$'){$values[$scope]=$pv}}finally{$key.Dispose()}}}finally{$base.Dispose()}
 }
 return $values
}
function Invoke-PrerequisiteProbe([string]$Name){
 $file=Join-Path $acceptRoot ($Name+'.json')
 $run=[RestrictedProcess]::Run((Join-Path $acceptSource 'payload\abw.exe'),'--check-prerequisites',$acceptRoot,$file,30000)
 return @{exit=$run.exit;timeout=$run.timeout;administratorMember=$run.administratorMember;elevated=$run.elevated;code=(Read-SafeCode $file)}
}
try{
 $acceptResult.webViewBefore=Read-WebViewPresence
 $acceptResult.directPrerequisiteBefore=Invoke-PrerequisiteProbe 'prerequisite-before'
 # Default-layout preparation with no intermediate Programs directory. These
 # are fresh synthetic directories inside this test root, not real user data.
 $acceptDefaultParent=Join-Path $acceptRoot 'synthetic-localappdata';[IO.Directory]::CreateDirectory($acceptDefaultParent)|Out-Null
 $acceptDefaultTarget=Join-Path $acceptDefaultParent 'AgentBrowserNative'
 $acceptDefaultProbe=[RestrictedProcess]::Run((Join-Path $acceptSource 'payload\abw.exe'),('--prepare-root "'+$acceptDefaultTarget+'"'),$acceptRoot,(Join-Path $acceptRoot 'default-parent-probe.json'),30000)
 if($acceptDefaultProbe.exit -ne 0 -or -not(Test-Path -LiteralPath $acceptDefaultTarget)){throw 'DEFAULT_PARENT_LAYOUT_FAILED'}
 $acceptMissingParent=Join-Path $acceptRoot 'missing-parent\AgentBrowserNative'
 $acceptMissingProbe=[RestrictedProcess]::Run((Join-Path $acceptSource 'payload\abw.exe'),('--prepare-root "'+$acceptMissingParent+'"'),$acceptRoot,(Join-Path $acceptRoot 'missing-parent-probe.json'),30000)
 if($acceptMissingProbe.exit -eq 0 -or (Test-Path -LiteralPath $acceptMissingParent)){throw 'MISSING_PARENT_NOT_REFUSED'}
 $acceptResult.checks+='default-layout-no-Programs-parent-and-missing-parent-refusal'
 $acceptSetup=[RestrictedProcess]::Run([IO.Path]::GetFullPath($SetupPath),('/S /D='+$acceptInstall),$acceptRoot,(Join-Path $acceptRoot 'setup-output.txt'),180000)
 $acceptResult.setup=$acceptSetup
 $acceptSetupCode=Read-SafeCode (Join-Path $acceptRoot 'setup-output.txt')
 if(-not $acceptSetup.timeout -and $acceptSetup.exit -eq 3 -and $acceptResult.directPrerequisiteBefore.code -ceq 'WEBVIEW2_REQUIRED' -and $env:GITHUB_ACTIONS -eq 'true'){
  # Dependency installation is confined to the disposable CI runner. Never run
  # this fallback on the developer's real computer.
  if(Test-Path -LiteralPath $acceptInstall){throw 'DEPENDENCY_REFUSAL_CREATED_INSTALL_ROOT'}
  $acceptResult.checks+='missing-dependency-refused-before-install'
  $acceptBootstrap=Join-Path $acceptRoot 'MicrosoftEdgeWebview2Setup.exe'
  Invoke-WebRequest -Uri 'https://go.microsoft.com/fwlink/p/?LinkId=2124703' -OutFile $acceptBootstrap
  $acceptSignature=Get-AuthenticodeSignature -LiteralPath $acceptBootstrap
  if($acceptSignature.Status -ne 'Valid' -or $acceptSignature.SignerCertificate.Subject -notmatch 'O=Microsoft Corporation'){throw 'WEBVIEW_BOOTSTRAP_SIGNATURE'}
  $acceptDependency=Start-Process -FilePath $acceptBootstrap -ArgumentList '/silent','/install' -WindowStyle Hidden -Wait -PassThru
  $acceptResult.webViewBootstrapExit=$acceptDependency.ExitCode
  $acceptResult.webViewAfter=Read-WebViewPresence
  $acceptResult.directPrerequisiteAfter=Invoke-PrerequisiteProbe 'prerequisite-after'
  if($acceptDependency.ExitCode -ne 0){throw 'WEBVIEW_BOOTSTRAP_FAILED'}
  if($acceptResult.directPrerequisiteAfter.exit -ne 0 -or $acceptResult.directPrerequisiteAfter.timeout){throw 'PREREQUISITE_AFTER_BOOTSTRAP_FAILED'}
  $acceptSetup=[RestrictedProcess]::Run([IO.Path]::GetFullPath($SetupPath),('/S /D='+$acceptInstall),$acceptRoot,(Join-Path $acceptRoot 'setup-after-dependency.txt'),180000);$acceptResult.setupAfterDependency=$acceptSetup
 }
 if($acceptSetup.timeout -or $acceptSetup.exit -ne 0){throw 'SETUP_NOT_PASSED'};$acceptResult.checks+='restricted-token-setup-exit0'
 $acceptEnvironmentPath=$env:PATH;$acceptNodeOptions=$env:NODE_OPTIONS;$env:PATH=[Environment]::SystemDirectory;$env:NODE_OPTIONS='--require=missing-preload-sentinel.cjs'
 try{$acceptVersion=[RestrictedProcess]::Run((Join-Path $acceptInstall 'abw.exe'),'version',$acceptInstall,(Join-Path $acceptRoot 'version-output.json'),30000)}finally{$env:PATH=$acceptEnvironmentPath;$env:NODE_OPTIONS=$acceptNodeOptions}
 $acceptResult.version=$acceptVersion;if($acceptVersion.timeout -or $acceptVersion.exit -ne 0){throw 'INSTALLED_VERSION_FAILED'}
 $acceptVersionData=Get-Content -LiteralPath (Join-Path $acceptRoot 'version-output.json') -Raw -Encoding UTF8|ConvertFrom-Json;if(-not $acceptVersionData.ok){throw 'INSTALLED_VERSION_JSON'};$acceptResult.checks+='installed-launcher-with-system-only-PATH-and-preload-refused'
 $acceptBinding=Get-Content -LiteralPath (Join-Path $acceptInstall 'binding.json') -Raw -Encoding UTF8|ConvertFrom-Json
 if($acceptBinding.node -ine (Join-Path $acceptInstall 'runtime\node.exe')){throw 'BUNDLED_NODE_PATH'};$acceptResult.bundledNodeHash=(Get-FileHash -LiteralPath $acceptBinding.node).Hash.ToLowerInvariant();$acceptResult.checks+='bundled-node-bound-and-hashed'
 $acceptAgain=[RestrictedProcess]::Run([IO.Path]::GetFullPath($SetupPath),('/S /D='+$acceptInstall),$acceptRoot,(Join-Path $acceptRoot 'repeat-output.txt'),30000);if($acceptAgain.timeout -or $acceptAgain.exit -eq 0){throw 'EXISTING_INSTALL_NOT_REJECTED'};$acceptResult.checks+='existing-install-refused'
 $acceptCanary=Join-Path $acceptInstall '.local\profile\synthetic-retain.txt';[IO.File]::WriteAllText($acceptCanary,'synthetic user data');$acceptCanaryHash=(Get-FileHash -LiteralPath $acceptCanary).Hash
 $acceptPackage=Get-Content -LiteralPath (Join-Path $acceptSource 'out\PACKAGE-MANIFEST.json') -Raw -Encoding UTF8|ConvertFrom-Json
 $acceptLateFile=Join-Path $acceptInstall 'scripts\wire.mjs'
 $acceptHeldFile=[IO.File]::Open($acceptLateFile,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::Read)
 try{
  $acceptBlocked=[RestrictedProcess]::Run((Join-Path $acceptInstall 'Uninstall.exe'),('/S _?='+$acceptInstall),$acceptRoot,(Join-Path $acceptRoot 'uninstall-blocked-output.txt'),60000)
  $acceptResult.uninstallBlocked=$acceptBlocked
  if($acceptBlocked.timeout -or $acceptBlocked.exit -eq 0){throw 'OCCUPIED_UNINSTALL_NOT_REFUSED'}
  foreach($acceptFile in $acceptPackage.files){$acceptPath=Join-Path $acceptInstall $acceptFile.path;if(-not(Test-Path -LiteralPath $acceptPath) -or (Get-FileHash -LiteralPath $acceptPath).Hash.ToLowerInvariant() -cne $acceptFile.sha256){throw 'REFUSED_UNINSTALL_CHANGED_PROGRAM'}}
 }finally{$acceptHeldFile.Dispose()}
 $acceptResult.checks+='late-file-occupation-refused-all-programs-preserved'
 $acceptUninstallOriginal=Join-Path $acceptInstall 'Uninstall.exe'
 $acceptUninstallCopy=Join-Path $acceptRoot 'Uninstall-Synchronous.exe'
 if(Test-Path -LiteralPath $acceptUninstallCopy){throw 'UNINSTALL_COPY_ALREADY_EXISTS'}
 Copy-Item -LiteralPath $acceptUninstallOriginal -Destination $acceptUninstallCopy
 $acceptUninstallHash=(Get-FileHash -LiteralPath $acceptUninstallOriginal).Hash.ToLowerInvariant()
 if((Get-FileHash -LiteralPath $acceptUninstallCopy).Hash.ToLowerInvariant() -cne $acceptUninstallHash){throw 'UNINSTALL_COPY_HASH_MISMATCH'}
 $acceptResult.uninstallMode='same-byte copy with /S _?=exact installed root'
 $acceptResult.uninstallCopySHA256=$acceptUninstallHash
 # _? disables NSIS's asynchronous self-copy handoff. The source copy is
 # outside the target, so its running image does not occupy the installed exe.
 $acceptUninstall=[RestrictedProcess]::Run($acceptUninstallCopy,('/S _?='+$acceptInstall),$acceptRoot,(Join-Path $acceptRoot 'uninstall-output.txt'),60000);$acceptResult.uninstall=$acceptUninstall;if($acceptUninstall.timeout -or $acceptUninstall.exit -ne 0){throw 'UNINSTALL_NOT_PASSED'}
 # Keep the real file-removal assertion; an exit code alone is insufficient.
 $acceptWatch=[Diagnostics.Stopwatch]::StartNew()
 do{$acceptRemaining=@($acceptPackage.files|Where-Object {Test-Path -LiteralPath (Join-Path $acceptInstall $_.path)});if(-not $acceptRemaining.Count -and -not(Test-Path -LiteralPath (Join-Path $acceptInstall 'Uninstall.exe'))){break};Start-Sleep -Milliseconds 200}while($acceptWatch.ElapsedMilliseconds -lt 30000)
 if($acceptRemaining.Count -or (Test-Path -LiteralPath (Join-Path $acceptInstall 'Uninstall.exe'))){throw 'UNINSTALL_PROGRAM_FILES_REMAIN'}
 if((Get-FileHash -LiteralPath $acceptCanary).Hash -cne $acceptCanaryHash){throw 'SYNTHETIC_DATA_CHANGED'};$acceptResult.checks+='uninstall-keeps-synthetic-profile';$acceptResult.result='passed'
}catch{$acceptResult.result='failed';$acceptResult.failure=if($_.Exception.Message -match '^[A-Z0-9_]+$'){$_.Exception.Message}else{'ACCEPTANCE_FAILED'};throw}
finally{
 [IO.Directory]::CreateDirectory((Join-Path $acceptSource 'out'))|Out-Null
 [IO.File]::WriteAllText((Join-Path $acceptSource 'out\INSTALLER-RESULT.json'),($acceptResult|ConvertTo-Json -Depth 8),[Text.UTF8Encoding]::new($false))
 # Emit only bounded structured codes, never raw child output or environment.
 # Keep this diagnostic independent of artifact download and the original error.
 try{
  $acceptPhase=if($acceptResult.ContainsKey('uninstall')){'uninstall'}elseif($acceptResult.ContainsKey('version')){'installed-runtime'}elseif($acceptResult.ContainsKey('setupAfterDependency')){'setup-after-dependency'}else{'setup'}
  $acceptSetupSummary=if($acceptResult.ContainsKey('setupAfterDependency')){$acceptResult.setupAfterDependency}else{$acceptResult.setup}
  $acceptOutputCodes=@{}
  foreach($acceptLog in @('setup-output.txt','setup-after-dependency.txt','version-output.json','repeat-output.txt','uninstall-output.txt')){
   $acceptLogPath=Join-Path $acceptRoot $acceptLog
   if(Test-Path -LiteralPath $acceptLogPath -PathType Leaf){
    $acceptLogInfo=Get-Item -LiteralPath $acceptLogPath
    if($acceptLogInfo.Length -le 65536 -and -not($acceptLogInfo.Attributes -band [IO.FileAttributes]::ReparsePoint)){
     try{$acceptLogJson=Get-Content -LiteralPath $acceptLogPath -Raw -Encoding UTF8|ConvertFrom-Json -ErrorAction Stop;$acceptCode=$acceptLogJson.error.code;if($acceptCode -is [string] -and $acceptCode -cmatch '^[A-Z][A-Z0-9_]{0,79}$'){$acceptOutputCodes[$acceptLog]=$acceptCode}}catch{}
    }
   }
  }
  $acceptFailure=if($acceptResult.failure -is [string] -and $acceptResult.failure -cmatch '^[A-Z][A-Z0-9_]{0,79}$'){$acceptResult.failure}else{$null}
  $acceptDiagnostic=@{phase=$acceptPhase;result=$acceptResult.result;failure=$acceptFailure;prerequisiteBefore=$acceptResult.directPrerequisiteBefore;prerequisiteAfter=$acceptResult.directPrerequisiteAfter;webViewBefore=$acceptResult.webViewBefore;webViewAfter=$acceptResult.webViewAfter;webViewBootstrapExit=$acceptResult.webViewBootstrapExit;setup=@{exit=$acceptSetupSummary.exit;timeout=$acceptSetupSummary.timeout;administratorMember=$acceptSetupSummary.administratorMember;elevated=$acceptSetupSummary.elevated};outputErrorCodes=$acceptOutputCodes}
  Write-Output ('INSTALLER_DIAGNOSTIC '+($acceptDiagnostic|ConvertTo-Json -Depth 4 -Compress))
 }catch{Write-Output 'INSTALLER_DIAGNOSTIC {"diagnosticError":"SANITIZED_DIAGNOSTIC_UNAVAILABLE"}'}
}
