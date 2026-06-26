param(
  [string]$ProjectRef = $(if ($env:ZOOT_STAGING_SUPABASE_PROJECT_REF) { $env:ZOOT_STAGING_SUPABASE_PROJECT_REF } else { "fxmxyabdjqviqbcxmvlp" }),
  [string]$SupabaseVersion = $(if ($env:SUPABASE_CLI_VERSION) { $env:SUPABASE_CLI_VERSION } else { "2.108.0" }),
  [switch]$DryRun,
  [switch]$DeployFunctions
)

$ErrorActionPreference = "Stop"

function Require-Command {
  param([string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "$Name is required but was not found on PATH."
  }
}

Require-Command "cmd"
Require-Command "node"
Require-Command "npx.cmd"

if (-not $env:SUPABASE_ACCESS_TOKEN -and -not $env:SUPABASE_DB_URL) {
  throw "Set SUPABASE_ACCESS_TOKEN for Supabase Management API access, or SUPABASE_DB_URL for database migration push. Do not paste either value into chat."
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$cleanupMigration = Join-Path $repoRoot "supabase\migrations\20260619001000_remove_demo_seed_data.sql"

if (-not (Test-Path -LiteralPath $cleanupMigration)) {
  throw "Missing demo-data cleanup migration: $cleanupMigration"
}

Push-Location $repoRoot
try {
  if ($env:SUPABASE_DB_URL) {
    $dbPush = @("-y", "supabase@$SupabaseVersion", "db", "push", "--db-url", $env:SUPABASE_DB_URL, "--include-all")
  } else {
    if (-not $env:SUPABASE_DB_PASSWORD) {
      throw "Set SUPABASE_DB_PASSWORD when using SUPABASE_ACCESS_TOKEN + project linking. Do not paste it into chat."
    }
    & npx.cmd -y "supabase@$SupabaseVersion" login --token $env:SUPABASE_ACCESS_TOKEN --name "zoot-staging"
    & npx.cmd -y "supabase@$SupabaseVersion" link --project-ref $ProjectRef --password $env:SUPABASE_DB_PASSWORD --yes
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
} finally {
  Pop-Location
}
