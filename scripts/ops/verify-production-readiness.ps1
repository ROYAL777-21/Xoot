param(
  [switch]$IncludeExternal,
  [switch]$RequireLive,
  [switch]$Json
)

$ErrorActionPreference = "Continue"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$checks = New-Object System.Collections.Generic.List[object]

function Add-Check {
  param(
    [string]$Area,
    [string]$Name,
    [string]$Status,
    [string]$Detail
  )

  $checks.Add([pscustomobject]@{
    area = $Area
    name = $Name
    status = $Status
    detail = $Detail
  })
}

function Resolve-RepoPath {
  param([string]$RelativePath)
  return Join-Path $repoRoot $RelativePath
}

function Read-RepoText {
  param([string]$RelativePath)
  $path = Resolve-RepoPath $RelativePath
  if (-not (Test-Path -LiteralPath $path)) {
    return $null
  }

  return Get-Content -Raw -LiteralPath $path
}

function Test-RepoFile {
  param(
    [string]$Area,
    [string]$RelativePath
  )

  $exists = Test-Path -LiteralPath (Resolve-RepoPath $RelativePath)
  Add-Check $Area $RelativePath ($(if ($exists) { "pass" } else { "fail" })) ($(if ($exists) { "present" } else { "missing" }))
  return $exists
}

function Test-RepoPattern {
  param(
    [string]$Area,
    [string]$RelativePath,
    [string]$Pattern,
    [string]$Name
  )

  $text = Read-RepoText $RelativePath
  $pass = $false
  if ($null -ne $text) {
    $pass = $text -match $Pattern
  }

  Add-Check $Area $Name ($(if ($pass) { "pass" } else { "fail" })) "$RelativePath :: $Pattern"
}

function Add-ManualBlocker {
  param(
    [string]$Area,
    [string]$Name,
    [string]$Detail
  )

  Add-Check $Area $Name "manual" $Detail
}

Test-RepoFile "ops" "blocker.md" | Out-Null
Test-RepoFile "ops" "BLOCKER_REPORT.md" | Out-Null
Test-RepoFile "ops" "scripts/ops/check-local-provider-auth.ps1" | Out-Null
Test-RepoFile "ops" "scripts/ops/setup-local-provider-auth.ps1" | Out-Null
Test-RepoFile "ops" "scripts/ops/deploy-staging-backend.ps1" | Out-Null
Test-RepoFile "ops" "scripts/ops/deploy-production-backend.ps1" | Out-Null
Test-RepoFile "ops" "scripts/ops/deploy-supabase-backend.ps1" | Out-Null
Test-RepoFile "ops" "scripts/ops/set-github-public-vars.ps1" | Out-Null
Test-RepoFile "ops" "scripts/ops/set-supabase-edge-secrets.ps1" | Out-Null
Test-RepoFile "ops" "scripts/ops/set-supabase-auth-config.ps1" | Out-Null
Test-RepoFile "ops" "scripts/ops/verify-supabase-live.ps1" | Out-Null
Test-RepoFile "ops" "scripts/ops/sql/verify-production-readiness.sql" | Out-Null
Test-RepoFile "ops" "scripts/ops/staging-role-smoke.mjs" | Out-Null
Test-RepoFile "ops" "docs/STAGING_ROLE_SMOKE_TESTS.md" | Out-Null
Test-RepoFile "ops" "docs/ADMIN_ACCESS.md" | Out-Null

$blockerText = Read-RepoText "blocker.md"
if ($null -ne $blockerText) {
  Add-Check "ops" "blocker.md unresolved-only ledger" ($(if ($blockerText -notmatch "(?m)^## Resolved\b") { "pass" } else { "fail" })) "should not contain a resolved-history section"
}

