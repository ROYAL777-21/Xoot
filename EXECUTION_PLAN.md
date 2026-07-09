# Zoot Execution Plan

Reviewed: 2026-06-19

## Scope

Convert Zoot from prototype toward production-ready web, mobile, and backend operations without exposing credentials or making unsafe production changes.

## Current Repo State

- Web app remains in the repository root as React/Vite/TypeScript.
- Expo mobile app exists in `mobile/` and shares the Supabase backend.
- Supabase code lives in `supabase/migrations` and `supabase/functions`.
- Native helper work lives in `native/`.
- Operational documentation lives in `docs/`.
- Current local branch: `codex/full-zoot-iphone-pwa-auth-security`.

## Verified Backend State

- Production Supabase project: `Zoot` / `mvlrkelahhsyjrwgsxaf`.
- Staging Supabase project: `Zoot Staging` / `fxmxyabdjqviqbcxmvlp`.
- Production has recorded migrations and Edge Functions.
- Staging currently has no application migrations and no Edge Functions deployed.
- Supabase Branching is not available on the current plan; a separate free staging project is the correct fallback.

## Execution Order

1. Preserve secret safety.
   - Do not paste, print, hardcode, or commit real secrets.
   - Keep `VITE_` and `EXPO_PUBLIC_` limited to public-safe values.
   - Keep service-role, payment, Twilio, Brevo, KIE, OpenAI, Airtable, Hostinger, Cloudflare, and signing credentials outside frontend/mobile bundles.

2. Reconcile backend before staging deployment.
   - Compare production migration history to local migrations.
   - Avoid blindly applying divergent migrations to staging if the source of truth is unclear.
   - Produce a deployable staging plan or baseline once the intended schema source is known.

3. Deploy staging backend after reconciliation.
   - Apply schema migrations to `Zoot Staging`.
   - Deploy Edge Functions to staging.
   - Set staging Edge Function secrets through Supabase dashboard or CLI.
   - Smoke-test with real staging client, admin, and Zooter users.

4. Complete environment and CI blockers.
   - Set GitHub repository/environment variables for public Supabase config.
   - Keep GitHub Pages deploy guarded until required public values exist.
   - Keep production fail-loud config validation.

5. Complete mobile release setup.
   - Keep Expo app separate from the existing web app.
   - Use EAS environments for public mobile variables.
   - Configure iOS/Android EAS credentials only after Apple/Google console records are ready.

6. Complete provider credential setup.
   - Store provider secrets only in Supabase Edge Function secrets or provider dashboards.
   - Do not create placeholder secrets that could accidentally pass production checks.

7. Verify before reporting completion.
   - Run relevant web, mobile, security, and configuration checks.
   - Report actual blockers separately from completed work.

## Immediate Blocker Plan

The immediate hard blocker is staging backend deployment. The safe path is:

1. Confirm whether local migrations are the intended source of truth or whether production schema should be exported as a baseline.
2. If local migrations are source of truth, apply them to the empty staging project in order and verify schema/advisors afterward.
3. If production schema is source of truth, export a production baseline through Supabase CLI/dashboard, review it, then apply that baseline to staging.
4. Deploy Edge Functions only after the staging schema exists.
5. Set Edge secrets directly in Supabase dashboard or CLI because the current connector does not expose a secret setter.

## Risk And Rollback

- Risk: applying divergent local migrations to staging may create a staging schema that does not match production.
- Rollback: because staging is empty, the project can be recreated or reset before real test data exists.
- Risk: deploying functions before secrets exist creates runtime failures.
- Rollback: redeploy functions after secrets are configured; do not route production traffic to staging.
- Risk: setting fake provider secrets hides configuration errors.
- Rollback: never set fake secrets; keep validation fail-loud.
