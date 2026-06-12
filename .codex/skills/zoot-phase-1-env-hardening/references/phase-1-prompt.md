# Phase 1 Production Environment Hardening Prompt

Base branch: `codex-full-zoot-iphone-pwa-auth-security`

Task: block all mock/preview data from ever reaching production.

## Required Guard

Add production validation before any Supabase client or app render can proceed:

- `VITE_APP_ENV=production`
- require `VITE_SUPABASE_URL`
- require `VITE_SUPABASE_PUBLISHABLE_KEY`
- reject preview URLs
- reject `preview-local-anon-key`
- reject `preview-anon-key`
- reject placeholder values

The visible fatal page should tell the user there is a configuration error and to contact support.

## Required Mock Audit

Audit and gate:

- `mockCarePlusMembership`
- `mockFavouriteZooter`
- `mockZootCredBalance`
- `mockPropertyProfiles`
- `mockHomeMemoryProfile`

Primary files:

- `src/data/care-plus.ts`
- `src/components/care-plus/CarePlusShowcase.tsx`
- `src/pages/care/CarePlus.tsx`
- `src/pages/app/Plans.tsx`

For authenticated pages, replace mock usage with real Supabase queries or safe empty/loading states. Mark remaining gaps with a TODO naming the Supabase table.

## Required Files

- `src/integrations/supabase/client.ts`
- `src/data/care-plus.ts`
- `src/pages/care/CarePlus.tsx`
- `src/components/care-plus/CarePlusShowcase.tsx`
- `src/pages/app/Plans.tsx`
- `src/main.tsx`
- `src/lib/env-check.ts`
- `.env.example`

## Acceptance

- Production plus missing Supabase keys shows fatal error and no render.
- Development plus missing Supabase keys activates preview mode as before.
- No mock object appears in authenticated user-facing production components.
- `.env.example` includes production-safe placeholders only:
  - `VITE_APP_ENV=production`
  - `VITE_SUPABASE_URL=https://your-project-ref.supabase.co`
  - `VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key`
  - `VITE_SUPABASE_PROJECT_ID=your-project-ref`
