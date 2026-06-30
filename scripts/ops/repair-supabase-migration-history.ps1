param(
  [ValidateSet("staging", "production")]
  [string]$Environment = "production",
  [string]$DatabaseUrl,
  [string[]]$MigrationVersions = @(
    "20260629113000",
    "20260629200351",
    "20260630005420",
    "20260630102715"
  ),
  [string]$SupabaseVersion = $(if ($env:SUPABASE_CLI_VERSION) { $env:SUPABASE_CLI_VERSION } else { "2.108.0" }),
  [switch]$ConfirmRepair
)

$ErrorActionPreference = "Stop"

$knownSchemaEquivalentVersions = @(
  "20260629113000",
  "20260629200351",
  "20260630005420",
  "20260630102715"
)

$blockedPartialOrSplitVersions = @(
  "20260629194645",
  "20260630003602",
  "20260630155159"
)

function Require-Command {
  param([string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "$Name is required but was not found on PATH."
  }
}

Require-Command "npx.cmd"

if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
  $DatabaseUrl = if ($Environment -eq "production") {
    $env:ZOOT_PRODUCTION_SUPABASE_DB_URL
  } else {
    $env:ZOOT_STAGING_SUPABASE_DB_URL
  }

  if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
    $DatabaseUrl = $env:SUPABASE_DB_URL
  }
}

if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
  throw "Set ZOOT_$($Environment.ToUpperInvariant())_SUPABASE_DB_URL or SUPABASE_DB_URL locally before repairing migration history. Do not paste the database URL into chat."
}

if ($DatabaseUrl -notmatch '^postgres(ql)?://') {
  throw "DatabaseUrl must be a PostgreSQL connection string."
}

$normalizedVersions = @($MigrationVersions | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | ForEach-Object { $_.Trim() })
if ($normalizedVersions.Count -eq 0) {
  throw "At least one migration version is required."
}

foreach ($version in $normalizedVersions) {
  if ($version -notmatch '^\d{14}$') {
    throw "Invalid migration version '$version'. Expected a 14-digit timestamp version."
  }

  if ($blockedPartialOrSplitVersions -contains $version) {
    throw "Refusing to repair-mark '$version'. It is documented as partial or split-applied and still needs owner-level storage-policy reconciliation."
  }

  if ($knownSchemaEquivalentVersions -notcontains $version) {
    throw "Refusing to repair-mark '$version'. Add it to this script only after live catalog checks prove it is fully schema-equivalent."
  }
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$historyDir = Join-Path ([System.IO.Path]::GetTempPath()) "zoot-supabase-migration-repair"
New-Item -ItemType Directory -Force -Path $historyDir | Out-Null
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$beforeFile = Join-Path $historyDir "$Environment-migration-list-before-$timestamp.txt"
$afterFile = Join-Path $historyDir "$Environment-migration-list-after-$timestamp.txt"

Push-Location $repoRoot
try {
  Write-Host "Capturing current migration list to $beforeFile"
  & npx.cmd -y "supabase@$SupabaseVersion" migration list --db-url $DatabaseUrl > $beforeFile

  Write-Host "Prepared migration-history repair for $Environment."
  Write-Host "Versions approved for this guarded repair:"
  $normalizedVersions | ForEach-Object { Write-Host " - $_" }

  if (-not $ConfirmRepair) {
    Write-Host "Dry run only. Re-run with -ConfirmRepair after reviewing $beforeFile and docs/implementation/supabase-migration-status-repair-20260630.md."
    return
  }

  foreach ($version in $normalizedVersions) {
    Write-Host "Marking migration $version as applied in $Environment history."
    & npx.cmd -y "supabase@$SupabaseVersion" migration repair --db-url $DatabaseUrl --status applied $version
  }

  Write-Host "Capturing updated migration list to $afterFile"
  & npx.cmd -y "supabase@$SupabaseVersion" migration list --db-url $DatabaseUrl > $afterFile
} finally {
  Pop-Location
}
