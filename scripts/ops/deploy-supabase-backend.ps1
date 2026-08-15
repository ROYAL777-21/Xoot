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
    if ($env:XOOT_PRODUCTION_SUPABASE_PROJECT_REF) { $env:XOOT_PRODUCTION_SUPABASE_PROJECT_REF } else { "mvlrkelahhsyjrwgsxaf" }
  } else {
    if ($env:XOOT_STAGING_SUPABASE_PROJECT_REF) { $env:XOOT_STAGING_SUPABASE_PROJECT_REF } else { "fxmxyabdjqviqbcxmvlp" }
  }
}

# ⚠️ XOOT_ first, ZOOT_ accepted.
#
# ZD-029 renamed these reads to `XOOT_` and left every document that tells a person what to export
# saying `ZOOT_` — `STAGING_BACKEND_DEPLOYMENT.md` §32-33 and §69, `environment-readiness.md`,
# `supabase-migration-status-repair-20260630.md`, `blocker.md`. So following the documented setup
# exactly produced:
#
#   "Set PRODUCTION database URL or SUPABASE_ACCESS_TOKEN locally before deploying."
#
# — which reads as a missing credential when the credential was set and only the name was wrong.
# That is the same defect as the invoice `ZOOT_INVOICE_*` variables, on the one path that can
# currently reach production at all: Actions is down and the repo's `SUPABASE_ACCESS_TOKEN` is a
# project key rather than an `sbp_` personal token, so a local shell is the only remaining route.
#
# Accepting both is this repo's existing pattern for a renamed variable — `TWILIO_AUTH_TOKEN` /
# `TWILIO_WEBHOOK_AUTH_TOKEN`, and `XOOT_APP_ENV -> APP_ENV -> ENVIRONMENT`. Docs now say `XOOT_`;
# a shell profile already exporting `ZOOT_` keeps working rather than failing on the day it is
# needed most.
if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
  $DatabaseUrl = if ($Environment -eq "production") {
    if ($env:XOOT_PRODUCTION_SUPABASE_DB_URL) { $env:XOOT_PRODUCTION_SUPABASE_DB_URL } else { $env:ZOOT_PRODUCTION_SUPABASE_DB_URL }
  } else {
    if ($env:XOOT_STAGING_SUPABASE_DB_URL) { $env:XOOT_STAGING_SUPABASE_DB_URL } else { $env:ZOOT_STAGING_SUPABASE_DB_URL }
  }

  if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
    $DatabaseUrl = $env:SUPABASE_DB_URL
  }
}

if ([string]::IsNullOrWhiteSpace($DatabasePassword)) {
  $DatabasePassword = if ($Environment -eq "production") {
    if ($env:XOOT_PRODUCTION_SUPABASE_DB_PASSWORD) { $env:XOOT_PRODUCTION_SUPABASE_DB_PASSWORD } else { $env:ZOOT_PRODUCTION_SUPABASE_DB_PASSWORD }
  } else {
    if ($env:XOOT_STAGING_SUPABASE_DB_PASSWORD) { $env:XOOT_STAGING_SUPABASE_DB_PASSWORD } else { $env:ZOOT_STAGING_SUPABASE_DB_PASSWORD }
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

    & npx.cmd -y "supabase@$SupabaseVersion" login --token $env:SUPABASE_ACCESS_TOKEN --name "xoot-$Environment"
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
      throw "VerifyLive requires a database URL for $Environment. Set XOOT_$($Environment.ToUpperInvariant())_SUPABASE_DB_URL locally."
    }

    & (Join-Path $PSScriptRoot "verify-supabase-live.ps1") -DatabaseUrl $DatabaseUrl
  }
} finally {
  Pop-Location
}