Test-RepoPattern "supabase" "supabase/migrations/20260624114802_production_schema_convergence_and_sensitive_access_notifications.sql" "sensitive_access_available_notified_at" "sensitive-access notification timestamp column"
Test-RepoPattern "supabase" "supabase/migrations/20260624114802_production_schema_convergence_and_sensitive_access_notifications.sql" "native_push_subscriptions" "native push subscription table"
Test-RepoPattern "supabase" "supabase/migrations/20260624114953_booking_policy_and_sensitive_access_notifications.sql" "booking_status_valid" "canonical booking status constraint"
Test-RepoPattern "supabase" "supabase/migrations/20260624114953_booking_policy_and_sensitive_access_notifications.sql" "alter column status set default 'draft'" "booking default status draft"
Test-RepoPattern "supabase" "supabase/migrations/20260624114953_booking_policy_and_sensitive_access_notifications.sql" "private\.enqueue_sensitive_access_notifications" "sensitive-access notification enqueue function"
Test-RepoPattern "supabase" "supabase/migrations/20260624114953_booking_policy_and_sensitive_access_notifications.sql" "cron\.schedule" "sensitive-access notification scheduler"
Test-RepoPattern "supabase" "supabase/migrations/20260624121516_policy_performance_hardening.sql" "bookings_participant_read" "optimized participant booking policy"
Test-RepoPattern "supabase" "supabase/migrations/20260624224551_accepted_zooter_job_destination.sql" "get_zooter_job_cards" "safe zooter job-card RPC"
Test-RepoPattern "supabase" "supabase/migrations/20260624224551_accepted_zooter_job_destination.sql" "add column if not exists decline_reason" "accepted-job migration repairs zooter job drift"
Test-RepoPattern "supabase" "supabase/migrations/20260624224551_accepted_zooter_job_destination.sql" "destination_address" "accepted-job destination field"
Test-RepoPattern "supabase" "supabase/migrations/20260624224551_accepted_zooter_job_destination.sql" "zj\.state = 'accepted'" "destination only after accepted job"
Test-RepoPattern "supabase" "supabase/migrations/20260624224551_accepted_zooter_job_destination.sql" "not in \('cancelled', 'completed', 'rated'\)" "destination hidden after terminal booking states"
Test-RepoPattern "supabase" "supabase/migrations/20260627101500_zooter_job_cards_service_boundary.sql" "get_zooter_job_cards_for_user" "service-role zooter job-card RPC"
Test-RepoPattern "supabase" "supabase/migrations/20260627101500_zooter_job_cards_service_boundary.sql" "revoke all on function public\.get_zooter_job_cards\(\) from authenticated" "legacy zooter job-card RPC not browser-callable"
Test-RepoFile "supabase" "supabase/functions/get-zooter-job-cards/index.ts" | Out-Null
Test-RepoPattern "supabase" "supabase/migrations/20260627090000_phase1_governance_controls.sql" "operational_controls" "Phase 1 operational controls table"
Test-RepoPattern "supabase" "supabase/migrations/20260627090000_phase1_governance_controls.sql" "approval_requests" "Phase 1 approval request model"
Test-RepoPattern "supabase" "supabase/migrations/20260627090000_phase1_governance_controls.sql" "provider_events" "Phase 1 provider idempotency registry"
Test-RepoPattern "supabase" "supabase/migrations/20260627090000_phase1_governance_controls.sql" "private\.claim_provider_event" "Phase 1 provider event claim helper"
Test-RepoPattern "supabase" "supabase/migrations/20260627090000_phase1_governance_controls.sql" "private\.consume_rate_limit" "Phase 1 rate-limit helper"
Test-RepoPattern "supabase" "supabase/migrations/20260627090000_phase1_governance_controls.sql" "analytics_event_contracts" "Phase 1 analytics privacy contract"
Test-RepoPattern "supabase" "supabase/migrations/20260627103000_governance_advisor_followups.sql" "operational_controls_approved_by_idx" "Phase 1 governance FK advisor indexes"
Test-RepoPattern "supabase" "supabase/migrations/20260627103000_governance_advisor_followups.sql" "public\.has_role\(\(select auth\.uid\(\)\)" "Phase 1 governance RLS initplan cleanup"
Test-RepoPattern "supabase" "supabase/functions/_shared/governance-utils.ts" "claim_provider_event" "Phase 1 Edge provider-event claim wrapper"
Test-RepoPattern "supabase" "supabase/functions/_shared/governance-utils.ts" "consume_rate_limit" "Phase 1 Edge rate-limit wrapper"
Test-RepoPattern "supabase" "supabase/functions/confirm-payment/index.ts" "claimProviderEvent" "payment webhook provider idempotency"
Test-RepoPattern "supabase" "supabase/functions/_shared/twilio-webhook.ts" "claimProviderEvent" "Twilio webhook provider idempotency"
Test-RepoPattern "supabase" "supabase/functions/support-respond/index.ts" "consumeRateLimit" "Concierge rate-limit enforcement"
Test-RepoPattern "supabase" "supabase/functions/support-respond/index.ts" "support\.openai_fallback" "Concierge OpenAI fallback operational gate"
Test-RepoFile "supabase" "supabase/functions/admin-control-management/index.ts" | Out-Null
Test-RepoPattern "supabase" "supabase/functions/admin-control-management/index.ts" "admin_manage_operational_control" "admin control-management audit action"
Test-RepoPattern "supabase" "supabase/migrations/20260627104500_drop_duplicate_production_indexes.sql" "idx_fk_bookings_710be9c8ff0ac18a769b7bbdc2139821" "production duplicate booking index cleanup"
Test-RepoPattern "supabase" "supabase/migrations/20260627104500_drop_duplicate_production_indexes.sql" "idx_fk_integration_outbox_5366d64d19a03af936eb8e766c10b676" "production duplicate outbox index cleanup"
Test-RepoPattern "supabase" "supabase/migrations/20260627110000_legacy_rls_policy_convergence.sql" "support_tickets_select_owner_or_admin" "legacy support ticket RLS convergence"
Test-RepoPattern "supabase" "supabase/migrations/20260627110000_legacy_rls_policy_convergence.sql" "user_roles_select_owner_or_admin" "legacy user role RLS convergence"
Test-RepoPattern "supabase" "supabase/migrations/20260627110000_legacy_rls_policy_convergence.sql" "zooter_reliability_metrics_select_owner_or_admin" "legacy reliability RLS convergence"
Test-RepoPattern "supabase" "supabase/migrations/20260627110000_legacy_rls_policy_convergence.sql" "zooters_select_self_or_admin" "legacy zooter RLS convergence"
Test-RepoPattern "supabase" "supabase/migrations/20260627110000_legacy_rls_policy_convergence.sql" "revoke all on table public\.zooters from anon" "zooters base table anon grant removal"
Test-RepoPattern "supabase" "supabase/migrations/20260627110000_legacy_rls_policy_convergence.sql" "security invoker" "public has_role is self-scoped security invoker"
Test-RepoPattern "supabase" "supabase/migrations/20260627113000_performance_advisor_cleanup.sql" "admin_review_queue_insert_user_or_admin" "admin review queue permissive policy convergence"
Test-RepoPattern "supabase" "supabase/migrations/20260627113000_performance_advisor_cleanup.sql" "messages_participants_select" "messages permissive policy convergence"
Test-RepoPattern "supabase" "supabase/migrations/20260627113000_performance_advisor_cleanup.sql" "favorites_select_own" "favorites permissive policy convergence"
Test-RepoPattern "supabase" "supabase/migrations/20260627113000_performance_advisor_cleanup.sql" "push_tokens_select_own" "push token auth-initplan cleanup"
Test-RepoPattern "supabase" "supabase/migrations/20260627113000_performance_advisor_cleanup.sql" "create index if not exists" "FK-covering indexes created conditionally"
Test-RepoPattern "supabase" "supabase/migrations/20260627120000_legacy_auth_initplan_cleanup.sql" "regexp_replace" "legacy auth.uid initplan cleanup"
Test-RepoPattern "supabase" "supabase/migrations/20260627120000_legacy_auth_initplan_cleanup.sql" "obj_description" "legacy RLS policy comments preserved"
Test-RepoPattern "phase-2-chat" "supabase/migrations/20260629113000_booking_chat_action_layer.sql" "revoke insert, update, delete on table public\.messages from authenticated" "direct booking chat mutations revoked"
Test-RepoPattern "phase-2-chat" "supabase/migrations/20260629113000_booking_chat_action_layer.sql" "booking_message_reports" "booking chat report table"
Test-RepoPattern "phase-2-chat" "supabase/migrations/20260629113000_booking_chat_action_layer.sql" "booking_message_read_receipts" "booking chat read receipt table"
Test-RepoPattern "phase-2-chat" "supabase/migrations/20260629113000_booking_chat_action_layer.sql" "booking_chat_typing_indicators" "booking chat typing model"
Test-RepoPattern "phase-2-chat" "supabase/migrations/20260629113000_booking_chat_action_layer.sql" "booking\.chat_send" "booking chat kill switch control"
Test-RepoFile "phase-2-chat" "supabase/functions/send-booking-message/index.ts" | Out-Null
Test-RepoPattern "phase-2-chat" "supabase/functions/send-booking-message/index.ts" "consumeRateLimit" "booking chat send rate limit"
Test-RepoPattern "phase-2-chat" "supabase/functions/send-booking-message/index.ts" "booking\.chat_send" "booking chat send operational control"
Test-RepoPattern "phase-2-chat" "supabase/functions/send-booking-message/index.ts" "zoot:e2ee:v1:" "booking chat encrypted envelope required"
Test-RepoFile "phase-2-chat" "supabase/functions/report-booking-message/index.ts" | Out-Null
Test-RepoPattern "phase-2-chat" "supabase/functions/report-booking-message/index.ts" "booking_chat_report" "booking chat report creates admin review queue item"
Test-RepoFile "phase-2-chat" "supabase/functions/mark-booking-message-read/index.ts" | Out-Null
Test-RepoPattern "phase-2-chat" "supabase/config.toml" "\[functions\.send-booking-message\]\s+verify_jwt = true" "send-booking-message requires JWT"
Test-RepoPattern "phase-2-chat" "supabase/config.toml" "\[functions\.report-booking-message\]\s+verify_jwt = true" "report-booking-message requires JWT"
Test-RepoPattern "phase-2-chat" "supabase/config.toml" "\[functions\.mark-booking-message-read\]\s+verify_jwt = true" "mark-booking-message-read requires JWT"
Test-RepoPattern "phase-2-chat" "src/components/zoot/BookingChat.tsx" "send-booking-message" "booking chat sends through Edge Function"
Test-RepoPattern "phase-2-chat" "src/components/zoot/BookingChat.tsx" "report-booking-message" "booking chat report action"
Test-RepoPattern "phase-2-chat" "src/lib/booking-chat-safety.ts" "off_platform" "booking chat client-side off-platform safety filter"

