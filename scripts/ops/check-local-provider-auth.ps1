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

function Invoke-ExternalStatus {
  param(
    [string]$Name,
    [string]$FilePath,
    [string[]]$ArgumentList = @(),
    [int]$TimeoutSeconds = 8,
    [scriptblock]$OkWhen
  )

  $command = Get-Command $FilePath -ErrorAction SilentlyContinue
  if (-not $command) {
    return [pscustomobject]@{
      name = $Name
      ok = $false
      output = "$FilePath was not found on PATH."
    }
  }

  $outFile = New-TemporaryFile
  $errFile = New-TemporaryFile
  try {
    $process = Start-Process -FilePath $command.Source -ArgumentList $ArgumentList -NoNewWindow -PassThru -RedirectStandardOutput $outFile.FullName -RedirectStandardError $errFile.FullName
    if (-not $process.WaitForExit($TimeoutSeconds * 1000)) {
      try {
        $process.Kill()
      } catch {
        # Best-effort cleanup only.
      }

      return [pscustomobject]@{
        name = $Name
        ok = $false
        output = "Timed out after ${TimeoutSeconds}s."
      }
    }

    $raw = @(
      Get-Content -Raw -LiteralPath $outFile.FullName -ErrorAction SilentlyContinue
      Get-Content -Raw -LiteralPath $errFile.FullName -ErrorAction SilentlyContinue
    ) -join "`n"
    $text = ($raw.Trim() -replace '(?i)(password|token|secret|key)=\S+', '$1=<redacted>')
    $ok = ($process.ExitCode -eq 0)
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
  } finally {
    Remove-Item -LiteralPath $outFile.FullName, $errFile.FullName -Force -ErrorAction SilentlyContinue
  }
}

$codeRabbitBin = Join-Path $env:LOCALAPPDATA "Programs\CodeRabbit\bin"
$bunBin = Join-Path $env:USERPROFILE ".bun\bin"
$env:Path = "$codeRabbitBin;$bunBin;$env:Path"
$processPath = [Environment]::GetEnvironmentVariable("Path", "Process")
[Environment]::SetEnvironmentVariable("PATH", $null, "Process")
[Environment]::SetEnvironmentVariable("Path", $processPath, "Process")

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

$statuses = @()

$supabaseCommand = Get-Command "supabase" -ErrorAction SilentlyContinue
if ($supabaseCommand) {
  $statuses += Invoke-ExternalStatus "supabase-cli" "supabase" @("--version")
  $statuses += Invoke-ExternalStatus "supabase-auth" "supabase" @("projects", "list")
} elseif ($env:ZOOT_CHECK_NPX_SUPABASE -eq "1") {
  $statuses += Invoke-ExternalStatus "supabase-cli" "npx.cmd" @("-y", "supabase@2.108.0", "--version")
  $statuses += Invoke-ExternalStatus "supabase-auth" "npx.cmd" @("-y", "supabase@2.108.0", "projects", "list")
} else {
  $statuses += [pscustomobject]@{
    name = "supabase-cli"
    ok = $false
    output = "supabase was not found on PATH. Set ZOOT_CHECK_NPX_SUPABASE=1 to probe npx, or install/login the Supabase CLI locally."
  }
  $statuses += [pscustomobject]@{
    name = "supabase-auth"
    ok = $false
    output = "Skipped because supabase CLI was not found on PATH."
  }
}

$statuses += @(
  Invoke-ExternalStatus "github-auth" "gh" @("auth", "status")
  Invoke-ExternalStatus "coderabbit-version" "coderabbit" @("--version")
  Invoke-ExternalStatus "coderabbit-auth" "coderabbit" @("auth", "status", "--agent") -OkWhen { param($Text) $Text -match '"authenticated"\s*:\s*true' }
)

[pscustomobject]@{
  checkedAt = (Get-Date).ToString("o")
  commands = $commands
  statuses = $statuses
  notes = @(
    "This report intentionally avoids printing secret values.",
    "External checks use short timeouts so readiness verification fails fast instead of hanging.",
    "Supabase npx probing is opt-in with ZOOT_CHECK_NPX_SUPABASE=1 because network startup can hang in restricted shells.",
    "If supabase-auth is false, set SUPABASE_ACCESS_TOKEN locally or run supabase login.",
    "If github-auth is false, run gh auth login.",
    "If coderabbit-auth is false on Windows, use coderabbit auth login --api-key with a key from an approved vault, not chat."
  )
} | ConvertTo-Json -Depth 6
