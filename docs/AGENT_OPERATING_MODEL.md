# Zoot Agent Operating Model

Reviewed: 2026-07-02

This document defines how Zoot agents operate without granting them uncontrolled authority. Agents work from explicit source-of-truth events, use approved tools only, and respect the approval gates in `docs/AGENT_RULES.md`.

## Operating Principles

- Agents do not infer payment success, booking completion, cancellation, verification failure, contractor availability, refunds, or trust outcomes from incomplete data.
- Agents write through typed Edge Functions, audited admin actions, or explicit outbox rows. Browser clients are not the authority for sensitive state changes.
- Sensitive data, service-role keys, provider secrets, ID documents, bank details, gate codes, access notes, and raw verification evidence are never sent to public clients or chat.
- In-app notification is the primary operational channel. Email, SMS, WhatsApp, and voice are secondary channels gated by provider readiness, consent, regulatory status, and webhook-signature verification.
- Public SEO and Concierge content cannot invent client claims, guarantees, prices, partnerships, or operational coverage.

## Agent Roster

| Agent | Primary job | Source triggers | Tools used | Approval gate |
| --- | --- | --- | --- | --- |
| Codex Engineering Agent | Implement, verify, and document repo changes | User tasks, PR feedback, CI failures, readiness blockers | Git, GitHub CLI/connector, CodeRabbit CLI, Supabase MCP read-only, Supabase CLI when locally authenticated, shell tests, Playwright/Chrome, Expo/EAS CLI | Required for production deploys, auth/RLS/payment/booking changes, public legal claims |
| Hermes Operations Orchestrator | Route internal IF-THEN automations | `integration_outbox`, `booking_status_events`, `admin_review_queue`, operational controls | `ops-workflow`, Supabase Edge Functions, Airtable ops queue, Brevo queue, Twilio urgent queue, payment-provider queue | Required for trust, refund, payout, bulk outreach, bans, manual review actions |
| Zoot Concierge Agent | Answer Zoot support and sales questions safely | Guest/signed-in support messages, reported answers | `support-respond`, bundled Zoot knowledge, OpenAI fallback only when enabled, `report-concierge-answer`, support tickets | Human escalation for payment, refund, legal, safety, complaint, admin, account-risk cases |
| Scheduling & Allocation Agent | Manage booking lifecycle and contractor handoff | Booking created/paid/assigned, replacement requests, Zooter responses | `create-booking-request`, `create-booking`, `ai-match`, `get-zooter-job-cards`, `request-replacement`, in-app/expo push outbox | Required for manual reassignment, replacement exceptions, operational overrides |
| Trust & Safety Agent | Protect clients, Zooters, and household access | Zooter application submitted, trust incident, sensitive-access window, low ratings | `submit-zooter-application`, `approve-zooter`, `admin-reject-zooter`, `get-sensitive-access`, `revoke-sensitive-access`, MIE/KIE queue, admin review queue | Required for verification decisions, account bans, sensitive evidence review |
| Finance Operations Agent | Keep payments, invoices, ZootCred, and payouts auditable | Payment callback, invoice request, refund/payout review, ZootCred debit | `confirm-payment`, `admin-confirm-payment`, `generate-booking-invoice`, `resend-booking-invoice`, Stitch/Ozow functions, `redeem-zootcred`, admin audit log | Required for refunds, payout changes, manual payment confirmation |
| Retention & Loyalty Agent | Operate Care+, reminders, ZootCred, and renewal nudges | Care+ lifecycle, subscription state, ledger entries, last booking date | `activate-care-plus`, `care-plus-membership`, ZootCred ledger hooks, in-app notifications, Brevo queue | Required for billing changes, subscription exceptions, promotional sends |
| Marketing & SEO Agent | Create review-ready local SEO content | Daily SEO queue command, approved editorial prompts, WordPress draft workflow | `npm run seo:daily`, content queue files, WordPress editorial CMS when provisioned, Search Console/Semrush data when available | Human editorial approval before publish; no fake claims or unreviewed AI auto-publish |
| Notification Delivery Agent | Fan out safe operational notifications | Outbox rows, booking state changes, sensitive-access availability, support follow-up | `integration_outbox`, Expo push, in-app notifications, Brevo, Twilio SMS/WhatsApp/voice after activation | Required for WhatsApp campaigns, marketing messages, or non-urgent routine external chat |
| Release & Observability Agent | Prove release health and regression safety | GitHub Actions, EAS builds, Supabase advisors, Sentry/PostHog signals | GitHub Actions, EAS CLI, Supabase advisors/MCP, `npm run ops:readiness`, Sentry, PostHog, k6 when installed | Required before production launch, store release, or rollback decisions |

## How Agents Start Working

Agents start from explicit triggers, not background guessing:

1. A user action, webhook, scheduler, or admin action writes a known event to a source table.
2. The responsible Edge Function or worker validates auth, RLS/service-role boundary, operational-control flags, rate limits, and idempotency.
3. The agent creates an outbox row, admin review item, notification, or typed state transition.
4. Provider delivery happens only after provider credentials, dashboard callbacks, and signed webhook checks are verified.
5. Human review is required whenever the action affects money, trust, legal posture, sensitive data, public claims, or account status.

## Active Automation Surfaces

- Booking lifecycle and status events: booking state machine, `booking_status_events`, `ops-workflow`, and booking Edge Functions.
- Sensitive-access availability and revocation: `can_access_sensitive_data`, sensitive-access logs, notification scheduler, and `revoke-sensitive-access`.
- Concierge support: `support-respond`, `report-concierge-answer`, support ticket escalation, and deterministic fallback.
- Booking chat: `send-booking-message`, `mark-booking-message-read`, `report-booking-message`, and encrypted message envelope checks.
- Admin actions: typed audited Edge Functions and `admin_audit_log`.
- Twilio readiness: Verify, operational SMS, urgent WhatsApp, voice callbacks, masked-call queue, and signature/idempotency guards.
- SEO: `npm run seo:daily` generates review-ready drafts; publishing remains review-gated.
- Release readiness: `npm run ops:readiness`, live Supabase verification scripts, GitHub workflows, EAS preview builds, CodeRabbit review.

## Current Tool Status

- Supabase MCP: configured for project `fxmxyabdjqviqbcxmvlp` with `read_only=true` and OAuth authentication.
- Supabase Agent Skills: installed locally with portable project files in `skills/` and `skills-lock.json`.
- GitHub CLI: authenticated.
- CodeRabbit CLI: installed and API-key authenticated.
- Supabase CLI: installed, but separate CLI auth still requires a local `SUPABASE_ACCESS_TOKEN` or secure login flow before live auth-config or migration repair commands can run.

## Recommended Next Agent Work

1. Use Supabase MCP for read-only schema/advisor inspection before touching migrations.
2. Use Supabase CLI only from a local shell with rotated secrets loaded outside the repo and outside chat.
3. Run `npm run ops:readiness -IncludeExternal -RequireLive` after the domain, Supabase Auth redirects, provider secrets, and device credentials exist.
4. Install `k6` and record staging load evidence before claiming 10,000-request readiness.
5. Keep WordPress SEO as an editorial CMS only; the app runtime remains React/Vite, Expo, Supabase, and Edge Functions.