$redirects = @(
  "http://127.0.0.1:5173/auth/callback",
  "http://127.0.0.1:4173/auth/callback",
  "https://staging.zoothome.co.za/auth/callback",
  "https://zoothome.co.za/auth/callback",
  "https://www.zoothome.co.za/auth/callback",
  "zoot://auth/callback"
)
foreach ($redirect in $redirects) {
  Test-RepoPattern "supabase-auth" "supabase/config.toml" ([regex]::Escape($redirect)) "local config redirect: $redirect"
}

Test-RepoPattern "github" "scripts/ops/set-github-public-vars.ps1" "VITE_SUPABASE_URL" "GitHub public Supabase URL variable"
Test-RepoPattern "github" "scripts/ops/set-github-public-vars.ps1" "EXPO_PUBLIC_SUPABASE_URL" "GitHub public Expo Supabase URL variable"
Test-RepoPattern "github" "scripts/ops/set-github-public-vars.ps1" "sb_secret_\|service_role\|BEGIN \[A-Z \]\*PRIVATE KEY" "GitHub variable private-value guard"
Test-RepoPattern "github" "scripts/ops/set-github-public-vars.ps1" "cfat_" "GitHub variable Cloudflare private-token guard"
Test-RepoPattern "github" "scripts/ops/set-github-public-vars.ps1" "sk\\\." "GitHub variable Mapbox private-token guard"
Test-RepoPattern "security" "scripts/security/secret-scan.mjs" "Cloudflare API token" "secret scan catches Cloudflare API tokens"
Test-RepoPattern "security" "scripts/security/secret-scan.mjs" "Mapbox secret token" "secret scan catches Mapbox secret tokens"
Test-RepoPattern "supabase" "scripts/ops/set-supabase-edge-secrets.ps1" "Refusing to read Edge secrets from inside the repository" "Edge secrets file must stay outside repo"
Test-RepoPattern "supabase-auth" "scripts/ops/set-supabase-auth-config.ps1" '/v1/projects/\$ProjectRef/config/auth' "Supabase Auth config uses Management API endpoint"
Test-RepoPattern "supabase-auth" "scripts/ops/set-supabase-auth-config.ps1" "SUPABASE_ACCESS_TOKEN" "Supabase Auth config requires local access token"
Test-RepoPattern "supabase-auth" "scripts/ops/set-supabase-auth-config.ps1" "Dry run only" "Supabase Auth config is dry-run first"
Test-RepoPattern "supabase-auth" "scripts/ops/set-supabase-auth-config.ps1" "Refusing to read live redirect configuration from inside the repository" "Supabase Auth redirect file must stay outside repo"
Test-RepoPattern "supabase-auth" "docs/OAUTH_AND_REDIRECTS.md" "set-supabase-auth-config.ps1" "OAuth docs reference Auth config automation"
Test-RepoPattern "supabase" "scripts/ops/deploy-supabase-backend.ps1" "SUPABASE_ACCESS_TOKEN" "shared deploy requires Supabase auth"
Test-RepoPattern "supabase" "scripts/ops/setup-local-provider-auth.ps1" "supabase@2\.108\.0" "local Supabase auth setup uses pinned npx CLI"
Test-RepoPattern "supabase" "scripts/ops/deploy-production-backend.ps1" "production" "production deploy wrapper exists"
Test-RepoPattern "supabase" "scripts/ops/deploy-supabase-backend.ps1" "VerifyLive" "shared deploy supports live verification"
Test-RepoPattern "supabase" "scripts/ops/deploy-supabase-backend.ps1" "ZOOT_PRODUCTION_SUPABASE_DB_URL" "shared deploy supports production DB URL"
Test-RepoPattern "supabase" "scripts/ops/verify-supabase-live.ps1" "SUPABASE_DB_URL" "live Supabase verifier requires database URL"
Test-RepoPattern "supabase" "scripts/ops/sql/verify-production-readiness.sql" "booking_status_valid" "live SQL checks booking status constraint"
Test-RepoPattern "supabase" "scripts/ops/sql/verify-production-readiness.sql" "get_zooter_job_cards" "live SQL checks zooter card RPC"
Test-RepoPattern "supabase" "scripts/ops/sql/verify-production-readiness.sql" "sensitive_access_available_notified_at" "live SQL checks sensitive-access notification column"
Test-RepoPattern "supabase" "scripts/ops/sql/verify-production-readiness.sql" "private\.enqueue_sensitive_access_notifications" "live SQL checks sensitive-access notification function"
Test-RepoPattern "supabase" "scripts/ops/sql/verify-production-readiness.sql" "integration outbox allows expo push channel" "live SQL checks Expo push outbox channel"
Test-RepoPattern "supabase" "scripts/ops/sql/verify-production-readiness.sql" "no duplicate public indexes" "live SQL checks duplicate indexes"
Test-RepoPattern "supabase" "scripts/ops/sql/verify-production-readiness.sql" "legacy targeted RLS policies converged" "live SQL checks targeted legacy RLS convergence"
Test-RepoPattern "supabase" "scripts/ops/sql/verify-production-readiness.sql" "zooters base table not readable by anon" "live SQL checks zooters base table anon grant"
Test-RepoPattern "supabase" "scripts/ops/sql/verify-production-readiness.sql" "no missing public foreign-key covering indexes" "live SQL checks unindexed foreign keys"
Test-RepoPattern "supabase" "scripts/ops/sql/verify-production-readiness.sql" "performance advisor RLS policy cleanup converged" "live SQL checks performance advisor RLS cleanup"
Test-RepoPattern "supabase" "scripts/ops/sql/verify-production-readiness.sql" "no raw auth uid in public policies" "live SQL checks legacy auth-initplan cleanup"
Test-RepoPattern "coderabbit" "scripts/ops/setup-local-provider-auth.ps1" "CODERABBIT_API_KEY" "CodeRabbit API-key auth support"
Test-RepoPattern "coderabbit" "scripts/ops/setup-local-provider-auth.ps1" "coderabbit auth login --self-hosted" "CodeRabbit self-hosted auth support"
Test-RepoPattern "admin-access" "docs/ADMIN_ACCESS.md" "public\.user_roles" "admin access is role-based"
Test-RepoPattern "domain-readiness" "docs/SECRETS_INVENTORY.md" "does not have a registered production domain yet" "secrets inventory records domain-dependent setup"
Test-RepoPattern "twilio-governance" "docs/AGENT_RULES.md" "Verify OTP, operational SMS, urgent WhatsApp, voice, masked calls" "agent rules match approved Twilio channel scope"
$agentRulesText = Read-RepoText "docs/AGENT_RULES.md"
if ($null -ne $agentRulesText) {
  Add-Check "twilio-governance" "agent rules do not force voice-only Twilio" ($(if ($agentRulesText -notmatch "voice-only") { "pass" } else { "fail" })) "Twilio scope is governed by approved sender/compliance controls, not an obsolete voice-only rule."
}

