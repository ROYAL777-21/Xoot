param(
  [string]$DatabaseUrl = $env:SUPABASE_DB_URL,
  [string]$SqlFile = $(Join-Path $PSScriptRoot "sql\verify-production-readiness.sql")
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
  throw "Set SUPABASE_DB_URL locally before live database verification. Do not paste it into chat."
}

if (-not (Test-Path -LiteralPath $SqlFile)) {
  throw "Missing verification SQL file: $SqlFile"
}

if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
  throw "psql is required for live database verification. Install PostgreSQL client tools, then rerun this script."
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$resolvedSqlFile = Resolve-Path -LiteralPath $SqlFile
if (-not $resolvedSqlFile.Path.StartsWith($repoRoot.Path, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to run SQL from outside this repository."
}

& psql $DatabaseUrl -v ON_ERROR_STOP=1 -f $resolvedSqlFile.Path
