# 16 October 2026 — map integration and database-access readiness

Scope: read-only Supabase catalogue, non-decrypted Vercel env metadata, reviewed release source and Mapbox vendor attribution/pricing docs. **Not** a physical-device or live customer tracking pass.

## What actually exists

- The approved `release/xoot-production` website `src/components/xoot/ServiceAreaMap.tsx` renders a **source-authentic vector illustration** of South Africa and Gauteng; it is not a live Mapbox map. Do not replace it with the old `main` Mapbox component or claim live GPS from this illustration.
- The native Expo app has `@rnmapbox/maps` in dependencies and its EAS config plugin; `mobile/src/components/service-area-map.native.tsx` renders five **static launch suburb points**, not moving Xooters or route ETAs. Expo Go does not support the native module; an EAS development/preview/production client is required.
- Production and staging each have **26 suburb-centroid records**, read access for `anon` and RLS enabled (live SQL, 16 October). The shared `src/lib/geo.ts` / server matching code uses **suburb-level Haversine approximation**, not driving distances, real-time movement or precise home geocoding. Never display it as a live travel ETA. Booking address/access instructions remain sensitive.
- Vercel project `xoot` has a `VITE_MAPBOX_PUBLIC_TOKEN` setting targeting Production and Preview, plus other Mapbox build/secret variable **names**. Existence of a setting is not token validity, referrer restrictions, successful tile load or live map rendering. Do not copy secret tokens into `VITE_*` or `EXPO_PUBLIC_*`.
- EAS `EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN` and private `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` availability have **not** been verified in connected Expo account. An unrelated Vercel setting does not configure an EAS build.
- The original native MapView disabled Mapbox logo and attribution, which Mapbox requires for its tiles. This branch enables both and moves the overlay to the top, away from the footer credits; native and web fallback text no longer instructs customers to add engineering credentials or claims unproven ETA capabilities. The public token guard rejects secret/malformed non-`pk.` values, and CI includes targeted regression tests.

## Remaining maps acceptance before declaring launch-ready

1. Owner creates **separate restricted public Mapbox tokens** for website and native, and a private download token for EAS native dependency builds, in the [Mapbox account](https://account.mapbox.com/access-tokens/). Keep `sk.` credentials private; previous secret exposure requires rotation. Verify account billing, URL/app restrictions and cost caps.
2. Inspect actual EAS environment (`development`, `preview`, `production`) and set `EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN` in each appropriate profile, restricted public `pk.`. Add `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` **only** as EAS build-time secret. Validate physical Android and iOS map tile load, required Mapbox branding, network-off/error fallback and source-design fidelity.
3. For authenticated jobs, decide whether the product promises **(a)** address selection, **(b)** privacy-aware route/distance, **(c)** continuous Xooter GPS sharing and live ETA. These are **three additional capabilities**, not provided by merely adding a token. If approved, implement address confirmation and server-authorised lifecycle/location expiry; opt-in location permissions, no exact home coordinates on public maps, and no fabricated arrival time. Verify against actual consented mobile test accounts.
4. Browser proof on `xoot.co.za` must establish the correct served release commit and map illustration, not infer full native feature delivery from Vercel READY.

## Independent database-access blocker

Latest `Database migration push` staging Actions run [38815125826](https://github.com/ROYAL777-21/xoot-your-local-helpers/actions/runs/38815125826) failed at Supabase `link` with management API **insufficient privileges for the token+project pair**, before password validation. It fell back to shared `SUPABASE_DB_PASSWORD`. The owner must configure a project-authorised `SUPABASE_ACCESS_TOKEN`, and per-environment `SUPABASE_DB_PASSWORD_STAGING` / `SUPABASE_DB_PASSWORD_PRODUCTION` secrets in GitHub Actions. Current Supabase documentation says `link` needs read access to Project Settings, API Keys and API Key Secrets. Obtain/reset database passwords separately in each project's **Database → Settings**. Never paste them into repository, chat or issue. No prod schema push was dispatched by this audit.

Other GOAL blockers unchanged: production referral/checklist schema, missing quote/checklist functions, PayFast signed sandbox roundtrip, real Twilio two-leg proof, independent security review, physical device builds and business approvals.

Sources: [Mapbox attribution](https://docs.mapbox.com/help/dive-deeper/attribution/), [Mapbox pricing](https://www.mapbox.com/pricing), [Supabase password reset](https://supabase.com/docs/guides/troubleshooting/how-do-i-reset-my-supabase-database-password-oTs5sB), [Supabase PAT permissions](https://supabase.com/docs/guides/platform/personal-access-tokens).
