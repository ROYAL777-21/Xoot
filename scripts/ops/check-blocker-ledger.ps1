param(
  [string]$BlockerPath = "blocker.md",
  [switch]$Json
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$resolvedBlockerPath = Join-Path $repoRoot $BlockerPath

if (-not (Test-Path -LiteralPath $resolvedBlockerPath)) {
  Write-Error "Blocker ledger not found: $BlockerPath"
  exit 1
}

$blockerText = Get-Content -Raw -LiteralPath $resolvedBlockerPath

$requiredBlockers = @(
  [pscustomobject]@{
    id = "supabase-auth-redirects"
    description = "Supabase Auth redirect allowlists"
    patterns = @("Supabase Auth redirect allowlists", "xoot://auth/callback", "Google OAuth", "Apple Sign in")
  },
  [pscustomobject]@{
    id = "supabase-cli-auth"
    description = "Supabase CLI/session credential state"
    patterns = @("Supabase CLI", "SUPABASE_ACCESS_TOKEN", "secure login flow")
  },
  [pscustomobject]@{
    id = "supabase-migration-metadata"
    description = "Supabase migration metadata repair"
    patterns = @("MIGRATIONS_FAILED", "guarded repair allowlist", "Do not repair-mark split")
  },
  [pscustomobject]@{
    id = "supabase-leaked-password-protection"
    description = "Supabase leaked-password protection"
    patterns = @("leaked password protection", "Supabase security advisors")
  },
  [pscustomobject]@{
    id = "booking-chat-smoke"
    description = "Booking chat role-based smoke testing"
    patterns = @("booking chat", "role-based smoke testing", "send-booking-message")
  },
  [pscustomobject]@{
    id = "invoice-storage-functions"
    description = "Invoice private storage policy and functions"
    patterns = @("private PDF read policy", "generate-booking-invoice", "resend-booking-invoice")
  },
  [pscustomobject]@{
    id = "concierge-live-deployment"
    description = "Concierge live deployment and smoke testing"
    patterns = @("Concierge", "support-respond", "report-concierge-answer")
  },
  [pscustomobject]@{
    id = "payments-and-payouts"
    description = "Payments and payout activation"
    patterns = @("Stitch/Ozow", "signed webhook smoke tests", "payout")
  },
  [pscustomobject]@{
    id = "twilio-live"
    description = "Twilio production readiness"
    patterns = @("Twilio", "WhatsApp sender", "regulatory")
  },
  [pscustomobject]@{
    id = "mapbox-restricted-tokens"
    description = "Restricted Mapbox tokens"
    patterns = @("Restricted Mapbox tokens", "browser token", "native Expo token", "secret downloads token")
  },
  [pscustomobject]@{
    id = "cloudflare-zone"
    description = "Cloudflare zone, WAF, rate limit and Turnstile"
    patterns = @("Cloudflare", "xoot.co.za", "Turnstile")
  },
  [pscustomobject]@{
    id = "domain-registration"
    description = "Production domain registration"
    patterns = @("No production domain is registered", "domain-dependent setup")
  },
  [pscustomobject]@{
    id = "apple-google-eas-stores"
    description = "Apple, Google, Expo, and store credentials"
    patterns = @("Apple Team ID", "Google Play", "EAS")
  },
  [pscustomobject]@{
    id = "native-device-verification"
    description = "Native preview and device verification"
    patterns = @("real Android-device", "physical iOS", "assistant tests")
  },
  [pscustomobject]@{
    id = "admin-access"
    description = "Admin access provisioning"
    patterns = @("Admin Access", "public.user_roles", "MFA")
  },
  [pscustomobject]@{
    id = "wordpress-seo"
    description = "WordPress SEO stack provisioning"
    patterns = @("WordPress", "SEO/content stack", "publish/sync workflow")
  },
  [pscustomobject]@{
    id = "hostinger-netlify"
    description = "Hostinger and Netlify hosting verification"
    patterns = @("Netlify", "Hostinger", "dashboard verification")
  },
  [pscustomobject]@{
    id = "k6-staging-load-proof"
    description = "k6 staging 10,000-request proof"
    patterns = @("10,000-request", "LOAD_TEST_ENV=staging", "LOAD_TEST_SUMMARY_PATH")
  }
)

$results = foreach ($blocker in $requiredBlockers) {
  $missing = @()
  foreach ($pattern in $blocker.patterns) {
    if ($blockerText -notmatch [regex]::Escape($pattern)) {
      $missing += $pattern
    }
  }

  [pscustomobject]@{
    id = $blocker.id
    description = $blocker.description
    status = $(if ($missing.Count -eq 0) { "pass" } else { "fail" })
    missing_patterns = $missing
  }
}

$summary = [pscustomobject]@{
  checkedAt = (Get-Date).ToString("o")
  blockerPath = $BlockerPath
  required = $requiredBlockers.Count
  pass = @($results | Where-Object status -eq "pass").Count
  fail = @($results | Where-Object status -eq "fail").Count
}

if ($Json) {
  [pscustomobject]@{
    summary = $summary
    results = $results
  } | ConvertTo-Json -Depth 5
} else {
  $summary | Format-List
  $results | Format-Table id, status, description, missing_patterns -AutoSize -Wrap
}

if ($summary.fail -gt 0) {
  exit 1
}
