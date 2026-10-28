<#
.SYNOPSIS
Build, snapshot and update an existing local Node BI stack without deleting its volumes.
.EXAMPLE
powershell -File scripts/Update-NodeBI.ps1 -CheckOnly
.EXAMPLE
powershell -File scripts/Update-NodeBI.ps1
#>
[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [ValidateSet('Demo', 'Main')][string]$Stack = 'Demo',
    [switch]$CheckOnly,
    [switch]$SkipBuild
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$workspace = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$composeFile = Join-Path $workspace $(if ($Stack -eq 'Demo') { 'docker-compose.demo.yml' } else { 'docker-compose.yml' })
$composeArgs = @('compose', '--project-directory', $workspace, '-f', $composeFile)

function Invoke-Docker([string[]]$Arguments, [switch]$ShowOutput) {
    # Windows PowerShell represents native stderr progress as ErrorRecords; exit code is authoritative.
    $ErrorActionPreference = 'Continue'
    $lines = & docker @Arguments 2>&1 | ForEach-Object { if ($ShowOutput) { Write-Host $_.ToString() }; $_ }
    $code = $LASTEXITCODE
    $value = ($lines | ForEach-Object { $_.ToString() }) -join [Environment]::NewLine
    if ($code -ne 0) { throw "Docker command failed (exit $code): $value" }
    return $value
}
function Service-Container([string]$Service) {
    $identity = (Invoke-Docker ($composeArgs + @('ps', '-q', $Service))).Trim()
    if ($identity -notmatch '^[a-f0-9]{12,64}$') { throw "Exactly one running $Service container is required. Use the normal startup command for a new installation." }
    return $identity
}
function Container-Environment([string]$Identity) {
    $values = Invoke-Docker @('inspect', '--format', '{{json .Config.Env}}', $Identity) | ConvertFrom-Json
    $result = @{}
    foreach ($entry in $values) {
        $pair = $entry -split '=', 2
        $result[$pair[0]] = $pair[1]
    }
    return $result
}
function Wait-Http([string]$Uri, [int]$Seconds = 90) {
    $deadline = [DateTime]::UtcNow.AddSeconds($Seconds)
    do {
        try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri $Uri -TimeoutSec 5
            if ($response.StatusCode -eq 200) { return }
        } catch { }
        Start-Sleep -Seconds 2
    } while ([DateTime]::UtcNow -lt $deadline)
    throw "Readiness check failed: $Uri"
}

$null = Invoke-Docker @('version', '--format', '{{.Server.Version}}')
$configuration = Invoke-Docker ($composeArgs + @('config', '--format', 'json')) | ConvertFrom-Json
$projectName = $configuration.name
$backend = Service-Container 'backend'
$frontend = Service-Container 'frontend'
$postgres = Service-Container 'postgres'
$backendEnv = Container-Environment $backend
$postgresEnv = Container-Environment $postgres
$storagePath = $backendEnv['STORAGE_ROOT']
if (!$storagePath -or !$storagePath.StartsWith('/') -or $storagePath -eq '/') { throw 'A dedicated absolute STORAGE_ROOT inside the backend container is required.' }
$mounts = Invoke-Docker @('inspect', '--format', '{{json .Mounts}}', $backend) | ConvertFrom-Json
if (!($mounts | Where-Object { $_.Destination -eq $storagePath })) { throw 'STORAGE_ROOT must be an explicitly mounted data directory.' }
$expectedMount = @($configuration.services.backend.volumes | Where-Object { $_.target -eq $storagePath })
if ($expectedMount.Count -ne 1 -or $expectedMount[0].type -ne 'volume') { throw 'Automatic updates require the existing named source volume. Bind mounts need a separate operator backup.' }
$volumeName = $configuration.volumes.PSObject.Properties[$expectedMount[0].source].Value.name
$currentMount = $mounts | Where-Object { $_.Destination -eq $storagePath }
if ($currentMount.Name -ne $volumeName -or $configuration.services.backend.environment.STORAGE_ROOT -ne $storagePath) { throw 'Source-volume or storage-root changes need an explicit data migration, not an application update.' }
$databaseUri = [Uri]$backendEnv['DATABASE_URL']
$nextDatabaseUri = [Uri]$configuration.services.backend.environment.DATABASE_URL
foreach ($connection in @($databaseUri, $nextDatabaseUri)) {
    if ($connection.Host -ne 'postgres' -or [Uri]::UnescapeDataString($connection.AbsolutePath.TrimStart('/')) -ne $postgresEnv['POSTGRES_DB']) { throw 'The configured database is not the existing Compose PostgreSQL database. Back up external databases separately.' }
}
$apiPort = $configuration.services.backend.ports[0].published
$uiPort = $configuration.services.frontend.ports[0].published
$apiUrl = "http://127.0.0.1:$apiPort"
$uiUrl = "http://127.0.0.1:$uiPort"
Wait-Http "$apiUrl/ready" 15
Write-Host "Preflight OK: $projectName, UI $uiUrl, mounted storage $storagePath."
if ($CheckOnly -or !$PSCmdlet.ShouldProcess($projectName, 'Build images, stop API/UI, back up database and files, migrate and restart')) { return }

