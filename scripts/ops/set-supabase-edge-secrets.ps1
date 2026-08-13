param(
  [string]$ProjectRef = $(if ($env:XOOT_STAGING_SUPABASE_PROJECT_REF) { $env:XOOT_STAGING_SUPABASE_PROJECT_REF } else { "fxmxyabdjqviqbcxmvlp" }),
  [string]$EnvFile,
  [string]$SupabaseVersion = $(if ($env:SUPABASE_CLI_VERSION) { $env:SUPABASE_CLI_VERSION } else { "2.108.0" })
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command npx.cmd -ErrorAction SilentlyContinue)) {
  throw "npx.cmd is required to run the pinned Supabase CLI on this Windows machine."
}

if (-not $env:SUPABASE_ACCESS_TOKEN) {
  throw "Set SUPABASE_ACCESS_TOKEN locally before setting Edge Function secrets. Do not paste it into chat."
}

if ([string]::IsNullOrWhiteSpace($EnvFile)) {
  throw "Pass -EnvFile with a local, uncommitted secrets file. Example: -EnvFile C:\secure\xoot-staging-edge.env"
}

$resolvedEnvFile = Resolve-Path -LiteralPath $EnvFile

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
if ($resolvedEnvFile.Path.StartsWith($repoRoot.Path, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to read Edge secrets from inside the repository. Keep real secret files outside the repo."
}

& npx.cmd -y "supabase@$SupabaseVersion" login --token $env:SUPABASE_ACCESS_TOKEN --name "xoot-edge-secrets"
& npx.cmd -y "supabase@$SupabaseVersion" secrets set --project-ref $ProjectRef --env-file $resolvedEnvFile.Path
