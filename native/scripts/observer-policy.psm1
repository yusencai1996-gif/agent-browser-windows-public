function Get-WVExactUdfArgument {
 param([Parameter(Mandatory=$true)][string[]]$Arguments)
 $values=@();for($i=0;$i -lt $Arguments.Count;$i++){$a=$Arguments[$i];if($a.StartsWith('--user-data-dir=',[StringComparison]::Ordinal)){$values+= $a.Substring('--user-data-dir='.Length)}elseif($a -ceq '--user-data-dir'){if($i+1 -ge $Arguments.Count){throw 'UDF_ARGUMENT_MISSING'};$i++;$values+=$Arguments[$i]}}
 if($values.Count -ne 1 -or [string]::IsNullOrWhiteSpace($values[0])){throw 'UDF_ARGUMENT_DUPLICATE_OR_MISSING'};return $values[0]
}
function Test-WVObserverPolicy {
 param($ProcessInfo,[string[]]$Arguments,[uint32]$ExpectedPid,[string]$ExpectedCreation,[string]$ActualCreation,[string]$ExpectedCanonical,[string]$ActualImage,[bool]$Live,[bool]$CimSucceeded=$true)
 if(-not $CimSucceeded -or -not $ProcessInfo -or [string]::IsNullOrWhiteSpace($ProcessInfo.CommandLine) -or [string]::IsNullOrWhiteSpace($ProcessInfo.ExecutablePath)){throw 'CIM_IDENTITY_UNKNOWN'}
 if(-not $Live -or $ProcessInfo.ProcessId -ne $ExpectedPid -or $ProcessInfo.Name -cne 'msedgewebview2.exe'){throw 'PROCESS_IDENTITY_UNKNOWN'}
 if(-not [string]::Equals($ExpectedCreation,$ActualCreation,[StringComparison]::OrdinalIgnoreCase)){throw 'CREATION_IDENTITY_MISMATCH'}
 if(-not [string]::Equals([IO.Path]::GetFullPath($ProcessInfo.ExecutablePath),[IO.Path]::GetFullPath($ActualImage),[StringComparison]::OrdinalIgnoreCase)){throw 'IMAGE_IDENTITY_MISMATCH'}
 $udf=Get-WVExactUdfArgument -Arguments $Arguments
 if(-not [IO.Path]::IsPathRooted($udf) -or -not [string]::Equals([IO.Path]::GetFullPath($udf),$ExpectedCanonical,[StringComparison]::OrdinalIgnoreCase)){throw 'UDF_ARGUMENT_MISMATCH'}
 return [pscustomobject]@{identityVerified=$true;creationIdentityMatch=$true;udfCanonicalMatch=$true;imageIdentityMatch=$true;browserStillLive=$true}
}
Export-ModuleMember -Function Get-WVExactUdfArgument,Test-WVObserverPolicy