$liveDatabaseEvidence = Read-RepoText "docs/implementation/live-database-readiness-20260628.md"
if (
  $null -ne $liveDatabaseEvidence -and
  $liveDatabaseEvidence -match 'Staging project `fxmxyabdjqviqbcxmvlp`: 33 pass / 0 fail' -and
  $liveDatabaseEvidence -match 'Production project `mvlrkelahhsyjrwgsxaf`: 33 pass / 0 fail'
) {
  Add-Check "supabase-live" "live database readiness SQL" "pass" "docs/implementation/live-database-readiness-20260628.md records staging and production connector SQL checks."
} else {
  Add-ManualBlocker "supabase-live" "live database readiness SQL" "Run scripts/ops/verify-supabase-live.ps1 with SUPABASE_DB_URL or record authenticated Supabase connector SQL evidence for staging and production."
}

$roleSmokeEvidence = Read-RepoText "docs/implementation/staging-role-smoke-20260628.md"
if (
  $null -ne $roleSmokeEvidence -and
  $roleSmokeEvidence -match '7 pass / 0 fail' -and
  $roleSmokeEvidence -match 'Sensitive access availability notification is enqueued for Zooter'
) {
  Add-Check "supabase-live" "role-based Supabase smoke tests" "pass" "docs/implementation/staging-role-smoke-20260628.md records staging role/RLS/RPC/notification smoke evidence."
} else {
  Add-ManualBlocker "supabase-live" "role-based Supabase smoke tests" "Run npm run ops:smoke:staging -- --all with local staging secrets to seed and verify client, admin, and Zooter users, accepted-job destination visibility, sensitive-access reveals, and notifications."
}

