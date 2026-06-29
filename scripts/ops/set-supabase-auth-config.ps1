param(
  [string]$ProjectRef = $env:ZOOT_SUPABASE_PROJECT_REF,
  [string]$SiteUrl = $env:ZOOT_AUTH_SITE_URL,
  [string[]]$RedirectUrls = @(),
  [string]$RedirectFile = $env:ZOOT_AUTH_REDIRECT_FILE,
  [int]$JwtExpirySeconds = 3600,
  [int]$PasswordMinLength = 12,
  [switch]$RequireStrongPasswordCharacters,
  [switch]$EnableLeakedPasswordProtection,
  [switch]$Apply
)

$ErrorActionPreference = "Stop"

function Split-RedirectText {
  param([string]$Text)

  if ([string]::IsNullOrWhiteSpace($Text)) {
    return @()
  }

  return @(
    $Text -split "[,\r\n]+" |
      ForEach-Object { $_.Trim() } |
      Where-Object { -not [string]::IsNullOrWhiteSpace($_) -and -not $_.StartsWith("#") }
  )
}

function Assert-SafePublicUrl {
  param(
    [string]$Value,
    [string]$Name,
    [switch]$AllowNativeScheme
  )

  if ([string]::IsNullOrWhiteSpace($Value)) {
    throw "Missing $Name. Set it locally; do not paste secrets into chat."
  }

  if ($Value -match "(?i)your-|placeholder|example|changeme|todo|<final-domain>|<staging-domain>|<production-domain>") {
    throw "$Name looks like a placeholder: $Value"
  }

  $uri = $null
  if (-not [System.Uri]::TryCreate($Value, [System.UriKind]::Absolute, [ref]$uri)) {
    throw "$Name is not an absolute URL: $Value"
  }

  $allowedSchemes = @("https", "http")
  if ($AllowNativeScheme) {
    $allowedSchemes += "zoot"
  }

  if ($allowedSchemes -notcontains $uri.Scheme) {
    throw "$Name must use one of these schemes: $($allowedSchemes -join ', '). Got: $Value"
  }

  if ($uri.Scheme -eq "http" -and $uri.Host -notin @("localhost", "127.0.0.1")) {
    throw "$Name may use http only for localhost or 127.0.0.1: $Value"
  }

  if ($Value.Contains(",")) {
    throw "$Name must not contain commas: $Value"
  }
}

if ([string]::IsNullOrWhiteSpace($ProjectRef)) {
  throw "Missing ProjectRef. Set ZOOT_SUPABASE_PROJECT_REF or pass -ProjectRef."
}

if ($ProjectRef -notmatch "^[a-z]{20}$") {
  throw "ProjectRef must be a 20-letter Supabase project ref."
}

Assert-SafePublicUrl -Value $SiteUrl -Name "SiteUrl"

$envRedirects = Split-RedirectText -Text $env:ZOOT_AUTH_REDIRECT_URLS
$fileRedirects = @()
if (-not [string]::IsNullOrWhiteSpace($RedirectFile)) {
  $resolvedRedirectFile = Resolve-Path -LiteralPath $RedirectFile
  $repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
  if ($resolvedRedirectFile.Path.StartsWith($repoRoot.Path, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to read live redirect configuration from inside the repository. Keep environment-specific files outside the repo."
  }
  $fileRedirects = Split-RedirectText -Text (Get-Content -Raw -LiteralPath $resolvedRedirectFile.Path)
}

$allRedirects = @($RedirectUrls + $envRedirects + $fileRedirects) |
  ForEach-Object { $_.Trim() } |
  Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
  Select-Object -Unique

if ($allRedirects.Count -eq 0) {
  throw "No redirect URLs supplied. Pass -RedirectUrls, set ZOOT_AUTH_REDIRECT_URLS, or pass -RedirectFile outside the repo."
}

foreach ($redirect in $allRedirects) {
  Assert-SafePublicUrl -Value $redirect -Name "RedirectUrl" -AllowNativeScheme
}

if (-not $env:SUPABASE_ACCESS_TOKEN) {
  throw "Set SUPABASE_ACCESS_TOKEN locally before applying Supabase Auth config. Do not paste it into chat."
}

$requiredCharacters = ""
if ($RequireStrongPasswordCharacters) {
  $requiredCharacters = "abcdefghijklmnopqrstuvwxyz:ABCDEFGHIJKLMNOPQRSTUVWXYZ:0123456789:!@#$%^&*()_+-=[]{};'\\:""|<>?,./`~"
}

$body = [ordered]@{
  site_url = $SiteUrl
  uri_allow_list = ($allRedirects -join ",")
  jwt_exp = $JwtExpirySeconds
  password_min_length = $PasswordMinLength
  password_required_characters = $requiredCharacters
  refresh_token_rotation_enabled = $true
  security_update_password_require_reauthentication = $true
}

if ($EnableLeakedPasswordProtection) {
  $body.password_hibp_enabled = $true
}

$sanitized = [ordered]@{
  project_ref = $ProjectRef
  site_url = $SiteUrl
  redirect_count = $allRedirects.Count
  redirects = $allRedirects
  jwt_exp = $JwtExpirySeconds
  password_min_length = $PasswordMinLength
  strong_password_characters = [bool]$RequireStrongPasswordCharacters
  leaked_password_protection_requested = [bool]$EnableLeakedPasswordProtection
  apply = [bool]$Apply
}

if (-not $Apply) {
  Write-Host "Dry run only. Add -Apply to PATCH Supabase Auth config."
  $sanitized | ConvertTo-Json -Depth 5
  exit 0
}

$headers = @{
  Authorization = "Bearer $($env:SUPABASE_ACCESS_TOKEN)"
  "Content-Type" = "application/json"
}

$payload = $body | ConvertTo-Json -Depth 5
$uri = "https://api.supabase.com/v1/projects/$ProjectRef/config/auth"

try {
  $response = Invoke-RestMethod -Method Patch -Uri $uri -Headers $headers -Body $payload
  Write-Host "Supabase Auth config updated. No secret values printed."
  [ordered]@{
    project_ref = $ProjectRef
    site_url = $response.site_url
    uri_allow_list = $response.uri_allow_list
    password_min_length = $response.password_min_length
    password_hibp_enabled = $response.password_hibp_enabled
    refresh_token_rotation_enabled = $response.refresh_token_rotation_enabled
  } | ConvertTo-Json -Depth 5
} catch {
  $message = $_.Exception.Message
  if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
    $message = $_.ErrorDetails.Message
  }
  throw "Supabase Auth config update failed: $message"
}
