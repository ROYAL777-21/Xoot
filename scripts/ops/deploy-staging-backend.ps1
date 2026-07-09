param(
  [string]$ProjectRef = $(if ($env:ZOOT_STAGING_SUPABASE_PROJECT_REF) { $env:ZOOT_STAGING_SUPABASE_PROJECT_REF } else { "fxmxyabdjqviqbcxmvlp" }),
  [string]$SupabaseVersion = $(if ($env:SUPABASE_CLI_VERSION) { $env:SUPABASE_CLI_VERSION } else { "2.108.0" }),
  [switch]$DryRun,
  [switch]$DeployFunctions,
  [switch]$VerifyLive
)

$ErrorActionPreference = "Stop"

$params = @{
  Environment = "staging"
  ProjectRef = $ProjectRef
  SupabaseVersion = $SupabaseVersion
}

if ($DryRun) { $params.DryRun = $true }
if ($DeployFunctions) { $params.DeployFunctions = $true }
if ($VerifyLive) { $params.VerifyLive = $true }

$scriptPath = Join-Path $PSScriptRoot "deploy-supabase-backend.ps1"
& $scriptPath @params
