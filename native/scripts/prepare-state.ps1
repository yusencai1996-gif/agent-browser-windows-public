param([Parameter(Mandatory=$true)][string]$Path)
$ErrorActionPreference='Stop'
$binding=Get-Content -LiteralPath (Join-Path $PSScriptRoot '..\binding.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$aclRoot=$binding.root
$aclFull=[IO.Path]::GetFullPath($Path)
if($aclFull -cne ($aclRoot+'\.state')){throw 'STATE_SCOPE'}
# Reject junctions on every ancestor before creating private state.
for($aclParent=$aclRoot;$aclParent;$aclParent=[IO.Path]::GetDirectoryName($aclParent)){
 if(-not(Test-Path -LiteralPath $aclParent -PathType Container) -or ((Get-Item -LiteralPath $aclParent -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)){throw 'STATE_PARENT_REPARSE'}
 if($aclParent -eq [IO.Path]::GetPathRoot($aclParent)){break}
}
$aclSid=[Security.Principal.WindowsIdentity]::GetCurrent().User
$aclSecurity=[Security.AccessControl.DirectorySecurity]::new()
$aclSecurity.SetOwner($aclSid);$aclSecurity.SetAccessRuleProtection($true,$false)
$aclSecurity.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($aclSid,'FullControl','ContainerInherit,ObjectInherit','None','Allow'))
$aclMarker=Join-Path $aclFull 'candidate-state.json'
if(-not(Test-Path -LiteralPath $aclFull)){
 # .NET Framework overload passes the DACL at directory creation, with no
 # intermediate inherited-ACL state where capabilities could become visible.
 [IO.Directory]::CreateDirectory($aclFull,$aclSecurity) | Out-Null
 $aclClaim=[IO.File]::Open($aclMarker,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read)
 try{$aclBytes=[Text.Encoding]::ASCII.GetBytes('{"version":"0.10.0-alpha.1","ownerSid":"'+$aclSid.Value+'"}');$aclClaim.Write($aclBytes,0,$aclBytes.Length)}finally{$aclClaim.Dispose()}
}
if((Get-Item -LiteralPath $aclFull -Force).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'STATE_REPARSE'}
$aclActual=Get-Acl -LiteralPath $aclFull
if(-not $aclActual.AreAccessRulesProtected -or @($aclActual.Access).Count -ne 1 -or $aclActual.Access[0].IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -ne $aclSid.Value -or $aclActual.Access[0].AccessControlType -ne 'Allow' -or ($aclActual.Access[0].FileSystemRights -band [Security.AccessControl.FileSystemRights]::FullControl) -ne [Security.AccessControl.FileSystemRights]::FullControl){throw 'STATE_ACL'}
if(-not(Test-Path -LiteralPath $aclMarker -PathType Leaf) -or ((Get-Item -LiteralPath $aclMarker -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)){throw 'STATE_CLAIM_UNKNOWN'}
$aclClaim=Get-Content -LiteralPath $aclMarker -Raw | ConvertFrom-Json
if($aclClaim.version -cne '0.10.0-alpha.1' -or $aclClaim.ownerSid -cne $aclSid.Value){throw 'STATE_CLAIM_UNKNOWN'}
'{"protected":true,"currentUserOnly":true,"claimed":true}'
