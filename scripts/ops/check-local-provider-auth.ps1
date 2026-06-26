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
    [int]$TimeoutSeconds = 20,
    [scriptblock]$OkWhen
  )

  $outFile = New-TemporaryFile
  $errFile = New-TemporaryFile
  try {
    $process = Start-Process -FilePath $FilePath -ArgumentList $ArgumentList -NoNewWindow -PassThru -RedirectStandardOutput $outFile.FullName -RedirectStandardError $errFile.FullName
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

$statuses = @(
  Invoke-ExternalStatus "supabase-cli" "npx.cmd" @("supabase", "--version")
  Invoke-ExternalStatus "supabase-auth" "npx.cmd" @("supabase", "projects", "list")
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
    "If supabase-auth is false, set SUPABASE_ACCESS_TOKEN locally or run supabase login.",
    "If github-auth is false, run gh auth login.",
    "If coderabbit-auth is false on Windows, use coderabbit auth login --api-key with a key from an approved vault, not chat."
  )
} | ConvertTo-Json -Depth 6
