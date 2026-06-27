param(
  [switch]$Supabase,
  [switch]$GitHub,
  [switch]$CodeRabbit,
  [string]$SupabaseProfileName = "zoot-local"
)

$ErrorActionPreference = "Stop"

function Test-Command {
  param([string]$Name)
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Add-IfExistsToPath {
  param([string]$Path)
  if ((-not [string]::IsNullOrWhiteSpace($Path)) -and (Test-Path -LiteralPath $Path)) {
    $env:Path = "$Path;$env:Path"
  }
}

if (-not ($Supabase -or $GitHub -or $CodeRabbit)) {
  $Supabase = $true
  $GitHub = $true
  $CodeRabbit = $true
}

Add-IfExistsToPath (Join-Path $env:LOCALAPPDATA "Programs\CodeRabbit\bin")
Add-IfExistsToPath (Join-Path $env:USERPROFILE ".bun\bin")

if ($Supabase) {
  if (-not (Test-Command "npx.cmd")) {
    throw "npx.cmd is required for Supabase CLI setup."
  }

  if ([string]::IsNullOrWhiteSpace($env:SUPABASE_ACCESS_TOKEN)) {
    Write-Host "SUPABASE_ACCESS_TOKEN is not set. Starting browser-based Supabase login."
    Write-Host "Do not paste the token into chat. Complete login in the browser or set SUPABASE_ACCESS_TOKEN locally and rerun."
    & npx.cmd -y supabase@2.108.0 login --name $SupabaseProfileName
  } else {
    Write-Host "Logging Supabase CLI in with SUPABASE_ACCESS_TOKEN from the local environment."
    & npx.cmd -y supabase@2.108.0 login --token $env:SUPABASE_ACCESS_TOKEN --name $SupabaseProfileName
  }
}

if ($GitHub) {
  if (-not (Test-Command "gh")) {
    throw "GitHub CLI is required. Install gh before running GitHub setup."
  }

  & gh auth status *> $null
  if ($LASTEXITCODE -eq 0) {
    Write-Host "GitHub CLI is already authenticated."
  } elseif (-not [string]::IsNullOrWhiteSpace($env:GH_TOKEN)) {
    Write-Host "Using GH_TOKEN from the local environment for this GitHub CLI session."
    & gh auth status
  } else {
    Write-Host "Starting GitHub browser login. Do not paste tokens into chat."
    & gh auth login --web
  }
}

if ($CodeRabbit) {
  if (-not (Test-Command "coderabbit")) {
    throw "CodeRabbit CLI is required. Install it before running CodeRabbit setup."
  }

  $status = (& coderabbit auth status --agent 2>&1 | Out-String)
  if ($status -match '"authenticated"\s*:\s*true') {
    Write-Host "CodeRabbit CLI is already authenticated."
  } elseif (-not [string]::IsNullOrWhiteSpace($env:CODERABBIT_API_KEY)) {
    Write-Host "Authenticating CodeRabbit CLI with CODERABBIT_API_KEY from the local environment."
    & coderabbit auth login --api-key $env:CODERABBIT_API_KEY
  } else {
    throw "CodeRabbit is not authenticated. Set CODERABBIT_API_KEY locally or install the CodeRabbit GitHub App. Do not paste the key into chat."
  }
}

& (Join-Path $PSScriptRoot "check-local-provider-auth.ps1")
