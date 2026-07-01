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
Test-RepoFile "ops" "scripts/ops/repair-supabase-migration-history.ps1" | Out-Null
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
Test-RepoPattern "phase-2-chat" "scripts/ops/staging-role-smoke.mjs" "send-booking-message" "staging smoke covers booking chat send"
Test-RepoPattern "phase-2-chat" "scripts/ops/staging-role-smoke.mjs" "mark-booking-message-read" "staging smoke covers booking chat read receipts"
Test-RepoPattern "phase-2-chat" "scripts/ops/staging-role-smoke.mjs" "report-booking-message" "staging smoke covers booking chat reports"
Test-RepoPattern "phase-2-chat" "scripts/ops/staging-role-smoke.mjs" "Client could still insert public.messages directly" "staging smoke verifies direct message inserts are denied"
Test-RepoFile "phase-3-care-plus" "docs/implementation/phase-3-care-plus-household.md" | Out-Null
Test-RepoFile "phase-3-care-plus" "src/hooks/useHouseholdOperatingLayer.ts" | Out-Null
Test-RepoFile "phase-3-care-plus" "src/hooks/useHouseholdOperatingLayer.test.ts" | Out-Null
Test-RepoPattern "phase-3-care-plus" "src/hooks/useHouseholdOperatingLayer.ts" "household_profiles" "household operating layer reads Home Memory"
Test-RepoPattern "phase-3-care-plus" "src/hooks/useHouseholdOperatingLayer.ts" "property_accounts" "household operating layer reads property profiles"
Test-RepoPattern "phase-3-care-plus" "src/hooks/useHouseholdOperatingLayer.ts" "buildReadyModes" "household operating layer derives ready modes"
Test-RepoPattern "phase-3-care-plus" "src/hooks/useHouseholdOperatingLayer.ts" "buildServiceRecoverySignals" "household operating layer derives service recovery"
$householdLayerText = Read-RepoText "src/hooks/useHouseholdOperatingLayer.ts"
if ($null -ne $householdLayerText) {
  Add-Check "phase-3-care-plus" "household operating layer does not return gate codes" ($(if ($householdLayerText -notmatch "gate_code") { "pass" } else { "fail" })) "Gate codes must stay behind the sensitive-access Edge Function."
}
Test-RepoPattern "phase-3-care-plus" "src/pages/app/Plans.tsx" "useHouseholdOperatingLayer" "Care+ plan page uses shared household layer"
Test-RepoPattern "phase-3-care-plus" "src/pages/app/OfficeDashboard.tsx" "useHouseholdOperatingLayer" "office dashboard uses shared household layer"
Test-RepoPattern "phase-3-care-plus" "src/pages/app/AirbnbHostDashboard.tsx" "useHouseholdOperatingLayer" "host dashboard uses shared household layer"
Test-RepoPattern "phase-3-care-plus" "src/pages/care/CarePlus.tsx" "Household operating layer" "Care+ active panel shows household operating status"
Test-RepoFile "phase-4-invoices" "docs/implementation/phase-4-completed-booking-invoices.md" | Out-Null
Test-RepoFile "phase-4-invoices" "supabase/functions/generate-booking-invoice/index.ts" | Out-Null
Test-RepoFile "phase-4-invoices" "supabase/functions/resend-booking-invoice/index.ts" | Out-Null
Test-RepoPattern "phase-4-invoices" "supabase/migrations/20260629194645_completed_booking_invoices.sql" "create table if not exists public\.booking_invoices" "booking invoice table exists"
Test-RepoPattern "phase-4-invoices" "supabase/migrations/20260629194645_completed_booking_invoices.sql" "constraint booking_invoices_booking_unique unique \(booking_id\)" "booking invoice idempotency constraint"
Test-RepoPattern "phase-4-invoices" "supabase/migrations/20260629194645_completed_booking_invoices.sql" "prevent_booking_invoice_snapshot_mutation" "booking invoice immutable snapshot trigger"
Test-RepoPattern "phase-4-invoices" "supabase/migrations/20260629194645_completed_booking_invoices.sql" "'booking-invoices', 'booking-invoices', false" "private booking invoice storage bucket"
Test-RepoPattern "phase-4-invoices" "supabase/migrations/20260629194645_completed_booking_invoices.sql" "booking_invoices_owner_or_admin_read" "booking invoice owner/admin RLS"
Test-RepoPattern "phase-4-invoices" "supabase/migrations/20260629194645_completed_booking_invoices.sql" "booking_invoices_owner_admin_read" "booking invoice PDF owner/admin storage policy"
Test-RepoPattern "phase-4-invoices" "supabase/functions/generate-booking-invoice/index.ts" "payment_records" "invoice generation verifies backend payment record"
Test-RepoPattern "phase-4-invoices" "supabase/functions/generate-booking-invoice/index.ts" "booking_invoice_created" "invoice generation queues Brevo outbox delivery"
Test-RepoPattern "phase-4-invoices" "supabase/functions/generate-booking-invoice/index.ts" "ZOOT_INVOICE_LEGAL_ENTITY" "invoice generation has legal config gate"
Test-RepoPattern "phase-4-invoices" "supabase/functions/resend-booking-invoice/index.ts" "booking_invoice_resend" "invoice resend queues original PDF outbox delivery"
Test-RepoPattern "phase-4-invoices" "supabase/config.toml" "\[functions\.generate-booking-invoice\]\s+verify_jwt = true" "generate-booking-invoice requires JWT"
Test-RepoPattern "phase-4-invoices" "supabase/config.toml" "\[functions\.resend-booking-invoice\]\s+verify_jwt = true" "resend-booking-invoice requires JWT"
Test-RepoPattern "phase-4-invoices" "supabase/functions/.env.example" "ZOOT_INVOICE_LEGAL_ENTITY" "invoice legal env template"
Test-RepoPattern "phase-4-invoices" "docs/EMAIL_TEMPLATES.md" "booking_invoice_resend" "email playbook covers invoice resend"
Test-RepoFile "phase-5-concierge" "docs/implementation/phase-5-zoot-concierge.md" | Out-Null
Test-RepoFile "phase-5-concierge" "supabase/functions/report-concierge-answer/index.ts" | Out-Null
Test-RepoPattern "phase-5-concierge" "supabase/migrations/20260629200351_phase5_zoot_concierge.sql" "zoot_concierge_knowledge_versions" "Concierge knowledge versions table"
Test-RepoPattern "phase-5-concierge" "supabase/migrations/20260629200351_phase5_zoot_concierge.sql" "zoot_concierge_feedback" "Concierge feedback table"
Test-RepoPattern "phase-5-concierge" "supabase/migrations/20260629200351_phase5_zoot_concierge.sql" "support\.turnstile_required" "Concierge Turnstile operational gate"
Test-RepoPattern "phase-5-concierge" "supabase/migrations/20260629200351_phase5_zoot_concierge.sql" "refund_payment" "Concierge prohibited payment actions"
Test-RepoPattern "phase-5-concierge" "supabase/functions/_shared/turnstile.ts" "siteverify" "Cloudflare Turnstile server verification"
Test-RepoPattern "phase-5-concierge" "supabase/functions/support-respond/index.ts" "verifyTurnstile" "Concierge Turnstile verification boundary"
Test-RepoPattern "phase-5-concierge" "supabase/functions/support-respond/index.ts" "store: false" "Concierge OpenAI no-store setting"
Test-RepoPattern "phase-5-concierge" "supabase/functions/support-respond/index.ts" "fetchWithTimeout" "Concierge OpenAI timeout fallback"
Test-RepoPattern "phase-5-concierge" "supabase/config.toml" "\[functions\.report-concierge-answer\]\s+verify_jwt = false" "report-concierge-answer allows guest reports"
Test-RepoPattern "phase-5-concierge" "src/components/zoot/ZootSupportBot.tsx" "report-concierge-answer" "Concierge UI reports answers through Edge Function"
Test-RepoFile "phase-6-zoot-black" "docs/implementation/phase-6-zoot-black.md" | Out-Null
Test-RepoPattern "phase-6-zoot-black" "supabase/migrations/20260630003602_phase6_zoot_black_foundation.sql" "zoot_black.enabled" "Zoot Black feature flag exists"
Test-RepoPattern "phase-6-zoot-black" "supabase/migrations/20260630003602_phase6_zoot_black_foundation.sql" "zoot_black_area_pilots" "Zoot Black selected-area pilot gates"
Test-RepoPattern "phase-6-zoot-black" "supabase/migrations/20260630003602_phase6_zoot_black_foundation.sql" "zoot_black_equipment_evidence" "Zoot Black private equipment evidence"
Test-RepoPattern "phase-6-zoot-black" "supabase/migrations/20260630003602_phase6_zoot_black_foundation.sql" "zoot_black_status_history" "Zoot Black status history"
Test-RepoPattern "phase-6-zoot-black" "supabase/migrations/20260630003602_phase6_zoot_black_foundation.sql" "booking_service_line_items" "explicit booking line items"
Test-RepoPattern "phase-6-zoot-black" "supabase/migrations/20260630003602_phase6_zoot_black_foundation.sql" "zoot_black_completion_certificates" "Zoot Black completion certificates"
Test-RepoPattern "phase-6-zoot-black" "supabase/migrations/20260630003602_phase6_zoot_black_foundation.sql" "no_external_certification_claims" "Zoot Black avoids unsupported certification claims"
Test-RepoPattern "phase-6-zoot-black" "src/lib/operations.ts" "canOfferZootBlack" "Zoot Black shared eligibility gate"
Test-RepoPattern "phase-6-zoot-black" "src/lib/operations.ts" "buildZootBlackLineItem" "Zoot Black explicit line item helper"
Test-RepoFile "phase-7-payments" "docs/implementation/phase-7-payments-payouts.md" | Out-Null
Test-RepoPattern "phase-7-payments" "supabase/migrations/20260630005420_phase7_payments_payouts_foundation.sql" "payment_provider_capabilities" "payment provider capability table"
Test-RepoPattern "phase-7-payments" "supabase/migrations/20260630005420_phase7_payments_payouts_foundation.sql" "payment_reconciliation_checks" "payment reconciliation audit table"
Test-RepoPattern "phase-7-payments" "supabase/migrations/20260630005420_phase7_payments_payouts_foundation.sql" "zooter_payout_accounts" "verified payout account table"
Test-RepoPattern "phase-7-payments" "supabase/migrations/20260630005420_phase7_payments_payouts_foundation.sql" "payout_change_requests" "payout account change workflow"
Test-RepoPattern "phase-7-payments" "supabase/migrations/20260630005420_phase7_payments_payouts_foundation.sql" "zooter_payout_holds" "payout hold ledger"
Test-RepoPattern "phase-7-payments" "supabase/migrations/20260630005420_phase7_payments_payouts_foundation.sql" "can_activate_payment_provider" "payment provider activation helper"
Test-RepoPattern "phase-7-payments" "supabase/migrations/20260630005420_phase7_payments_payouts_foundation.sql" "can_release_zooter_payout" "payout release readiness helper"
Test-RepoPattern "phase-7-payments" "supabase/migrations/20260630005420_phase7_payments_payouts_foundation.sql" "payments\.hosted_checkout\.stitch" "Stitch hosted checkout provider gate"
Test-RepoPattern "phase-7-payments" "supabase/migrations/20260630005420_phase7_payments_payouts_foundation.sql" "payments\.hosted_checkout\.ozow" "Ozow hosted checkout provider gate"
Test-RepoPattern "phase-7-payments" "supabase/migrations/20260630005420_phase7_payments_payouts_foundation.sql" "payouts\.enabled" "payout release provider gate"
Test-RepoPattern "phase-7-payments" "src/lib/operations.ts" "canCreateProviderCheckout" "hosted payment checkout shared gate"
Test-RepoPattern "phase-7-payments" "src/lib/operations.ts" "buildPaymentReconciliationReference" "payment reconciliation reference helper"
Test-RepoPattern "phase-7-payments" "src/lib/operations.ts" "canReleaseZooterPayout" "payout release shared gate"
Test-RepoFile "phase-8-native-launch" "docs/implementation/phase-8-native-launch-experience.md" | Out-Null
Test-RepoFile "phase-8-native-launch" "mobile/src/components/native-launch-experience.tsx" | Out-Null
Test-RepoPattern "phase-8-native-launch" "mobile/src/lib/native-launch.ts" "remoteAssets: false" "native launch uses no remote launch assets"
Test-RepoPattern "phase-8-native-launch" "mobile/src/lib/native-launch.ts" "webView: false" "native launch does not use WebView"
Test-RepoPattern "phase-8-native-launch" "mobile/src/lib/native-launch.ts" "getNativeLaunchMode" "native launch static fallback helper"
Test-RepoPattern "phase-8-native-launch" "mobile/src/lib/native-launch.ts" "shouldBypassNativeLaunchExperience" "urgent-route launch bypass helper"
Test-RepoPattern "phase-8-native-launch" "mobile/src/app/index.tsx" "router\.replace\(launchTarget\)" "assistant intents bypass native launch layer"
Test-RepoPattern "phase-8-native-launch" "mobile/src/app/_layout.tsx" "SplashScreen\.setOptions" "Expo splash fade configured"
Test-RepoPattern "phase-8-native-launch" "src/lib/mobile-native-launch.test.ts" "intent=book_clean" "native launch safe voice-booking test"
Test-RepoPattern "phase-8-native-launch" "mobile/src/components/native-launch-experience.tsx" "AccessibilityInfo\.isReduceMotionEnabled" "native launch respects reduced motion"
Test-RepoFile "phase-9-twilio" "docs/implementation/phase-9-twilio-verify-masked-voice.md" | Out-Null
Test-RepoPattern "phase-9-twilio" "supabase/migrations/20260630102715_phase9_twilio_verify_masked_voice.sql" "twilio_verify_attempts" "Twilio Verify redacted attempt table"
Test-RepoPattern "phase-9-twilio" "supabase/migrations/20260630102715_phase9_twilio_verify_masked_voice.sql" "twilio\.verify_otp" "Twilio Verify provider gate"
Test-RepoPattern "phase-9-twilio" "supabase/migrations/20260630102715_phase9_twilio_verify_masked_voice.sql" "twilio\.masked_voice" "Twilio masked voice provider gate"
Test-RepoPattern "phase-9-twilio" "supabase/migrations/20260630102715_phase9_twilio_verify_masked_voice.sql" "twilio\.whatsapp_urgent" "Twilio urgent WhatsApp provider gate"
Test-RepoPattern "phase-9-twilio" "supabase/migrations/20260630102715_phase9_twilio_verify_masked_voice.sql" "private\.can_create_masked_call" "masked voice private eligibility helper"
Test-RepoPattern "phase-9-twilio" "supabase/migrations/20260630102715_phase9_twilio_verify_masked_voice.sql" "masked_call_sessions_no_recording" "masked voice no-recording constraint"
Test-RepoPattern "phase-9-twilio" "supabase/migrations/20260630102715_phase9_twilio_verify_masked_voice.sql" "revoke insert, update, delete on table public\.masked_call_sessions from authenticated" "masked voice direct client writes revoked"
Test-RepoPattern "phase-9-twilio" "supabase/migrations/20260630102715_phase9_twilio_verify_masked_voice.sql" "grant execute on function private\.can_create_masked_call\(uuid, uuid\) to service_role" "masked voice helper service-role only"
Test-RepoPattern "phase-9-twilio" "supabase/functions/create-masked-call/index.ts" "consumeRateLimit" "create-masked-call rate limit"
Test-RepoPattern "phase-9-twilio" "supabase/functions/create-masked-call/index.ts" "can_create_masked_call" "create-masked-call uses DB eligibility helper"
Test-RepoPattern "phase-9-twilio" "supabase/functions/create-masked-call/index.ts" "twilio\.masked_voice" "create-masked-call requires masked voice provider gate"
Test-RepoPattern "phase-9-twilio" "supabase/functions/create-masked-call/index.ts" "if \(providerAllowed && clientPhone && zooterPhone\)" "create-masked-call does not call provider unless gate and phones pass"
Test-RepoPattern "phase-9-twilio" "supabase/functions/create-masked-call/index.ts" "recording_enabled: false" "create-masked-call records no-recording provider status"
Test-RepoPattern "phase-9-twilio" "supabase/functions/ops-workflow/index.ts" "can_create_masked_call" "ops masked-call branch uses DB eligibility helper"
Test-RepoPattern "phase-9-twilio" "supabase/functions/ops-workflow/index.ts" "twilio\.masked_voice" "ops masked-call branch records provider gate status"
Test-RepoPattern "phase-9-twilio" "supabase/config.toml" "\[functions\.create-masked-call\]\s+verify_jwt = true" "create-masked-call requires JWT"
Test-RepoPattern "phase-9-twilio" "supabase/config.toml" "\[functions\.ops-workflow\]\s+verify_jwt = true" "ops-workflow requires JWT"
Test-RepoPattern "phase-9-twilio" "src/lib/twilio-phase9-readiness.test.ts" "Phase 9 Twilio Verify and masked voice readiness" "Phase 9 static regression tests"
Test-RepoFile "phase-10-assistant" "docs/implementation/phase-10-siri-app-intents.md" | Out-Null
Test-RepoFile "phase-10-assistant" "mobile/plugins/withZootAssistantIntents.cjs" | Out-Null
Test-RepoPattern "phase-10-assistant" "mobile/app.config.ts" "\./plugins/withZootAssistantIntents\.cjs" "Expo config registers assistant-intents plugin"
Test-RepoPattern "phase-10-assistant" "mobile/plugins/withZootAssistantIntents.cjs" "android\.app\.shortcuts" "assistant plugin registers Android shortcuts"
Test-RepoPattern "phase-10-assistant" "mobile/plugins/withZootAssistantIntents.cjs" "ZootAppIntents\.swift" "assistant plugin copies iOS App Intents"
Test-RepoPattern "phase-10-assistant" "mobile/plugins/withZootAssistantIntents.cjs" "withXcodeProject" "assistant plugin updates generated Xcode project"
Test-RepoPattern "phase-10-assistant" "native/ios/ZootLiveActivities/ZootAppIntents.swift" "ZootAssistantDeepLinkSafety" "iOS assistant handoff sanitizes area text"
Test-RepoPattern "phase-10-assistant" "native/ios/ZootLiveActivities/ZootAppIntents.swift" "Confirm your address, time and payment inside the app" "iOS assistant requires in-app confirmation"
Test-RepoPattern "phase-10-assistant" "native/android/res/xml/shortcuts.xml" "zoot://book\?intent=book_clean" "Android shortcut opens native booking route"
Test-RepoPattern "phase-10-assistant" "native/android/res/xml/shortcuts.xml" "zoot://zooter/jobs\?intent=zooter_jobs" "Android shortcut opens native Zooter jobs route"
Test-RepoFile "phase-10-assistant" "mobile/src/app/bookings.tsx" | Out-Null
Test-RepoFile "phase-10-assistant" "mobile/src/app/zooter/jobs.tsx" | Out-Null
Test-RepoPattern "phase-10-assistant" "src/lib/phase10-assistant-intents-readiness.test.ts" "Phase 10 Siri and Android assistant readiness" "Phase 10 static regression tests"

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
Test-RepoPattern "github" ".github/workflows/web-preview.yml" "cache-dependency-path: '\*\*/package-lock\.json'" "Web build npm cache covers root and mobile lockfiles"
Test-RepoPattern "github" ".github/workflows/web-preview.yml" "npm ci --no-audit --prefer-offline" "Web dependency install reduces registry calls"
Test-RepoPattern "github" ".github/workflows/web-preview.yml" "npm --prefix mobile ci --no-audit --prefer-offline" "Mobile dependency install reduces registry calls"
Test-RepoPattern "github" ".github/workflows/web-preview.yml" "attempts=3" "Web build install retries transient npm failures"
Test-RepoPattern "security" "scripts/security/secret-scan.mjs" "Cloudflare API token" "secret scan catches Cloudflare API tokens"
Test-RepoPattern "security" "scripts/security/secret-scan.mjs" "Mapbox secret token" "secret scan catches Mapbox secret tokens"
Test-RepoPattern "supabase" "scripts/ops/set-supabase-edge-secrets.ps1" "Refusing to read Edge secrets from inside the repository" "Edge secrets file must stay outside repo"
Test-RepoPattern "supabase-auth" "scripts/ops/set-supabase-auth-config.ps1" '/v1/projects/\$ProjectRef/config/auth' "Supabase Auth config uses Management API endpoint"
Test-RepoPattern "supabase-auth" "scripts/ops/set-supabase-auth-config.ps1" "SUPABASE_ACCESS_TOKEN" "Supabase Auth config requires local access token"
Test-RepoPattern "supabase-auth" "scripts/ops/set-supabase-auth-config.ps1" "Dry run only" "Supabase Auth config is dry-run first"
Test-RepoPattern "supabase-auth" "scripts/ops/set-supabase-auth-config.ps1" "UseLocalConfig" "Supabase Auth config can reuse committed redirect inventory"
Test-RepoPattern "supabase-auth" "scripts/ops/set-supabase-auth-config.ps1" "pass an explicit -SiteUrl" "Supabase Auth apply requires explicit target Site URL"
Test-RepoPattern "supabase-auth" "scripts/ops/set-supabase-auth-config.ps1" "Refusing to read live redirect configuration from inside the repository" "Supabase Auth redirect file must stay outside repo"
Test-RepoPattern "supabase-auth" "docs/OAUTH_AND_REDIRECTS.md" "set-supabase-auth-config.ps1" "OAuth docs reference Auth config automation"
Test-RepoPattern "supabase-auth" "package.json" "ops:supabase:auth-config" "npm script exposes Supabase Auth config automation"
Test-RepoPattern "ops" "package.json" "ops:readiness" "npm script exposes production-readiness verifier"
Test-RepoPattern "provider-live" "package.json" "ops:provider-auth:check" "npm script exposes provider auth diagnostics"
Test-RepoPattern "provider-live" "package.json" "ops:provider-auth:setup" "npm script exposes provider auth setup"
Test-RepoPattern "supabase" "package.json" "ops:supabase:deploy:staging" "npm script exposes staging Supabase deploy"
Test-RepoPattern "supabase" "package.json" "ops:supabase:deploy:production" "npm script exposes production Supabase deploy"
Test-RepoPattern "supabase" "package.json" "ops:supabase:secrets:staging" "npm script exposes staging Edge secret setter"
Test-RepoPattern "supabase" "package.json" "ops:supabase:secrets:production" "npm script exposes production Edge secret setter"
Test-RepoPattern "supabase" "package.json" "ops:supabase:verify:live" "npm script exposes live Supabase verifier"
Test-RepoPattern "supabase" "scripts/ops/deploy-supabase-backend.ps1" "SUPABASE_ACCESS_TOKEN" "shared deploy requires Supabase auth"
Test-RepoPattern "supabase" "scripts/ops/setup-local-provider-auth.ps1" "supabase@2\.108\.0" "local Supabase auth setup uses pinned npx CLI"
Test-RepoPattern "supabase" "scripts/ops/deploy-production-backend.ps1" "production" "production deploy wrapper exists"
Test-RepoPattern "supabase" "scripts/ops/deploy-supabase-backend.ps1" "VerifyLive" "shared deploy supports live verification"
Test-RepoPattern "supabase" "scripts/ops/deploy-supabase-backend.ps1" "ZOOT_PRODUCTION_SUPABASE_DB_URL" "shared deploy supports production DB URL"
Test-RepoPattern "supabase" "scripts/ops/repair-supabase-migration-history.ps1" "knownSchemaEquivalentVersions" "migration repair helper allowlists proven schema-equivalent versions"
Test-RepoPattern "supabase" "scripts/ops/repair-supabase-migration-history.ps1" "blockedPartialOrSplitVersions" "migration repair helper blocks partial or split migrations"
Test-RepoPattern "supabase" "scripts/ops/repair-supabase-migration-history.ps1" "ConfirmRepair" "migration repair helper requires explicit confirmation"
Test-RepoPattern "supabase" "scripts/ops/repair-supabase-migration-history.ps1" "PlanOnly" "migration repair helper supports credential-free planning"
Test-RepoPattern "supabase" "scripts/ops/repair-supabase-migration-history.ps1" "-PlanOnly cannot be combined with -ConfirmRepair" "migration repair planning cannot be combined with live confirmation"
Test-RepoPattern "supabase" "package.json" "ops:supabase:repair-migrations" "npm script exposes guarded migration-history repair"
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
  Add-ManualBlocker "supabase-live" "live database readiness SQL" "Run npm run ops:supabase:verify:live with SUPABASE_DB_URL or record authenticated Supabase connector SQL evidence for staging and production."
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
  $providerAuthEvidence -match 'CodeRabbit is now API-key authenticated locally' -and
  $providerAuthEvidence -match 'com.cloudflare.api.account.zone.create'
) {
  Add-Check "provider-live" "provider auth and Cloudflare attempt evidence" "pass" "docs/implementation/provider-auth-cloudflare-attempts-20260629.md records current Supabase CLI, CodeRabbit CLI, and Cloudflare zone-create evidence."
} else {
  Add-ManualBlocker "provider-live" "provider auth and Cloudflare attempt evidence" "Re-run provider auth checks and Cloudflare zone list/create attempt, then record non-secret evidence."
}
Add-ManualBlocker "supabase-live" "dashboard Auth redirects" "Requires Supabase dashboard/API access; local config is prepared but live allowlists still need verification."
Add-ManualBlocker "twilio-live" "Twilio production channels" "Requires upgraded Twilio account, phone number, WhatsApp sender, regulatory approvals, dashboard webhook assignment, and verification that current approved secrets are set in Supabase."
Add-ManualBlocker "mapbox-live" "restricted Mapbox tokens" "Requires least-privilege browser, native, and build-download tokens from Mapbox."
Add-ManualBlocker "cloudflare-live" "Cloudflare Zoot zone" "Requires a Cloudflare zone and token with the required zone-management permissions."
Add-ManualBlocker "domain-live" "production domain registration" "Requires a registered final domain before Cloudflare zone, DNS, TLS, OAuth origins, sender-domain DNS, app links, support/legal URLs, and store URLs can be completed."
Add-ManualBlocker "stores-live" "Apple/Google/EAS release credentials" "Requires developer-console records, signing credentials, privacy declarations, and legal review."
Add-ManualBlocker "phase-6-zoot-black" "Zoot Black live activation approvals" "Requires founder, operations, supplier, and legal approval plus staging/prod migration deployment before enabling zoot_black.* controls or exposing any customer flow."
Add-ManualBlocker "phase-7-payments" "Phase 7 payment and payout activation approvals" "Requires Stitch/Ozow credentials, callback dashboard configuration, signed webhook smoke tests, finance/legal approvals, payout account verification workflow, payout hold policy, and staging/prod migration deployment before enabling payment or payout controls."
Add-ManualBlocker "phase-8-native-launch" "Phase 8 development-build device verification" "Requires EAS development builds and real iOS/Android device tests for normal launch, reduced-motion static launch, urgent route bypass, and safe assistant deep links."
Add-ManualBlocker "phase-9-twilio" "Phase 9 Twilio live activation approvals" "Requires upgraded Twilio account or approved subaccount strategy, South African number, transactional Messaging Service, approved WhatsApp sender/templates, Verify Fraud Guard and geo permissions, callback assignment, rotated secrets, and signed staging smoke tests before enabling twilio.* controls."
Add-ManualBlocker "phase-10-assistant" "Phase 10 Siri and Android assistant device verification" "Requires Expo prebuild inspection, EAS development builds, and real iOS/Android assistant tests before treating Siri/App Intents or Android shortcuts as release-ready."

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
