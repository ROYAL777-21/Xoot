param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("staging", "production")]
  [string]$Environment,
  [string]$ProjectRef,
  [string]$DatabaseUrl,
  [string]$DatabasePassword,
  [string]$SupabaseVersion = $(if ($env:SUPABASE_CLI_VERSION) { $env:SUPABASE_CLI_VERSION } else { "2.108.0" }),
  [switch]$DryRun,
  [switch]$DeployFunctions,
  [switch]$VerifyLive
)

$ErrorActionPreference = "Stop"

function Require-Command {
  param([string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "$Name is required but was not found on PATH."
  }
}

Require-Command "node"
Require-Command "npx.cmd"

if ([string]::IsNullOrWhiteSpace($ProjectRef)) {
  $ProjectRef = if ($Environment -eq "production") {
    if ($env:ZOOT_PRODUCTION_SUPABASE_PROJECT_REF) { $env:ZOOT_PRODUCTION_SUPABASE_PROJECT_REF } else { "mvlrkelahhsyjrwgsxaf" }
  } else {
    if ($env:ZOOT_STAGING_SUPABASE_PROJECT_REF) { $env:ZOOT_STAGING_SUPABASE_PROJECT_REF } else { "fxmxyabdjqviqbcxmvlp" }
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

if ([string]::IsNullOrWhiteSpace($DatabasePassword)) {
  $DatabasePassword = if ($Environment -eq "production") {
    $env:ZOOT_PRODUCTION_SUPABASE_DB_PASSWORD
  } else {
    $env:ZOOT_STAGING_SUPABASE_DB_PASSWORD
  }

  if ([string]::IsNullOrWhiteSpace($DatabasePassword)) {
    $DatabasePassword = $env:SUPABASE_DB_PASSWORD
  }
}

if ([string]::IsNullOrWhiteSpace($DatabaseUrl) -and [string]::IsNullOrWhiteSpace($env:SUPABASE_ACCESS_TOKEN)) {
  throw "Set $($Environment.ToUpperInvariant()) database URL or SUPABASE_ACCESS_TOKEN locally before deploying. Do not paste values into chat."
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$cleanupMigration = Join-Path $repoRoot "supabase\migrations\20260619001000_remove_demo_seed_data.sql"

if (-not (Test-Path -LiteralPath $cleanupMigration)) {
  throw "Missing demo-data cleanup migration: $cleanupMigration"
}

Push-Location $repoRoot
try {
  if (-not [string]::IsNullOrWhiteSpace($DatabaseUrl)) {
    $dbPush = @("-y", "supabase@$SupabaseVersion", "db", "push", "--db-url", $DatabaseUrl, "--include-all")
  } else {
    if ([string]::IsNullOrWhiteSpace($DatabasePassword)) {
      throw "Set $($Environment.ToUpperInvariant()) database password when using SUPABASE_ACCESS_TOKEN + project linking. Do not paste it into chat."
    }

    & npx.cmd -y "supabase@$SupabaseVersion" login --token $env:SUPABASE_ACCESS_TOKEN --name "zoot-$Environment"
    & npx.cmd -y "supabase@$SupabaseVersion" link --project-ref $ProjectRef --password $DatabasePassword --yes
    $dbPush = @("-y", "supabase@$SupabaseVersion", "db", "push", "--linked", "--include-all")
  }

  if ($DryRun) {
    & npx.cmd @($dbPush + "--dry-run")
  } else {
    & npx.cmd @dbPush
  }

  if ($DeployFunctions) {
    if (-not $env:SUPABASE_ACCESS_TOKEN) {
      throw "SUPABASE_ACCESS_TOKEN is required to deploy Edge Functions. Schema migration may still have completed."
    }

    & npx.cmd -y "supabase@$SupabaseVersion" functions deploy --project-ref $ProjectRef --use-api
  }

  if ($VerifyLive) {
    if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
      throw "VerifyLive requires a database URL for $Environment. Set ZOOT_$($Environment.ToUpperInvariant())_SUPABASE_DB_URL locally."
    }

    & (Join-Path $PSScriptRoot "verify-supabase-live.ps1") -DatabaseUrl $DatabaseUrl
  }
} finally {
  Pop-Location
}