$backupRoot = Join-Path $workspace '.backups'
$null = New-Item -ItemType Directory -Path $backupRoot -Force
$lockPath = Join-Path $backupRoot "updater-$Stack.lock"
$updateLock = [IO.File]::Open($lockPath, [IO.FileMode]::OpenOrCreate, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
$stopped = $false
$deploying = $false
$backupDirectory = $null
$manifest = $null
try {
    # Resolve identities again after acquiring the exclusive operator lock.
    $backend = Service-Container 'backend'
    $frontend = Service-Container 'frontend'
    $manifest = [ordered]@{
        format = 1; stack = $Stack; project = $projectName; created_utc = [DateTime]::UtcNow.ToString('o')
        phase = 'building'; compose_sha256 = (Get-FileHash -LiteralPath $composeFile -Algorithm SHA256).Hash
        backend_image = (Invoke-Docker @('inspect', '--format', '{{.Image}}', $backend)).Trim()
        frontend_image = (Invoke-Docker @('inspect', '--format', '{{.Image}}', $frontend)).Trim()
        backend_image_after = ''; frontend_image_after = ''
        database_sha256 = ''; files = @()
    }
    if (!$SkipBuild) {
        Write-Host 'Building images first. A build failure leaves the running application untouched.'
        $null = Invoke-Docker -Arguments ($composeArgs + @('build', 'backend', 'frontend')) -ShowOutput
    }
    $backupDirectory = Join-Path $backupRoot ("update-{0}-{1}-{2}" -f $Stack.ToLowerInvariant(), [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss'), [Guid]::NewGuid().ToString('N'))
    $null = New-Item -ItemType Directory -Path $backupDirectory
    $sourceBackup = Join-Path $backupDirectory 'sources'
    $null = New-Item -ItemType Directory -Path $sourceBackup
    $manifestPath = Join-Path $backupDirectory 'manifest.json'
    Write-Host 'Pausing API/UI for a consistent database and source-file backup.'
    $stopped = $true
    $null = Invoke-Docker ($composeArgs + @('stop', '--timeout', '30', 'frontend', 'backend'))
    $remoteDump = '/tmp/nodebi-backup-' + [Guid]::NewGuid().ToString('N') + '.dump'
    try {
        $null = Invoke-Docker @('exec', $postgres, 'pg_dump', '-U', $postgresEnv['POSTGRES_USER'], '-d', $postgresEnv['POSTGRES_DB'], '-Fc', '-f', $remoteDump)
        $null = Invoke-Docker @('exec', $postgres, 'pg_restore', '--list', $remoteDump)
        $null = Invoke-Docker @('cp', "${postgres}:$remoteDump", (Join-Path $backupDirectory 'database.dump'))
    } finally {
        # Exact generated file only; never a directory or a wildcard.
        $null = Invoke-Docker @('exec', $postgres, 'rm', '-f', $remoteDump)
    }
    $null = Invoke-Docker @('cp', "${backend}:$storagePath/.", $sourceBackup)
    $manifest.database_sha256 = (Get-FileHash -LiteralPath (Join-Path $backupDirectory 'database.dump') -Algorithm SHA256).Hash
    $manifest.files = @(Get-ChildItem -LiteralPath $sourceBackup -Recurse -File | ForEach-Object {
        [ordered]@{ path = $_.FullName.Substring($sourceBackup.Length + 1).Replace('\', '/'); bytes = $_.Length; sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash }
    })
    $manifest.phase = 'backed_up'
    $manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $manifestPath -Encoding UTF8
    Write-Host "Verified backup: $backupDirectory"
    $deploying = $true
    $null = Invoke-Docker -Arguments ($composeArgs + @('up', '-d', '--no-deps', '--no-build', '--wait', '--wait-timeout', '120', 'backend', 'frontend')) -ShowOutput
    Wait-Http "$apiUrl/ready"
    Wait-Http $uiUrl
    $manifest.backend_image_after = (Invoke-Docker @('inspect', '--format', '{{.Image}}', (Service-Container 'backend'))).Trim()
    $manifest.frontend_image_after = (Invoke-Docker @('inspect', '--format', '{{.Image}}', (Service-Container 'frontend'))).Trim()
    $manifest.phase = 'ready'
    $manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $manifestPath -Encoding UTF8
    Write-Host "Update ready: $uiUrl. Data volumes and the backup are retained."
} catch {
    $failure = $_
    if ($stopped -and !$deploying) {
        Write-Warning 'Backup did not complete. Restarting the original containers without migrations.'
        $null = Invoke-Docker @('start', $backend, $frontend)
    } elseif ($deploying) {
        Write-Warning 'Update failed after deployment began. Do not downgrade the database automatically.'
        $null = Invoke-Docker ($composeArgs + @('stop', 'frontend', 'backend'))
    }
    if ($backupDirectory -and (Test-Path -LiteralPath (Join-Path $backupDirectory 'manifest.json'))) {
        $manifest.phase = 'failed'
        $manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $backupDirectory 'manifest.json') -Encoding UTF8
    }
    if ($backupDirectory) { Write-Warning "Retained backup or partial snapshot: $backupDirectory. See README for recovery." }
    throw $failure
} finally {
    $updateLock.Dispose()
}
