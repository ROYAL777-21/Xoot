param(
  [ValidateSet("staging", "production")]
  [string]$Environment = "production",
  [string]$ManifestPath = "supabase/migration-drift-allowlist.json",
  [string]$RemoteMigrationsFile,
  [switch]$RequireRemoteEvidence,
  [switch]$Json
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$manifestFullPath = Join-Path $repoRoot $ManifestPath
$migrationDir = Join-Path $repoRoot "supabase\migrations"
$repairHelperPath = Join-Path $repoRoot "scripts\ops\repair-supabase-migration-history.ps1"

if (-not (Test-Path -LiteralPath $manifestFullPath)) {
  throw "Migration drift allowlist was not found: $ManifestPath"
}

if (-not (Test-Path -LiteralPath $migrationDir)) {
  throw "Migration directory was not found: supabase/migrations"
}

$manifest = Get-Content -Raw -LiteralPath $manifestFullPath | ConvertFrom-Json
$migrationFiles = Get-ChildItem -LiteralPath $migrationDir -Filter "*.sql" | ForEach-Object {
  if ($_.BaseName -match "^(\d{14})_(.+)$") {
    [pscustomobject]@{
      version = $Matches[1]
      name = $Matches[2]
      file = $_.Name
    }
  }
}

$errors = New-Object System.Collections.Generic.List[string]
$warnings = New-Object System.Collections.Generic.List[string]

$versionGroups = $migrationFiles | Group-Object version | Where-Object { $_.Count -gt 1 }
foreach ($group in $versionGroups) {
  $errors.Add("Duplicate local migration version '$($group.Name)' exists in supabase/migrations.")
}

$localVersions = [System.Collections.Generic.HashSet[string]]::new()
foreach ($migration in $migrationFiles) {
  [void]$localVersions.Add($migration.version)
}

$safeRows = @($manifest.schemaEquivalentSafeToRepair)
$blockedRows = @($manifest.blockedPartialOrSplit)
$safeVersions = [System.Collections.Generic.HashSet[string]]::new()
$blockedVersions = [System.Collections.Generic.HashSet[string]]::new()

foreach ($row in $safeRows) {
  [void]$safeVersions.Add([string]$row.localVersion)
  if (-not $localVersions.Contains([string]$row.localVersion)) {
    $errors.Add("Allowlisted safe repair version '$($row.localVersion)' does not exist locally.")
  }
}

foreach ($row in $blockedRows) {
  [void]$blockedVersions.Add([string]$row.localVersion)
  if (-not $localVersions.Contains([string]$row.localVersion)) {
    $errors.Add("Blocked partial/split version '$($row.localVersion)' does not exist locally.")
  }
  if ($safeVersions.Contains([string]$row.localVersion)) {
    $errors.Add("Version '$($row.localVersion)' is both safe-to-repair and blocked.")
  }
}

if (Test-Path -LiteralPath $repairHelperPath) {
  $repairHelperText = Get-Content -Raw -LiteralPath $repairHelperPath
  if ($repairHelperText -notmatch "migration-drift-allowlist\.json") {
    $errors.Add("Repair helper does not require supabase/migration-drift-allowlist.json.")
  }
  if ($repairHelperText -notmatch "schemaEquivalentSafeToRepair") {
    $errors.Add("Repair helper does not derive safe repair versions from schemaEquivalentSafeToRepair.")
  }
  if ($repairHelperText -notmatch "blockedPartialOrSplit") {
    $errors.Add("Repair helper does not derive blocked versions from blockedPartialOrSplit.")
  }
} else {
  $errors.Add("Repair helper was not found at scripts/ops/repair-supabase-migration-history.ps1.")
}

$remoteVersions = @()
if (-not [string]::IsNullOrWhiteSpace($RemoteMigrationsFile)) {
  $remotePath = if ([System.IO.Path]::IsPathRooted($RemoteMigrationsFile)) {
    $RemoteMigrationsFile
  } else {
    Join-Path $repoRoot $RemoteMigrationsFile
  }

  if (-not (Test-Path -LiteralPath $remotePath)) {
    $errors.Add("Remote migrations evidence file was not found: $RemoteMigrationsFile")
  } else {
    $remoteText = Get-Content -Raw -LiteralPath $remotePath
    $remoteVersions = @([regex]::Matches($remoteText, "\d{14}") | ForEach-Object { $_.Value } | Sort-Object -Unique)
  }
} elseif ($RequireRemoteEvidence) {
  $errors.Add("Remote migration evidence is required. Pass -RemoteMigrationsFile with a saved supabase migration list export.")
}

if ($remoteVersions.Count -gt 0) {
  foreach ($row in $safeRows) {
    $expected = if ($Environment -eq "production") { [string]$row.productionLiveVersion } else { [string]$row.stagingLiveVersion }
    if ($remoteVersions -notcontains $expected) {
      $errors.Add("$Environment remote evidence is missing schema-equivalent live version '$expected' for local '$($row.localVersion)'.")
    }
  }

  foreach ($row in $blockedRows) {
    if ($remoteVersions -contains [string]$row.localVersion) {
      $warnings.Add("$Environment remote evidence contains blocked local version '$($row.localVersion)'. Confirm the storage-owner/split-row gap was intentionally resolved.")
    }
  }
}

$report = [pscustomobject][ordered]@{
  checkedAt = (Get-Date).ToString("o")
  environment = $Environment
  manifest = $ManifestPath
  localMigrationCount = @($migrationFiles).Count
  safeToRepairVersions = @($safeRows | ForEach-Object { $_.localVersion })
  blockedPartialOrSplitVersions = @($blockedRows | ForEach-Object { $_.localVersion })
  remoteEvidenceProvided = $remoteVersions.Count -gt 0
  remoteVersionCount = $remoteVersions.Count
  warnings = @($warnings)
  errors = @($errors)
}

if ($Json) {
  $report | ConvertTo-Json -Depth 6
} else {
  $report | Format-List
}

if ($errors.Count -gt 0) {
  exit 1
}
