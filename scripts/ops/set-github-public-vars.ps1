param(
  [string]$Repo = $(if ($env:GITHUB_REPOSITORY) { $env:GITHUB_REPOSITORY } else { "ROYAL777-21/xoot-your-local-helpers" })
)

$ErrorActionPreference = "Stop"

function Assert-PublicValue {
  param(
    [string]$Key,
    [string]$Value
  )

  if ([string]::IsNullOrWhiteSpace($Value)) {
    throw "Missing $Key in the local environment. Do not paste it into chat."
  }

  if ($Value -match "(?i)your-|placeholder|example|preview\.supabase\.co|changeme|todo") {
    throw "$Key looks like a placeholder. Refusing to set it on GitHub."
  }

  if ($Value -match "(?i)sb_secret_|service_role|BEGIN [A-Z ]*PRIVATE KEY|sk_live_|sk_test_|sk\.|api[_-]?secret|auth[_-]?token|cfat_|personal[_-]?access[_-]?token|download[_-]?token|phx_") {
    throw "$Key looks private. Refusing to set it as a public GitHub variable."
  }
}

function Set-PublicVariable {
  param(
    [string]$Key,
    [switch]$Required
  )

  $value = (Get-Item -Path "Env:$Key" -ErrorAction SilentlyContinue).Value
  if ([string]::IsNullOrWhiteSpace($value)) {
    if ($Required) {
      throw "Missing $Key in the local environment. Do not paste it into chat."
    }

    Write-Host "Skipped optional GitHub variable: $Key"
    return
  }

  Assert-PublicValue -Key $Key -Value $value
  gh variable set $Key --body $value --repo $Repo | Out-Null
  Write-Host "Set GitHub variable: $Key"
}

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  throw "GitHub CLI is required. Install it, run gh auth login, then rerun this script."
}

$required = @(
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_PROJECT_ID"
)

$optionalPublic = @(
  "VITE_APP_ENV",
  "VITE_PUBLIC_SITE_URL",
  "VITE_SITE_URL",
  "VITE_SENTRY_DSN",
  "VITE_SENTRY_ENVIRONMENT",
  "VITE_SENTRY_RELEASE",
  "VITE_POSTHOG_PROJECT_TOKEN",
  "VITE_POSTHOG_HOST",
  "VITE_MAPBOX_PUBLIC_TOKEN",
  "VITE_MAPBOX_BROWSER_TOKEN",
  "VITE_CLOUDFLARE_TURNSTILE_SITE_KEY",
  "VITE_GOOGLE_WEB_CLIENT_ID",
  "VITE_APPLE_SERVICES_ID",
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "EXPO_PUBLIC_SUPABASE_PROJECT_ID",
  "EXPO_PUBLIC_EAS_PROJECT_ID",
  "EXPO_PUBLIC_SITE_URL",
  "EXPO_PUBLIC_SENTRY_DSN",
  "EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN",
  "EXPO_PUBLIC_POSTHOG_HOST",
  "EXPO_PUBLIC_MAPBOX_TOKEN",
  "EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN",
  "EXPO_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY",
  "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID",
  "EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID",
  "EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID",
  "EXPO_PUBLIC_APPLE_SERVICES_ID"
)

foreach ($key in $required) {
  Set-PublicVariable -Key $key -Required
}

foreach ($key in $optionalPublic) {
  Set-PublicVariable -Key $key
}
