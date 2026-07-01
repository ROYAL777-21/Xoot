param(
  [ValidateSet("staging", "production")]
  [string]$Environment = "production",
  [string]$DatabaseUrl,
  [string]$ProjectRef,
  [switch]$PromptDatabasePassword,
  [string[]]$MigrationVersions = @(
    "20260629113000",
    "20260629200351",
    "20260630005420",
    "20260630102715"
  ),
  [string]$SupabaseVersion = $(if ($env:SUPABASE_CLI_VERSION) { $env:SUPABASE_CLI_VERSION } else { "2.108.0" }),
  [switch]$ConfirmRepair,
  [switch]$PlanOnly
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

function Convert-SecureStringToPlainText {
  param([securestring]$Value)

  $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
  try {
    return [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  } finally {
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

function New-SupabaseDirectDatabaseUrl {
  param(
    [string]$ProjectRef,
    [securestring]$DatabasePassword
  )

  if ([string]::IsNullOrWhiteSpace($ProjectRef)) {
    throw "ProjectRef is required when using -PromptDatabasePassword."
  }

  $normalizedProjectRef = $ProjectRef.Trim().ToLowerInvariant()
  if ($normalizedProjectRef -notmatch "^[a-z0-9]{20}$") {
    throw "ProjectRef must be a 20-character lowercase alphanumeric Supabase project ref."
  }

  $plainPassword = Convert-SecureStringToPlainText -Value $DatabasePassword
  if ([string]::IsNullOrWhiteSpace($plainPassword)) {
    throw "Database password cannot be empty."
  }

  $encodedPassword = [System.Uri]::EscapeDataString($plainPassword)
  return "postgresql://postgres:$encodedPassword@db.$normalizedProjectRef.supabase.co:5432/postgres"
}

if ($PlanOnly -and $ConfirmRepair) {
  throw "-PlanOnly cannot be combined with -ConfirmRepair."
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

if ($PlanOnly) {
  [pscustomobject][ordered]@{
    environment = $Environment
    plan_only = $true
    versions_safe_to_repair_mark = $normalizedVersions
    blocked_partial_or_split_versions = $blockedPartialOrSplitVersions
    requires_database_url_for_live_dry_run = $true
    secure_password_prompt_supported = $true
    requires_confirm_repair_for_live_repair = $true
    live_repair_command = "npm run ops:supabase:repair-migrations -- -Environment $Environment"
    live_prompt_command = "npm run ops:supabase:repair-migrations -- -Environment $Environment -ProjectRef <project-ref> -PromptDatabasePassword"
    live_confirm_command = "npm run ops:supabase:repair-migrations -- -Environment $Environment -ConfirmRepair"
    review_runbook = "docs/implementation/supabase-migration-status-repair-20260630.md"
    notes = @(
      "PlanOnly validates the allowlist and refuses known partial/split migrations without requiring credentials.",
      "Run the live dry-run first after loading the approved database URL locally.",
      "Do not run ConfirmRepair until the before-file and runbook have been reviewed."
    )
  } | ConvertTo-Json -Depth 5
  return
}

Require-Command "npx.cmd"

if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
  if ($PromptDatabasePassword) {
    if ([string]::IsNullOrWhiteSpace($ProjectRef)) {
      $ProjectRef = if ($Environment -eq "production") {
        "mvlrkelahhsyjrwgsxaf"
      } else {
        "fxmxyabdjqviqbcxmvlp"
      }
    }

    $securePassword = Read-Host -Prompt "Enter the $Environment Supabase database password" -AsSecureString
    $DatabaseUrl = New-SupabaseDirectDatabaseUrl -ProjectRef $ProjectRef -DatabasePassword $securePassword
  }
}

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
