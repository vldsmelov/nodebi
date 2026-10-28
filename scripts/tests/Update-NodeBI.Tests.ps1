# Dependency-free safety checks; fake Docker and HTTP, never stop a real stack.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$entry = Join-Path $PSScriptRoot '../Update-NodeBI.ps1'
$global:NodeBIAuditCalls = [Collections.Generic.List[string]]::new()
$global:NodeBIAuditFailBuild = $false
function global:docker {
    $arguments = @($args)
    $global:NodeBIAuditCalls.Add($arguments -join ' ')
    $global:LASTEXITCODE = 0
    if ($arguments[0] -eq 'version') { return '27.0.0' }
    if ($arguments -contains 'config') { return '{"name":"nodebi-demo","services":{"backend":{"environment":{"DATABASE_URL":"postgresql://qa@postgres/qa","STORAGE_ROOT":"/data/sources"},"volumes":[{"target":"/data/sources","type":"volume","source":"files"}],"ports":[{"published":"8030"}]},"frontend":{"ports":[{"published":"3030"}]}},"volumes":{"files":{"name":"qa_sources"}}}' }
    if ($arguments -contains 'ps') { return ('a' * 64) }
    if ($arguments -contains 'inspect') {
        if ($arguments -contains '{{json .Config.Env}}') { return '["STORAGE_ROOT=/data/sources","DATABASE_URL=postgresql://qa@postgres/qa","POSTGRES_USER=qa","POSTGRES_DB=qa"]' }
        if ($arguments -contains '{{json .Mounts}}') { return '[{"Destination":"/data/sources","Name":"qa_sources"}]' }
        return 'sha256:previous-image'
    }
    if (($arguments -contains 'build') -and $global:NodeBIAuditFailBuild) { $global:LASTEXITCODE = 23; return 'Simulated image build failure' }
    throw 'Unexpected fake Docker operation: ' + ($arguments -join ' ')
}
function global:Invoke-WebRequest { param($Uri, $TimeoutSec, [switch]$UseBasicParsing); return @{ StatusCode = 200 } }
function Assert-NoMutations {
    foreach ($call in $global:NodeBIAuditCalls) {
        if ($call -match '\b(stop|start|up|cp|pg_dump|rm)\b') { throw "Unexpected mutation: $call" }
    }
}
try {
    & $entry -CheckOnly
    Assert-NoMutations
    if ($global:NodeBIAuditCalls | Where-Object { $_ -match '\bbuild\b' }) { throw 'CheckOnly must not build images.' }
    $global:NodeBIAuditCalls.Clear()
    & $entry -WhatIf
    Assert-NoMutations
    if ($global:NodeBIAuditCalls | Where-Object { $_ -match '\bbuild\b' }) { throw 'WhatIf must not build images.' }
    $global:NodeBIAuditCalls.Clear()
    $global:NodeBIAuditFailBuild = $true
    $failed = $false
    try { & $entry -Confirm:$false } catch { $failed = $_.ToString().Contains('Simulated image build failure') }
    if (!$failed) { throw 'The image build failure must be visible to the caller.' }
    Assert-NoMutations
    Write-Host 'PASS: CheckOnly, WhatIf and failed build never stop or mutate an application.'
} finally {
    Remove-Item -LiteralPath Function:docker
    Remove-Item -LiteralPath Function:Invoke-WebRequest
}
