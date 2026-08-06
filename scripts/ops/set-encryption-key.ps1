<#
.SYNOPSIS
  Generates and sets ENCRYPTION_KEY for a Supabase project's Edge Functions.

.DESCRIPTION
  ENCRYPTION_KEY is the only key that can decrypt `sensitive_booking_access` — gate codes,
  alarm codes, entry notes. `sensitive-access-read` and `sensitive-access-save` fail closed
  without it, deliberately: the previous code fell back to deriving the key from the service
  role key, which meant rotating that key would have made every stored credential permanently
  unreadable.

  This script exists because the step is easy to get wrong in ways that are silent until they
  are expensive:

    - Using a non-cryptographic random source. `Get-Random` is a PRNG seeded from the system
      clock and is NOT suitable for key material. This uses RandomNumberGenerator.
    - Using the same key for staging and production, so a staging leak decrypts production
      gate codes.
    - Setting it and not saving it. Supabase does not show a secret again after it is saved,
      and there is no recovery path once real gate codes are encrypted under it.
    - Leaving the plaintext key in a file, in shell history, or inside the repository.

  Run once per project, with a DIFFERENT key each time.

.PARAMETER ProjectRef
  Required, and deliberately has no default so the target is always a conscious choice.
    production  mvlrkelahhsyjrwgsxaf
    staging     fxmxyabdjqviqbcxmvlp

.PARAMETER Key
  Optional. Supply your own value (for example one your password manager generated). Omit it
  and a 32-byte cryptographically secure key is generated for you.

.EXAMPLE
  $env:SUPABASE_ACCESS_TOKEN = "<token from supabase.com/dashboard/account/tokens>"
  npm run ops:supabase:encryption-key -- -ProjectRef fxmxyabdjqviqbcxmvlp
#>
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("mvlrkelahhsyjrwgsxaf", "fxmxyabdjqviqbcxmvlp")]
  [string]$ProjectRef,

  [string]$Key,

  [string]$SupabaseVersion = $(if ($env:SUPABASE_CLI_VERSION) { $env:SUPABASE_CLI_VERSION } else { "2.108.0" })
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command npx.cmd -ErrorAction SilentlyContinue)) {
  throw "npx.cmd is required to run the pinned Supabase CLI on this Windows machine."
}

if (-not $env:SUPABASE_ACCESS_TOKEN) {
  throw "Set SUPABASE_ACCESS_TOKEN in this shell before running. Do not paste it into chat. Create one at https://supabase.com/dashboard/account/tokens"
}

$label = if ($ProjectRef -eq "mvlrkelahhsyjrwgsxaf") { "PRODUCTION" } else { "staging" }

if ([string]::IsNullOrWhiteSpace($Key)) {
  # Cryptographically secure. Get-Random is a clock-seeded PRNG and must never be used here.
  $bytes = [byte[]]::new(32)
  [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
  $Key = [Convert]::ToBase64String($bytes)
  $generated = $true
} else {
  $generated = $false
}

Write-Host ""
Write-Host "Target project : $ProjectRef ($label)" -ForegroundColor Cyan
Write-Host "Key source     : $(if ($generated) { 'generated now, 32 bytes from RandomNumberGenerator' } else { 'supplied by you' })"
Write-Host ""
Write-Host "ENCRYPTION_KEY value -- copy it into your password manager NOW:" -ForegroundColor Yellow
Write-Host ""
Write-Host "    $Key"
Write-Host ""
Write-Host "Supabase will not show this again. If it is lost after real gate codes exist," -ForegroundColor Yellow
Write-Host "those gate codes cannot be decrypted by anyone, including you." -ForegroundColor Yellow
Write-Host ""

$confirmation = Read-Host "Type SAVED once it is in your password manager (anything else aborts)"
if ($confirmation -ne "SAVED") {
  throw "Aborted before setting the secret. Nothing was changed."
}

# Written outside the repository, and removed in the finally block even if the CLI throws.
$tempFile = Join-Path ([System.IO.Path]::GetTempPath()) ("xoot-edge-" + [guid]::NewGuid().ToString("N") + ".env")
try {
  # -NoNewline avoids a trailing newline being read as part of the value by some parsers.
  [System.IO.File]::WriteAllText($tempFile, "ENCRYPTION_KEY=$Key")

  & npx.cmd -y "supabase@$SupabaseVersion" login --token $env:SUPABASE_ACCESS_TOKEN --name "xoot-encryption-key"
  if ($LASTEXITCODE -ne 0) { throw "supabase login failed with exit code $LASTEXITCODE." }

  & npx.cmd -y "supabase@$SupabaseVersion" secrets set --project-ref $ProjectRef --env-file $tempFile
  if ($LASTEXITCODE -ne 0) { throw "supabase secrets set failed with exit code $LASTEXITCODE." }
}
finally {
  if (Test-Path -LiteralPath $tempFile) {
    # Overwrite before deleting so the plaintext is not left in free space.
    try { [System.IO.File]::WriteAllText($tempFile, ("0" * 256)) } catch { }
    Remove-Item -LiteralPath $tempFile -Force -ErrorAction SilentlyContinue
  }
}

Write-Host ""
Write-Host "Set. Verifying it is listed (names only, values are never shown):" -ForegroundColor Green
& npx.cmd -y "supabase@$SupabaseVersion" secrets list --project-ref $ProjectRef

Write-Host ""
Write-Host "Done for $ProjectRef ($label)." -ForegroundColor Green
Write-Host "Run this again for the other project with a DIFFERENT key, so a staging leak"
Write-Host "cannot decrypt production gate codes."
