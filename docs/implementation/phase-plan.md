# Xoot Master Phase Plan

Reviewed: 2026-06-24
Source: Xoot Master Phased Implementation Program

## Execution Rule

Phases run in strict order. Each phase requires tests, documentation, a rollback plan and founder approval before the next phase begins.

No phase may:

- deploy production;
- send real communications;
- make real charges or payouts;
- activate insurance;
- submit App Store, TestFlight or Play releases;
- alter provider configuration without the relevant approval gate;
- use mock production data.

## Phase 0 - Discovery, Baseline And Governance

Status: ready for founder review.

Deliverables:

- master discovery report;
- phase plan;
- decision log;
- threat-model index;
- locked commercial facts.

Exit gate:

- choose schema source of truth;
- resolve Expo versus obsolete Capacitor documentation;
- approve the Phase 1 security/governance scope.

## Phase 1 - Security, Operating Controls And Core Governance

Primary moat: trust density and operational resilience.

Required implementation:

1. Central database-backed feature flags and kill switches.
2. Audited approval request model.
3. Experiment registry and agent action contracts.
4. Idempotency keys and provider event records.
5. Rate-limit helper and Turnstile verification boundary.
6. Sentry PII scrubbing and PostHog privacy event contract.
7. Production/staging migration reconciliation.
8. Server-only writes for payments, subscriptions, XootCred and outbox.
9. Kill switches listed by the master program.
10. Provider configuration manifests that remain inactive until approval.

Highest-priority defects:

- production booking enum divergence;
- production owner `ALL` policies on financial and operational tables;
- local code using columns missing from production;
- booking price conflict with locked commercial facts;
- duplicate Care+ activation paths;
- no feature-flag or kill-switch model;
- no provider webhook idempotency model.

Verification:

- clean staging database reset;
- RLS role matrix;
- migration diff and rollback test;
- no frontend critical writes;
- security and performance advisors;
- web/mobile/Edge checks.

## Phase 2 - Booking-Scoped Chat

Build on the existing `messages` table and booking participant model.

Do not add a second chat system.

Required:

- booking-scoped participant authorization;
- safe encrypted message envelope;
- moderation and report path;
- typing/read receipt model where justified;
- anti-poaching and sensitive-data filters;
- chat kill switch and rate limits.

## Phase 3 - Care+ Household Operating Layer

Consolidate existing Care+ functions and tables first.

Required:

- real Home Memory;
- favourite and backup Xooter rules;
- household dashboard and ready modes;
- household circle;
- service recovery;
- evidence-based lifecycle triggers;
- Host+ data groundwork only.

No specific Xooter guarantee.

## Phase 4 - Completed Booking Invoices

Extend the existing integration outbox.

Required:

- immutable invoice snapshot;
- idempotent invoice worker;
- private PDF bucket;
- owner-only access;
- Brevo delivery;
- resend of the original PDF;
- legal/VAT configuration gate.

## Phase 5 - Xoot Concierge

Consolidate the current deterministic and OpenAI paths.

Required:

- versioned knowledge base;
- OpenAI feature flag default off;
- anonymous rate limits and Turnstile;
- redaction before model use;
- high-risk human escalation;
- report/feedback path;
- no booking, payment, refund or claims tools.

## Phase 6 - Xoot Black

Feature flags default off.

Foundation status: implemented locally as `20260630003602_phase6_zoot_black_foundation.sql`; live deployment and activation remain blocked by approval gates.

Required:

- Elite-only eligibility;
- private equipment evidence;
- training and status history;
- selected-area pilot gates;
- explicit line item;
- safe service completion certificate.

Requires founder, operations, supplier and legal approval.

## Phase 7 - Payments And Payout Verification

Foundation status: implemented locally as `20260630005420_phase7_payments_payouts_foundation.sql`; live payment and payout activation remain blocked by provider, finance and legal gates.

Required:

- provider-hosted customer payment flow;
- exact Stitch/Ozow signature verification;
- idempotency and reconciliation;
- safe payment method references only;
- verified Xooter payout account;
- step-up verification for payout changes;
- configurable payout hold.

Requires finance, legal and provider approval.

## Phase 8 - Native Launch Experience

Expo-only path.

Foundation status: implemented locally in `/mobile`; development-build device verification remains required before release use.

Required:

- local bundled native-rendered experience;
- static, reduced-motion and low-power fallbacks;
- urgent-route bypass;
- no WebView or remote 3D asset;
- development-build verification.

## Phase 9 - Twilio Verify And Masked Voice

Provider activation belongs here, not Phase 0.

Foundation status: implemented locally as `20260630102715_phase9_twilio_verify_masked_voice.sql`; live activation remains blocked by Twilio account/channel approvals, rotated secrets, callback assignments and signed staging smoke tests.

Current readiness work:

- webhook functions exist;
- signature validation exists;
- Twilio account resources were inventoried.

Required:

- account upgrade or approved subaccount strategy;
- operational Messaging Service, not marketing;
- South African number and approved regulatory bundle;
- approved WhatsApp sender and templates for the locked urgent use cases only;
- Verify rate limits and abuse controls;
- masked-call eligibility window;
- no recording, transcription or arbitrary dialing;
- Twilio resource callbacks assigned only after staging tests.

## Phase 10 - Siri And App Intents

Use existing safe App Intent source.

Foundation status: implemented locally through the Expo config plugin `mobile/plugins/withXootAssistantIntents.cjs`; development-build device verification remains required before release use.

Required:

- integrate through an Expo config plugin or approved native target;
- allowlisted deep links;
- route validation;
- no IDs, addresses, payment state or sensitive data in speech/deep links;
- physical-device tests.

Siri opens and prefills. It never completes a booking or payment.

## Phase 11 - Codex Harness Governance And Dashboards

Required:

- agent contracts;
- one metric owner;
- approval gates;
- experiment and skill registries;
- daily, weekly, monthly and quarterly review formats;
- audit trail;
- no self-approval or autonomous consequential action.

## Cross-Cutting Release Track

These items remain release gates, not reasons to skip phases:

### Supabase Auth

- production and staging Site URLs;
- exact redirect allowlists;
- Google and Apple provider setup;
- admin MFA;
- leaked-password protection or documented compensating controls.

### Mapbox

- URL-restricted web token;
- separate native token;
- private downloads token;
- service-area validation server boundary.

### Cloudflare

- add and activate domain zone;
- proxy DNS;
- TLS;
- managed WAF;
- rate limiting;
- Turnstile;
- origin restriction;
- security event review.

### Apple And Google

- store records;
- signing credentials;
- app links;
- privacy and data safety declarations;
- reviewer accounts;
- legal review;
- TestFlight/internal testing only after the appropriate phase gate.

### GitHub And CodeRabbit

- authenticate GitHub CLI;
- commit the approved scope;
- push current branch;
- open a draft PR;
- run CI;
- run CodeRabbit through WSL or GitHub integration;
- address review comments before merge.

## Rollback Principle

Every phase must identify:

- database down migration or forward-fix strategy;
- Edge Function previous version;
- feature flag or kill switch;
- provider resource disable path;
- deployment rollback;
- data repair path;
- owner and decision deadline.
