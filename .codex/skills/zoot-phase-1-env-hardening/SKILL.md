---
name: zoot-phase-1-env-hardening
description: Immediate Phase 1 implementation skill for Zoot production environment hardening. Use when blocking mock/preview Supabase data from production, adding fatal production env guards, validating VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY, updating .env.example, creating src/lib/env-check.ts, or removing Care+/ZootCred/Home Memory mock objects from authenticated production paths.
---

# Zoot Phase 1 Env Hardening Skill

Load `zoot` and `zoot-security` first. Then read:

- [references/phase-1-prompt.md](references/phase-1-prompt.md)
- `../work/zoot_company_wide_md_pack/docs/engineering/ENVIRONMENT_SETUP.md`
- `../work/zoot_company_wide_md_pack/docs/security/SECURITY_RULES.md`
- `src/integrations/supabase/client.ts`
- `src/data/care-plus.ts`
- `src/main.tsx`
- `.env.example`

## Required Outcome

Production must fail visibly and before render when Supabase public config is missing or placeholder. Development may keep the preview Supabase client.

## Required Files

Only edit these for the Phase 1 implementation unless inspection proves another file is necessary:

- `src/integrations/supabase/client.ts`
- `src/data/care-plus.ts`
- `src/pages/care/CarePlus.tsx`
- `src/components/care-plus/CarePlusShowcase.tsx`
- `src/pages/app/Plans.tsx`
- `src/main.tsx`
- `src/lib/env-check.ts`
- `.env.example`

## Acceptance Criteria

- `VITE_APP_ENV=production` plus missing or placeholder Supabase keys shows a visible fatal config error and does not render the app.
- `VITE_APP_ENV=development` plus missing Supabase keys keeps preview mode available.
- Preview client code remains available for development only.
- Authenticated user-facing components do not show `mockCarePlusMembership`, `mockFavouriteZooter`, `mockZootCredBalance`, `mockPropertyProfiles`, or `mockHomeMemoryProfile` in production.
- Remaining live-data gaps are explicit TODOs naming the intended Supabase table.

## Focused Searches

Run these before and after edits:

```powershell
rg -n "PreviewSupabaseClient|preview-local-anon-key|preview-anon-key|mockCarePlusMembership|mockFavouriteZooter|mockZootCredBalance|mockPropertyProfiles|mockHomeMemoryProfile|assertProductionEnv" src .env.example
rg -n "VITE_APP_ENV|VITE_SUPABASE_URL|VITE_SUPABASE_PUBLISHABLE_KEY|VITE_SUPABASE_PROJECT_ID" .env.example src
```

## Verification

Run at least:

- env/config check
- lint
- tests touching env/client behavior, if present
- production build
- secret scan

If the local shell lacks `npm`, use the bundled Node executable and local package entrypoints.
