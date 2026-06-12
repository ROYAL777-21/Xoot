---
name: zoot-security
description: Security hardening skill for Zoot. Use when editing production env guards, no-mock production paths, Supabase Auth, RLS policies, migrations, secrets inventory, payment trust boundaries, SSRF/XSS/rate-limit patches, sensitive contractor/client data access, admin audit actions, or any code that affects security, privacy, fraud, or business-critical authorization.
---

# Zoot Security Skill

Load `zoot` first. Then read the docs that match the work:

- `../work/zoot_company_wide_md_pack/docs/security/SECURITY_RULES.md`
- `../work/zoot_company_wide_md_pack/docs/security/SUPABASE_RLS_RULES.md`
- `../work/zoot_company_wide_md_pack/docs/security/FRAUD_AND_BUSINESS_LOGIC.md`
- `../work/zoot_company_wide_md_pack/docs/engineering/ENVIRONMENT_SETUP.md`
- `docs/SECURITY_RULES.md`
- `docs/SECRETS_INVENTORY.md`
- `docs/ENVIRONMENT_SETUP.md`

Use [references/security-checklist.md](references/security-checklist.md) for Zoot-specific invariants.

## Non-Negotiables

- `VITE_` values are public only.
- Service-role keys belong only in Supabase Edge Functions or secure server environments.
- Production must never activate preview Supabase clients or seeded demo data.
- Payment success, subscription activation, ZootCred changes, refunds, booking status, and contractor activation must be verified server-side.
- Webhooks must verify signatures/secrets where supported.
- RLS must protect user, contractor, payment, support, home memory, and admin data.
- Admin actions must be typed, reasoned, and auditable.

## Sensitive Changes

Before migrations, RLS policy changes, auth changes, payment flow changes, refunds, contractor activation, or production deploys:

1. State the risk and business impact.
2. Show the files to change.
3. Include rollback notes.
4. Ask for approval when the operation changes schema, policy, live credentials, or production state.

## Verification

Prefer these checks when relevant:

- Production env missing required Supabase keys fails before render.
- Development missing Supabase keys still allows explicit preview mode.
- `rg` finds no service-role key use in `src/`.
- Browser code does not write `payment_records`, `user_subscriptions`, `zootcred_ledger`, `bookings`, `zooter_applications`, or admin queues for business-critical flows.
- Secret scan passes.
- Tests/build pass after code changes.
