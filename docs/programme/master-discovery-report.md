# Zoot Master AI Operating Programme Discovery Report

Reviewed: 2026-07-10
Phase: 1 - Discovery and decision baseline
Repository discovery baseline: `origin/main` at `13d9b30`
Reconciled baseline: `origin/main` at `1d41c28` after Level 3 security PR #24 merged
Working branch: `codex/master-ai-os-phase1-discovery-20260710`
Status: complete for discovery; no implementation authority is implied

## Executive Conclusion

Zoot already has substantial foundations for the requested programme: a React/Vite web product, a separate Expo application, a Supabase action layer, governance tables, operational controls, Concierge safeguards, migration-drift checks, native assistant source, release gates, Sentry/PostHog wiring, and a canonical-`main` policy.

The next step should not be another broad implementation prompt. The system first needs one repository-owned policy hierarchy and one lean agent model. Current documentation conflicts on the mobile platform (`Capacitor` versus `Expo`), orchestrator (`Hermes` versus `Codex`), agent count, production domain assumptions, and what "Level 3" security means. AI cost controls, company-wide evaluation sets, automated end-to-end UI tests, and a vulnerability-disclosure intake do not yet exist as complete systems.

The recommended target is:

```text
Founders and accountable human owners
  -> Codex Executive Harness
  -> Evidence and Control Plane (not an agent)
  -> Seven specialist agents
  -> Versioned skills and typed tools
  -> Human approval gates for consequential actions
```

This report is the required factual baseline before the requested master prompts or bug-bounty user interface are created.

## Evidence Reviewed

