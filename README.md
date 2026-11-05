# Xoot — premium home care, handled

Xoot is a South African on-demand home-services marketplace. **Customers** book cleaning and
home-care visits; **Xooters** — vetted independent contractors — do the work. The product is
trust-first: no Xooter goes live until admin review has cleared their ID, selfie, proof of
address, banking details and references, and money only moves through verified, server-side
payment flows.

- **Live surface:** [xoot.co.za](https://xoot.co.za) (see [`docs/release/domain-setup.md`](docs/release/domain-setup.md) for the current DNS state)
- **Launch areas:** Sandton, Bryanston, Rosebank, Midrand, Fourways, Waterfall, Hyde Park, Parkhurst, Melville, Bedfordview, Dainfern, Braamfontein

---

## What's in this repository

| Path | What it is |
| --- | --- |
| `src/` | The web app — Vite + React 18 + TypeScript + Tailwind + shadcn/ui. Customer site, client dashboard (`/app/*`), Xooter portal (`/xooter/*`), admin ops (`/admin/*`), legal pages, AI concierge UI. |
| `supabase/` | The backend — Postgres migrations (RLS-hardened) and ~40 Deno Edge Functions: bookings, payments, KYC, chat (E2EE), SOS alerts, payouts, concierge handoff, Twilio voice/SMS/WhatsApp webhooks. |
| `mobile/` | The Expo (React Native) app — the production iOS/Android target. |
| `native/` | iOS Live Activities / widgets (Swift) and Android home-screen widgets (Java) that complement the Expo shell. |
| `docs/` | The operating manual: security programme and threat models, release runbooks, product context, marketing system, implementation journal. Start with [`docs/PROJECT_CONTEXT.md`](docs/PROJECT_CONTEXT.md). |
| `scripts/` | Ops and CI automation: deploy, drift checks, secret scanning, SEO generation, k6 load tests. |
| `content/` | SEO/blog content pipeline. |

## The stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query,
  react-router. PWA-ready with offline splash choreography.
- **Backend:** Supabase — Postgres with row-level security on every table, Auth (PKCE, OAuth,
  magic links), Storage for KYC documents, Edge Functions (Deno) for every privileged write.
- **Payments:** PayFast (ZAR) — hosted checkout built server-side from the payment record
  (never from client input), ITN webhooks verified with four independent checks: MD5 signature
  over the field-order-preserving body, amount-in-cents comparison, server-to-server
  `validate`, and an optional source-IP allowlist. Idempotent by provider-event ledger.
- **Communications:** Twilio (Verify OTP, operational SMS, masked voice calls, WhatsApp
  webhooks) with signed webhooks; Brevo transactional email via an approval-gated outbox.
- **Client↔Xooter chat:** end-to-end encrypted envelopes; the server stores ciphertext only.
- **Mobile:** Expo with EAS builds; Live Activities and widgets on iOS, widgets on Android.
- **Observability & quality:** Vitest (1,200+ unit tests incl. guard-test layers), k6 load
  tests, ESLint + `tsc --noEmit`, Semgrep, secret scanning, build-artifact scanning.

## Architecture in one paragraph

The browser and the mobile app hold **no authority**: every privileged action — booking
creation and pricing, payment initiation and confirmation, KYC submission and approval, message
sending, SOS alerts — is an authenticated call to an Edge Function, which re-derives prices,
re-checks ownership and role, writes an audit-log entry, and only then touches the database
through the service role. Direct client writes are locked down at the RLS layer
(`docs/security/client-write-revoke-plan.md`), and the client write-surface is pinned by a
regression test so a new surface cannot appear silently.

## Getting started

```bash
# Web app
npm ci
cp .env.example .env          # fill in the public VITE_ values for your environment
npm run dev                   # http://localhost:5173

# Tests / checks
npm run test                  # Vitest unit suite
npm run lint                  # ESLint
npm run security:scan         # secret scan + frontend-mutation + DOM + hosting asserts
npm run verify                # lockfiles + lint + tests + build + artifact scan + security

# Mobile (Expo)
npm run mobile:install
npm run mobile:start
```

Edge Functions live in `supabase/functions/` and run on Deno; deploy through the repo's
workflows (`deploy-edge-functions.yml`) or the documented `ops:supabase:deploy:*` scripts —
never by hand from an unreviewed session. Database changes are migrations only
(`supabase/migrations/`), delivered by `db-push.yml`.

### Environment & secrets

- Public (browser-bundled) values: `.env.example` documents every `VITE_` key.
- Edge Function secrets (PayFast merchant keys, Twilio, OpenAI, service role) are set in the
  Supabase secret store per environment — see
  [`docs/SECRETS_INVENTORY.md`](docs/SECRETS_INVENTORY.md) and
  [`supabase/functions/.env.example`](supabase/functions/.env.example).
- Nothing here needs a secret committed to git; `scripts/security/secret-scan.mjs` enforces
  that in CI.

## Security & trust model

The security programme lives in [`docs/security/`](docs/security/) — a master threat-model
index, payment and payout integrity review, edge-function and webhook threat model, RLS and
storage reviews, supply-chain inventory, and an ASVS-informed verification matrix. The rules
every change must preserve are in [`docs/SECURITY_RULES.md`](docs/SECURITY_RULES.md).

Xooter onboarding, in particular, is enforced at the Edge Function, not just in the form:

- applicants must be **18 or older**;
- a South African ID number must pass its **Luhn checksum** and its embedded date of birth
  must **match the supplied date of birth** (passports are validated as passports);
- references **cannot be the applicant**, cannot be the **same person twice**, and cannot be
  **another Xoot applicant who has not passed verification** — former employers, institutions,
  friends and already-approved Xooters are the acceptable sources;
- activation requires all seven verification areas plus four documents, training and consent —
  `approve-xooter` refuses otherwise and every decision is audit-logged.

## Documentation map

| If you want to… | Read |
| --- | --- |
| Understand the product and commercial rules | `docs/PROJECT_CONTEXT.md`, `docs/product/locked-commercial-facts.md` |
| Understand the security posture | `docs/security/master-threat-model-index.md`, `docs/security/xoot-security-programme.md` |
| Ship a release | `docs/release/FOUNDER-PRODUCTION-HANDOFF.md`, `docs/release/launch-protocol.md` |
| Work on the repo as an agent | `CLAUDE.md`, `docs/AGENT_RULES.md`, `docs/implementation/agent-worklog.md` |
| Understand booking logic | `docs/BOOKING_LOGIC.md` |
| Build the mobile apps | `docs/native/mobile-app-build.md`, `docs/EXPO_MOBILE_PRODUCTION_READINESS.md` |

## Contributing & agent workflow

This repository is developed with multiple AI-agent sessions alongside humans. The contract is
[`CLAUDE.md`](CLAUDE.md): read the worklog before starting, claim your work in it, keep
server-side authority server-side, and never weaken a control that money or trust depends on.
Production deploys require green CI (lint, tests, build, secret scan, security review) and go
through protected branches.

## License

Proprietary. All rights reserved — see `package.json`. Xoot® and the Xooter marks belong to
the company; nothing in this repository grants a licence to them.
