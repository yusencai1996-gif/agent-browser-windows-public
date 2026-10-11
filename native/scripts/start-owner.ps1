param([Parameter(Mandatory=$true)][string]$ClaimId)
$ErrorActionPreference='Stop'
$binding=Get-Content -LiteralPath (Join-Path $PSScriptRoot '..\binding.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$ownerRoot=$binding.root
$ownerNode=$binding.node
if($PSScriptRoot -ine (Join-Path $ownerRoot 'scripts') -or $ClaimId -notmatch '^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$'){throw 'START_OWNER_SCOPE'}
$ownerSid=[Security.Principal.WindowsIdentity]::GetCurrent().User
$ownerSecurity=[Security.AccessControl.MutexSecurity]::new();$ownerSecurity.SetOwner($ownerSid);$ownerSecurity.SetAccessRuleProtection($true,$false)
$ownerSecurity.AddAccessRule([Security.AccessControl.MutexAccessRule]::new($ownerSid,[Security.AccessControl.MutexRights]::FullControl,[Security.AccessControl.AccessControlType]::Allow))
$ownerCreated=$false;$ownerMutex=[Threading.Mutex]::new($false,('Local\AgentBrowser.Native.Start.'+$ownerSid.Value),[ref]$ownerCreated,$ownerSecurity);$ownerHeld=$false
try{
 $ownerAcl=$ownerMutex.GetAccessControl();$ownerRules=@($ownerAcl.Access)
 if(-not $ownerAcl.AreAccessRulesProtected -or $ownerAcl.GetOwner([Security.Principal.SecurityIdentifier]).Value -cne $ownerSid.Value -or $ownerRules.Count -ne 1 -or $ownerRules[0].IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -cne $ownerSid.Value -or $ownerRules[0].AccessControlType -ne 'Allow' -or $ownerRules[0].MutexRights -ne [Security.AccessControl.MutexRights]::FullControl){throw 'START_LOCK_ACL'}
 try{$ownerHeld=$ownerMutex.WaitOne(10000)}catch [Threading.AbandonedMutexException]{$ownerHeld=$true}
 if(-not $ownerHeld){throw 'START_LOCK_BUSY'}
 $ownerBorn=[Diagnostics.Process]::GetCurrentProcess().StartTime.ToUniversalTime().ToFileTimeUtc().ToString('x16')
 [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
 # The lock remains held for the actual child lifetime, even if the outer
 # caller times out. No timeout path kills a process or releases a live lease.
 & $ownerNode (Join-Path $ownerRoot 'scripts\cli.mjs') start-locked $ClaimId $PID $ownerBorn
 exit $LASTEXITCODE
}catch{
 $ownerException=$_.Exception;while($ownerException.InnerException){$ownerException=$ownerException.InnerException}
 $ownerCode=if($ownerException.Message -match '^[A-Z][A-Z0-9_]+$'){$ownerException.Message}else{'START_LOCK_HELPER'}
 [pscustomobject]@{ok=$false;untrusted=$false;data=$null;error=@{code=$ownerCode};diagnostics=@{correlationId=[Guid]::NewGuid().ToString('D');state='disabled'}}|ConvertTo-Json -Compress -Depth 4
 exit 1
}finally{if($ownerHeld){$ownerMutex.ReleaseMutex()};$ownerMutex.Dispose()}