- Repository code, migrations, Edge Functions, tests, workflows, release documents, and blocker ledger.
- Current GitHub branch, ruleset, pull-request, and check state.
- Current EAS build inventory and mobile configuration.
- Existing company-wide Markdown pack outside the repository.
- [Apple App Intents updates](https://developer.apple.com/documentation/Updates/AppIntents), [AppIntent](https://developer.apple.com/documentation/AppIntents/AppIntent), and [App Shortcuts guidance](https://developer.apple.com/design/human-interface-guidelines/app-shortcuts).
- [Expo Continuous Native Generation](https://docs.expo.dev/workflow/continuous-native-generation/) and [Expo config plugins](https://docs.expo.dev/config-plugins/introduction/).
- [OWASP ASVS 5.0.0](https://owasp.org/www-project-application-security-verification-standard/).
- [OWASP MASVS](https://mas.owasp.org/MASVS/) and MASTG 2.0 release guidance.

No production deploy, live provider mutation, credential rotation, customer communication, payment, refund, payout, booking mutation, or migration-history repair was performed.

## 1. Current Architecture

| Area | Current implementation | Readiness finding |
| --- | --- | --- |
| Website and browser app | React 18, Vite 8, TypeScript, Tailwind, shadcn/ui, route-level lazy loading | Strong implementation base; live provider and domain evidence remains incomplete |
| Mobile app | `mobile/`, Expo SDK 56, Expo Router, React Native 0.85, TypeScript, SecureStore, Expo Notifications, Mapbox, Sentry, PostHog | Correct strategic mobile path; custom native modules mean full testing requires development/preview builds, not Expo Go |
| Backend | Supabase Auth, Postgres, RLS, Storage, Edge Functions, Realtime where used | Sensitive actions generally cross an Edge Function boundary; live migration metadata and Auth configuration remain blocked |
| Operational control plane | `operational_controls`, `approval_requests`, `experiment_registry`, `agent_action_contracts`, `analytics_event_contracts`, outbox and admin audit tables | Reusable foundation exists; AI budgets, run accounting, typed handoffs, and promotion/demotion records are incomplete |
| Concierge | Grounded deterministic knowledge, optional server-side OpenAI path, redaction, report path, disabled-by-default account tools, structured handoff foundation | Not production ready until live migrations/functions, role/RLS smoke tests, knowledge approval, privacy verification, and human handoff tests pass |
| Native assistants | Swift App Intents source, Android shortcuts, Expo config plugin, allowlisted app routes | Compile foundation exists; current intents do not execute the constructed deep-link URLs and still use deprecated `openAppWhenRun` patterns |
| Observability | Sentry web/mobile packages and privacy docs; PostHog web/mobile SDKs and event contracts | Instrumentation base exists; live DSN/project configuration, PII scrubbing readback, alert ownership, and retention approval remain |
| CI/CD | Web build, tests, secret/front-end write guards, native Swift parse check, production-readiness and migration-drift checks | Checks are useful, but `main` is not protected and the repository ruleset is disabled |
| Source control | Policy says one long-lived `main`; short-lived PR branches | Correct policy, not enforced in GitHub settings |

Current offline readiness evidence on `main`: 359 pass, 0 fail, 11 manual, 1 skipped. The count proves repository checks are healthy; it does not prove the manual production controls.

## 2. Existing Reusable Systems

The next phases should extend these systems instead of creating parallel replacements:

1. `docs/AGENT_OPERATING_MODEL.md` and `docs/AGENT_RULES.md` for Codex harness boundaries.
2. `supabase/migrations/20260627090000_phase1_governance_controls.sql` for operational controls, approvals, experiments, agent contracts, and analytics contracts.
3. `integration_outbox`, `admin_review_queue`, and `admin_audit_log` for asynchronous work, human review, and evidence.
4. `docs/concierge`, `support-respond`, `report-concierge-answer`, and `create-concierge-handoff` for safe customer assistance.
5. `supabase/functions/_shared/governance-utils.ts` for server-side control checks.
6. `supabase/migration-drift-allowlist.json`, drift checker, guarded repair helper, and readiness workflow for migration metadata safety.
7. `mobile/plugins/withZootAssistantIntents.cjs` and `native/ios/ZootLiveActivities/ZootAppIntents.swift` for Expo CNG assistant integration.
8. `scripts/security`, build-artifact scanning, CSP/static headers, and the merged Level 3 hardening gate from PR #24 for release security.
9. `/admin/ops` for outbox, dead-letter, and agent-decision visibility.
10. Existing article metadata, notification-personalisation, Sentry, PostHog, and EAS environment contracts.

## 3. Duplicate or Conflicting Systems

| Conflict | Current evidence | Required resolution |
| --- | --- | --- |
| Hermes versus Codex | External company pack names Hermes; current repository names Codex as harness | Codex becomes the only orchestrator name. Hermes references are migrated or explicitly deprecated. |
| Capacitor versus Expo | External stack docs name Capacitor/PWA; current implementation and release plan are Expo-only | Expo and CNG become authoritative. Capacitor remains historical web-wrapper evidence only. |
| Agent roster size | Attached programme specifies one orchestrator plus seven specialists; current operating model lists multiple product agents, delivery agents, and release agents | Keep seven accountable specialist agents. Model Concierge, notification delivery, release verification, and SEO generation as versioned skills/surfaces owned by those agents. |
| Policy locations | Company policy pack sits outside the repository; only one agent source-of-truth policy exists inside the repo and it is draft | Move approved policy truth into repository-owned `docs/source-of-truth`; external packs become inputs, not runtime authority. |
| Level 3 terminology | Merged PR #24 defines a company launch gate; ASVS also has assurance levels | Name them separately: `Zoot L3 operational gate` and `OWASP ASVS v5.0.0 verification target`. Do not imply certification. |
| Siri route intent | Swift builds safe URLs but `perform()` never returns or invokes them; `openAppWhenRun` is deprecated in current Apple documentation | Rework against the installed public SDK using `supportedModes`, explicit safe URL opening/continuation, tests, and availability guards. |
| Migration truth | Local files, connector-generated live timestamps, and production branch metadata disagree | Preserve the allowlist and guarded repair flow, require saved remote evidence in controlled CI/ops, and block release on unexplained drift. |
| Branch truth | Docs define protected `main`; GitHub reports no branch protection and a disabled ruleset | Enable an enforced ruleset with PR review and required checks before treating the one-main policy as real. |

## 4. Current Policy Conflicts

1. The external company pack is stale and contains mojibake, Hermes ownership, Capacitor mobile guidance, and provider assumptions that conflict with the current repository.
2. Care+ policy truth is still draft, while customer-facing and Concierge surfaces exist.
3. Concierge knowledge has 14 approved files and four draft high-risk/commercial files; draft Care+, cancellation, Booking Cover, and Zoot Black content must continue to escalate.
4. The production domain is referenced as `zoothome.co.za`, but the blocker ledger says no final domain is registered.
5. Current agent contracts mention Hermes in a database comment even though repository governance says Codex owns orchestration.
6. The existing App Intent implementation accepts a free-form suburb and date draft, while the programme also says sensitive identifiers must never enter routes. The allowed parameter contract needs one explicit, tested definition.
7. Existing provider and store documents describe planned capabilities that are not live provider evidence.

## 5. Security Risks

### Observed

- `main` is not protected; the only repository ruleset is disabled.
- Supabase production branch metadata still reports `MIGRATIONS_FAILED`; the safe repair remains unexecuted.
- Supabase Auth redirect allowlists and leaked-password posture remain unresolved.
- High-risk provider, domain, store, and device controls are manual.
- The company-wide Level 3 gate from PR #24 is now part of `main`, but it remains unsatisfied until the required live evidence is attached.
- Phase 3 now implements the vulnerability-disclosure page and restricted intake in the repository. Public activation, a verified security contact, legal scope, security reviewer ownership, staging proof, and generated `security.txt` remain blocked.
- There is no automated browser end-to-end suite and no device-level Maestro/Detox equivalent.
- Current mobile preview artifacts were built from July 1 commits, not current `main`.

### Required assurance targets

- Pin web/API requirements to OWASP ASVS v5.0.0. Use Level 2 as the whole-product baseline and require applicable Level 3 controls for household access, identity, admin, payments, payouts, trust/safety, and agent tool execution.
- Pin mobile requirements to MASVS 2.1 and MASTG 2.0 testing profiles. MASVS no longer uses the old L1/L2/R levels, so do not invent a "MASVS Level 3" claim.
- Add threat-model, negative-authorisation, RLS, prompt-injection, webhook replay, deep-link, artifact-secret, dependency, and manual penetration-test evidence.
- Keep the bug-bounty surface a vulnerability disclosure programme until legal, finance, scope, and reward terms are approved.

## 6. Data Authority Boundaries

| Truth type | Authority | Agent use |
| --- | --- | --- |
| Policy truth | Approved version-controlled Markdown in `docs/source-of-truth` | Read only; agents propose changes through approval records |
| Operational truth | Supabase tables protected by RLS and typed Edge Functions | Read/write only through role-scoped tools and action contracts |
| Provider truth | Signed provider events and verified provider APIs | Never inferred from frontend state or model output |
| Analytics truth | PostHog privacy-safe events and experiments | Behavioural analysis only; no booking, payment, role, or entitlement authority |
| Reliability truth | Sentry errors, traces, releases, and alerts | Technical health only; no business-state authority |
| Human workflow truth | Airtable/admin queues for review and coordination | Queue state only; never payment, booking, access, or entitlement truth |
| Code truth | Protected GitHub `main` | Only reviewed merges become product source |
| Migration truth | Immutable local migrations plus verified remote history evidence | Repairs require allowlist, dry run, approval, readback, and audit evidence |

No agent may combine evidence from one authority into an action owned by another authority without a typed handoff and approval gate.

## 7. Missing Tests and Evidence

1. Browser end-to-end tests for public navigation, auth, booking, Care+, Concierge, legal pages, bug reporting, and role guards.
2. Real Android APK install and smoke test; `adb` is installed but no authorised device is connected.
3. Physical iPhone build, install, App Intent, notification, widget, Live Activity, SecureStore, Mapbox, and deep-link tests.
4. Current-main EAS builds. Existing artifacts predate the latest merged changes.
5. Agent evaluation sets for missing data, stale data, policy conflict, prompt injection, cross-role requests, provider outages, tool timeouts, and high-cost loops.
6. Token/cost circuit-breaker tests and durable run accounting.
7. Live Concierge RLS, role, handoff, redaction, analytics, and fallback smoke tests.
8. Live remote migration evidence in a controlled readiness job.
9. Vulnerability-report form validation, abuse/rate-limit tests, attachment malware/type/size controls, and restricted reviewer access.
10. Independent staging penetration testing. Automated scans are not a penetration test.

## 8. Existing AI Cost Controls

Current positive controls:

- `support-respond` defaults to `gpt-4.1-mini`, uses `store: false`, caps output at 260 tokens, truncates the returned answer, redacts input, and falls back safely on timeout or provider failure.
- Model use is controlled by operational controls and can remain disabled.
- The Concierge knowledge boundary and human escalation policy are documented.

Missing company-wide controls:

- No `docs/agents/ai-cost-governance.md`.
- No per-agent model tier, input/output token, context-document, tool-call, retry, runtime, daily, or monthly budget contract.
- No durable agent-run token/cost ledger tied to a business outcome.
- No handoff-loop or tool-call-loop detector.
- No automatic model downgrade or deterministic fallback policy across all agents.
- No rule preventing an agent from requesting a larger budget through its own active tool path.

## 9. Existing Source-of-Truth Documents

Repository-owned sources currently include:

- `docs/product/locked-commercial-facts.md`.
- `docs/agents/source-of-truth/care-plus-policy.md` (draft).
- `docs/AGENT_OPERATING_MODEL.md` and `docs/AGENT_RULES.md`.
- `docs/concierge/knowledge/*` with approved/draft frontmatter.
- `docs/security/*`, `docs/release/*`, and `blocker.md`.
- `src/lib/booking-state-machine.ts` and the matching Edge Function state machine.
- Supabase migrations and migration drift manifest.

The required `docs/source-of-truth` policy set from the programme does not yet exist. The external company pack is useful migration input but cannot remain the authoritative source because it is outside `main` and conflicts with current architecture.

## 10. Recommendations Before Creating the Master Prompts

1. Approve Codex Executive Harness plus seven specialists as the only agent roster. Convert other named agents into owned skills or product surfaces.
2. Establish `docs/source-of-truth` first, with machine-validated frontmatter, one owner per policy, review dates, supersession, and approved-only consumption.
3. Pin every future prompt to exact repository files, schemas, owners, tools, budgets, stop conditions, evidence requirements, and output schemas.
4. Separate recommendations from actions. A model recommendation must never become a state mutation without a typed tool, current evidence, authorization, idempotency, and approval.
5. Add an AI run ledger and circuit breakers before scheduling autonomous loops.
6. Design loops as observe -> decide -> propose/act -> verify -> learn, with promotion based on measured quality and rollback, never self-modifying prompts.
7. Treat Siri as a safe handoff into authenticated app review. Use current public App Intents APIs and schemas only; never promise an undocumented "Siri AI" capability.
8. Implement a vulnerability disclosure programme before promising a paid bug bounty. Use a restricted server-side intake and legal-reviewed safe-harbour text.
9. Enforce the one-main policy in GitHub, not only in Markdown. Require PRs, green web/native/readiness checks, CodeRabbit, and no force pushes.
10. Make remote migration-history evidence a release input. Never use broad `db push` or direct `supabase_migrations` edits to clear status.
11. Add Playwright browser workflows and Maestro/device workflows after the prompt and policy contracts are approved.
12. Rebuild Android and iOS artifacts from current `main` after implementation; do not certify July 1 artifacts as current-product evidence.

## 11. Recommended Implementation Sequence

| Phase | Deliverable | Exit gate |
| --- | --- | --- |
| 1 | This discovery report and unresolved blocker inventory | Founder accepts architecture decisions or records amendments |
| 2 | Repository source-of-truth hierarchy and separate master prompt pack | Prompt schema validation, no policy conflicts, owners assigned |
| 3 | Codex harness, seven specialist contracts, tool registry, AI cost governance, typed handoffs | Agent evals and circuit breakers pass; no self-expanding authority |
| 4 | Daily/weekly/monthly improvement loops and founder-intervention metrics | Each loop has owner, budget, rollback, approval, and measured promotion rule |
| 5 | iOS 27 App Intents and Android assistant hardening | Disposable Expo prebuild, compile, route, auth, and physical-device tests pass |
| 6 | ASVS/MASVS hardening and vulnerability-disclosure experience | Security tests pass; legal-approved scope/intake; no reward promise |
| 7 | Company-wide bug review and patch programme | Unit/integration/RLS/webhook/agent suites pass; critical findings resolved |
| 8 | Codex browser and mobile interaction QA | Playwright plus real-device smoke evidence; logical and visual defects triaged |
| 9 | Fresh EAS preview artifacts and installation handoff | Current-main Android APK and physical-iOS/TestFlight build installed and smoke-tested |
| 10 | Production release audit | All live/manual gates passed or explicitly risk-accepted by accountable owners |

## 12. Founder and Owner Decisions Required

1. Approve Codex as the sole harness name and seven-agent roster.
2. Approve which current external policies may be migrated into `docs/source-of-truth` and who owns each.
3. Approve per-agent daily/monthly budgets and the Class A-D model-routing policy.
4. Approve GitHub branch ruleset enforcement and required reviewers/checks.
5. Approve ASVS v5.0.0 baseline/critical-surface target and independent penetration-test budget.
6. Approve vulnerability-disclosure scope, security contact, response ownership, legal safe-harbour wording, and whether recognition is non-financial.
7. Approve iOS minimum target, Apple Team/app records, and physical-device provisioning.
8. Approve retention periods for agent runs, security reports, audit events, analytics, and attachments.
9. Approve the final domain before domain-bound security and store work.
10. Approve whether current preview artifacts may be shared outside the founding/test team.

## 13. Items Deferred by Design

- Paid bug-bounty rewards or guaranteed payment.
- Production deployment or provider-dashboard mutation.
- Production migration-history repair without local rotated credentials, dry-run evidence, and explicit confirmation.
- Autonomous payments, refunds, payouts, claims, booking completion, contractor approval, account suspension, pricing, budget changes, or production deploys.
- Automated publishing or external communications.
- App Store/Play submission until legal, privacy, signing, domain, and real-device gates pass.
- Unrestricted internet access or self-rewriting prompts for agents.

## Mobile Testability Snapshot

### Android

- Finished internal preview APK build: `114d0c10-c754-4426-9a90-9fdfeadb8a06`.
- EAS build page: `https://expo.dev/accounts/don-pacho777/projects/zoot/builds/114d0c10-c754-4426-9a90-9fdfeadb8a06`.
- The EAS artifact expires on 2026-07-15; a local APK is recorded at `outputs/zoot-preview-android-v5.apk`.
- No authorised Android device is currently connected, so installation and smoke evidence are still missing.
- This build predates current `main`; create a fresh build in Phase 9.

### iOS

- Finished simulator-only build: `d4de44a1-d827-4045-b1a6-e427066fcd64`.
- EAS build page: `https://expo.dev/accounts/don-pacho777/projects/zoot/builds/d4de44a1-d827-4045-b1a6-e427066fcd64`.
- The artifact is a simulator archive and cannot be installed on a physical iPhone.
- A physical-device preview requires Apple Developer membership, device provisioning/internal-distribution credentials or TestFlight, and a fresh EAS build.

Expo Go is not a complete Zoot test path because Mapbox and Zoot's native App Intents/widgets require custom native code compiled into a development or preview client.

## Phase 1 Exit Gate

Phase 1 discovery is complete when this report is reviewed and the decisions in Section 12 are accepted or amended. The next phase may create the requested separate master prompts and source-of-truth policy templates. It must not silently implement production changes.