$edgeFunctionEvidence = Read-RepoText "docs/implementation/live-edge-functions-20260629.md"
if (
  $null -ne $edgeFunctionEvidence -and
  $edgeFunctionEvidence -match 'Staging project `fxmxyabdjqviqbcxmvlp`: required functions active' -and
  $edgeFunctionEvidence -match 'Production project `mvlrkelahhsyjrwgsxaf`: required functions active' -and
  $edgeFunctionEvidence -match '`get-booking-public-keys` was deployed to staging and production' -and
  $edgeFunctionEvidence -match 'UNAUTHORIZED_NO_AUTH_HEADER'
) {
  Add-Check "supabase-live" "live Edge Function inventory" "pass" "docs/implementation/live-edge-functions-20260629.md records staging and production function inventory and get-booking-public-keys deployment."
} else {
  Add-ManualBlocker "supabase-live" "live Edge Function inventory" "Re-list staging and production Edge Functions through Supabase and verify required app functions, including get-booking-public-keys, are active."
}

$providerAuthEvidence = Read-RepoText "docs/implementation/provider-auth-cloudflare-attempts-20260629.md"
if (
  $null -ne $providerAuthEvidence -and
  $providerAuthEvidence -match 'LegacyPlatformAuthRequiredError' -and
  $providerAuthEvidence -match 'environment_unsupported' -and
  $providerAuthEvidence -match 'com.cloudflare.api.account.zone.create'
) {
  Add-Check "provider-live" "provider auth and Cloudflare attempt evidence" "pass" "docs/implementation/provider-auth-cloudflare-attempts-20260629.md records current Supabase CLI, CodeRabbit CLI, and Cloudflare zone-create blockers."
} else {
  Add-ManualBlocker "provider-live" "provider auth and Cloudflare attempt evidence" "Re-run provider auth checks and Cloudflare zone list/create attempt, then record non-secret evidence."
}
Add-ManualBlocker "supabase-live" "dashboard Auth redirects" "Requires Supabase dashboard/API access; local config is prepared but live allowlists still need verification."
Add-ManualBlocker "twilio-live" "Twilio production channels" "Requires upgraded Twilio account, phone number, WhatsApp sender, regulatory approvals, dashboard webhook assignment, and verification that current approved secrets are set in Supabase."
Add-ManualBlocker "mapbox-live" "restricted Mapbox tokens" "Requires least-privilege browser, native, and build-download tokens from Mapbox."
Add-ManualBlocker "cloudflare-live" "Cloudflare Zoot zone" "Requires a Cloudflare zone and token with the required zone-management permissions."
Add-ManualBlocker "domain-live" "production domain registration" "Requires a registered final domain before Cloudflare zone, DNS, TLS, OAuth origins, sender-domain DNS, app links, support/legal URLs, and store URLs can be completed."
Add-ManualBlocker "stores-live" "Apple/Google/EAS release credentials" "Requires developer-console records, signing credentials, privacy declarations, and legal review."

