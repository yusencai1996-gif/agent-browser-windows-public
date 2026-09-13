param([Parameter(Mandatory=$true)][string]$NodePath,[Parameter(Mandatory=$true)][string]$HostFile,[Parameter(Mandatory=$true)][ValidatePattern('^[0-9a-fA-F-]{36}$')][string]$CorrelationId)
$ErrorActionPreference='Stop'
try {
    # Start-Process without redirection uses ShellExecute on Windows. It does not
    # inherit the caller's pipe handles. Do not use -Wait or -NoNewWindow here.
    if ($HostFile.Contains('"')) { throw 'Invalid host path' }
    # This UUID is a diagnostic identifier, never a capability or credential.
    $arguments='"'+$HostFile+'" --managed-start --diagnostic-id '+$CorrelationId
    $started=Start-Process -FilePath $NodePath -ArgumentList $arguments -WindowStyle Hidden -PassThru
    [Console]::WriteLine(('{"pid":'+$started.Id+'}'))
} catch {
    [Console]::Error.WriteLine('HOST_SPAWN_FAILED')
    exit 1
}
