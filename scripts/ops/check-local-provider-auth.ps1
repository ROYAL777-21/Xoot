param()

$ErrorActionPreference = "Continue"

function Test-Command {
  param([string]$Name)
  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if ($command) {
    return [pscustomobject]@{
      name = $Name
      installed = $true
      source = $command.Source
    }
  }

  return [pscustomobject]@{
    name = $Name
    installed = $false
    source = $null
  }
}

function Invoke-Status {
  param(
    [string]$Name,
    [scriptblock]$Script,
    [scriptblock]$OkWhen
  )

  try {
    $output = & $Script 2>&1
    $text = (($output | Out-String).Trim() -replace '(?i)(password|token|secret|key)=\S+', '$1=<redacted>')
    $ok = ($LASTEXITCODE -eq 0)
    if ($OkWhen) {
      $ok = [bool](& $OkWhen $text)
    }

    return [pscustomobject]@{
      name = $Name
      ok = $ok
      output = $text
    }
  } catch {
    return [pscustomobject]@{
      name = $Name
      ok = $false
      output = $_.Exception.Message
    }
  }
}

$codeRabbitBin = Join-Path $env:LOCALAPPDATA "Programs\CodeRabbit\bin"
$bunBin = Join-Path $env:USERPROFILE ".bun\bin"
$env:Path = "$codeRabbitBin;$bunBin;$env:Path"

$commands = @(
  Test-Command "node"
  Test-Command "npm"
  Test-Command "gh"
  Test-Command "coderabbit"
  Test-Command "cr"
  Test-Command "supabase"
  Test-Command "psql"
  Test-Command "docker"
)

$statuses = @(
  Invoke-Status "supabase-cli" { npx.cmd supabase --version }
  Invoke-Status "supabase-auth" { npx.cmd supabase projects list }
  Invoke-Status "github-auth" { gh auth status }
  Invoke-Status "coderabbit-version" { coderabbit --version }
  Invoke-Status "coderabbit-auth" { coderabbit auth status --agent } { param($Text) $Text -match '"authenticated"\s*:\s*true' }
)

[pscustomobject]@{
  checkedAt = (Get-Date).ToString("o")
  commands = $commands
  statuses = $statuses
  notes = @(
    "This report intentionally avoids printing secret values.",
    "If supabase-auth is false, set SUPABASE_ACCESS_TOKEN locally or run supabase login.",
    "If github-auth is false, run gh auth login.",
    "If coderabbit-auth is false on Windows, use coderabbit auth login --api-key with a key from an approved vault, not chat."
  )
} | ConvertTo-Json -Depth 6
