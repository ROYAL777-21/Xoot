# Zoot Production Command Center

Reviewed: 2026-07-09

This document is the navigation layer for completing Zoot. It does not replace the detailed runbooks it links to.

## Current Next Action

Run the credential-free Supabase metadata drift guard, then load the rotated staging database credential locally, run the guarded staging migration-history dry-run, review its captured before-file, and only then run the allowlisted staging repair. Do not repair production until the staging result is verified.

```powershell
npm run ops:supabase:drift-check -- -Environment staging
npm run ops:supabase:repair-migrations -- -Environment staging -ProjectRef fxmxyabdjqviqbcxmvlp -PromptDatabasePassword
```

The command is a dry-run unless `-ConfirmRepair` is added. Never paste the password into chat, commit it, or place it in a public environment variable.

## Sources Of Truth

| Area | Authoritative source |
| --- | --- |
| Product code and configuration | GitHub `main` |
| Database shape and policies | Versioned files in `supabase/migrations` |
| Edge Function code | `supabase/functions` on GitHub `main` |
| Unresolved work | `blocker.md` |
| Completion evidence | `docs/PRODUCTION_COMPLETION_AUDIT.md` |
| Release decisions | `docs/release/integration-decision-log.md` |
| Credentials | Approved password manager and provider secret stores, never Git |
| Live provider state | Provider dashboard/API, recorded as evidence in the relevant runbook |

## Branch Policy

1. Create a short-lived branch for a focused change.
2. Require CI and review.
3. Merge into `main`.
4. Delete the feature branch.
5. Deploy only through an explicit approved release action.

Do not maintain parallel long-lived product branches. Staging and production differences belong in environment configuration, migrations, feature flags, and secret stores, not separate code histories.

## Completion Framework

| Gate | Required evidence | Current status source |
| --- | --- | --- |
| 1. Source convergence | Complete: PR #7 merged, PR #8 closed, temporary branches deleted, and merged `main` checks green | `docs/release/branch-and-pr-map.md` |
| 2. Backend convergence | Guarded migration repair complete; new migrations/functions deployed to staging; schema smoke tests pass | `docs/implementation/supabase-migration-status-repair-20260630.md` |
| 3. Identity | Auth redirects, OAuth callbacks, password policy, admin MFA, account deletion verified | `docs/OAUTH_AND_REDIRECTS.md` |
| 4. Security | RLS, secret scans, abuse controls, threat models, advisor review, incident runbooks pass | `docs/release/security-release-gate.md` |
| 5. Product workflows | Booking, payment pending/confirmed, chat, Care+, Concierge handoff and Zooter access tested in staging | `docs/STAGING_PRODUCTION_CHECKLIST.md` |
| 6. Reliability | k6 staging evidence, outbox retries, dead letters, Sentry and PostHog privacy checks | `docs/PRODUCTION_COMPLETION_AUDIT.md` |
| 7. Device proof | Android and iOS builds installed on real devices; auth, push, links, maps and assistant routes pass | `docs/EXPO_MOBILE_PRODUCTION_READINESS.md` |
| 8. Provider and store proof | Domain, Cloudflare, Twilio, Mapbox, payment, email, Apple and Google records verified | `docs/release/manual-configuration-checklist.md` |
| 9. Launch approval | Legal, finance, operations, trust and founder approvals recorded; rollback rehearsal complete | `docs/release/deployment-readiness.md` |

## Required Founder Inputs

- Register the final production domain and provide registrar/DNS access.
- Load a rotated Supabase access token and staging/production database credentials into the approved local secret store.
- Supply or approve Apple Developer, App Store Connect, and Google Play organization access.
- Supply final legal entity, VAT, Information Officer, privacy, refund, Care+, Zooter and Booking Cover decisions.
- Approve provider accounts and production credentials for payment, communications, email, maps, monitoring, hosting and AI.
- Provide real staging test users for customer, Zooter, support and admin roles.
- Approve the production launch window and rollback owner.

## Immediate Device Test

- Android: install `outputs/zoot-preview-android-v5.apk`; Expo Go is not compatible with Zoot's custom Mapbox and assistant native modules.
- Iterative Android development: install an EAS `development` build, then run `npm run mobile:start:dev-client`.
- Physical iOS: provide Apple Developer team access and register the device or use TestFlight after the App Store Connect record exists.

## Release Rule

No gate is complete from documentation alone. Each gate needs dated, reproducible evidence from CI, staging, a real device, a provider dashboard/API, or an approved reviewer.