if ($IncludeExternal -or $RequireLive) {
  $authScript = Resolve-RepoPath "scripts/ops/check-local-provider-auth.ps1"
  try {
    $authJson = & powershell -ExecutionPolicy Bypass -File $authScript 2>$null
    $authReport = $authJson | ConvertFrom-Json
    foreach ($status in $authReport.statuses) {
      Add-Check "external-auth" $status.name ($(if ($status.ok) { "pass" } else { "fail" })) $status.output
    }
  } catch {
    Add-Check "external-auth" "provider auth diagnostic" "fail" $_.Exception.Message
  }
} else {
  Add-Check "external-auth" "provider auth diagnostic" "skipped" "Pass -IncludeExternal to run local provider auth checks."
}

$summary = [pscustomobject]@{
  checkedAt = (Get-Date).ToString("o")
  pass = @($checks | Where-Object status -eq "pass").Count
  fail = @($checks | Where-Object status -eq "fail").Count
  manual = @($checks | Where-Object status -eq "manual").Count
  skipped = @($checks | Where-Object status -eq "skipped").Count
}

if ($Json) {
  [pscustomobject]@{
    summary = $summary
    checks = $checks
  } | ConvertTo-Json -Depth 6
} else {
  $summary | Format-List
  $checks | Sort-Object area, name | Format-Table area, status, name, detail -AutoSize -Wrap
}

if ($summary.fail -gt 0) {
  exit 1
}

if ($RequireLive -and ($summary.manual -gt 0 -or $summary.skipped -gt 0)) {
  exit 1
}
