# Xoot delivery — Session 9 (final consolidation) — 2026-10-29

**Branch:** `feat/crew-eligibility-app-ux-20261028` · **Head:** `5e30040` · **Base:** `e2927029` (the previous Codex handoff tip)
**Contents:** `xoot-final-branch-20261029.bundle` (complete self-contained history — every branch, verified) + `patches/` (12-commit series `e2927029..5e30040`) + `CODEX-HANDOFF-V4-20261029.md` (the consolidated handoff) + this note.
**Verification run at head:** vitest **205 files / 2,165 passed / 7 skipped / 0 failed** · web `tsc --noEmit` clean · mobile `tsc --noEmit` clean · `expo lint` clean · `expo export` clean for iOS **and** Android · `VITE_APP_ENV=production` build green · `security:scan` PASS · `build:artifact-scan` PASS · `lockfiles:check` PASS · live artifact smoke (origin `https://xoot.co.za`) PASS · all ten mobile tsx suites PASS.

## What shipped this session (2 commits on top of `db49da9`)

1. **`35ad599` — One bookable roster across every matching surface.**
   The database already decided who may be offered a job (`active AND background_check_status = 'approved' AND reliability_flagged = false` — enforced by `settle_booking_payment` and the crew settlement contract before any `xooter_jobs` insert), and the directory + ai-match showed customers exactly that roster. The three dispatch writers did not: `create-booking`, `create-booking-request` and `request-replacement` validated against `active` alone, so a customer could name someone the directory would never show and settlement would silently never offer — a paid booking whose assignment never happens, and a "verified Xooter" replacement notification the query never verified.
   - One shared definition: `requireBookableXooter` / `BOOKABLE_XOOTER_GATES` in `_shared/public-directory.ts`, applied by all five surfaces (directory, ai-match, both booking writers, replacement search).
   - `respond-xooter-job` now refuses to let a reliability-flagged Xooter **accept** an offer (declining stays open) — closes the flagged-after-offer window.
   - Migration `20261029110000`: `xooters_public` tightened to the same triple, so favourites, Care+ specialists, the ZOTM slot and the household layer surface exactly the bookable roster. Authenticated-only grants restated.
   - `src/lib/matching-roster-contract.test.ts` (14 tests) pins the helper, all six function surfaces, the view and the settlement SQL to each other.
2. **`5e30040` — Session worklog** (`docs/implementation/agent-worklog.md`).

### Emulation-ready mobile (in the same commit)

`mobile/config/public-environments.json` — the mobile twin of the website's committed public config. Development and preview builds now resolve the live project's public Supabase values with **zero EAS console setup**, so `eas build --profile development` (or `preview-simulator`) installs an app that talks to the same backend as the website. `staging`/`production` stay empty on purpose — a store build fails validation instead of inheriting. `validate-env.ts` and `env.ts` resolve identically (pinned by `src/lib/mobile-env-defaults.test.ts`); `expo export` proved the bundle for both platforms. **`mobile/EMULATION-20261029.md` is the founder's emu­lation guide** (dev-client paths, what works, and the honest limits: SOS dial-out needs hardware, email sign-in needs `xoot://auth/callback` in the Supabase redirect allowlist, maps need a Mapbox `pk.*` token, Expo Go cannot run this app because of Mapbox/Twilio Voice native modules).

### Fixed: pre-existing mobile booking-suite drift

`test:booking` was failing at `db49da9` (outside the root vitest run, so sessions 7–8 never saw it): the crew clamp moved to the founder eligibility rule in `6e40ae9`, but the stale blanket-cap expectation was never re-run. Corrected, plus a positive airbnb crew case. All ten mobile tsx suites pass.

## Founder actions, in order (unchanged gates, now with the matching migration)

1. **Redeploy production from `5e30040`** and run the post-deploy gate (`ops:smoke:rendered:artifact` + `security:scan`). Still closes SEC-1/2/4 from the recon report — the live site runs a build from before the 28 October hardening.
2. **Apply migrations** (Supabase → production): `20261028120000`, `20261028140000`, `20261028160000`, `20261029090000` (concierge retirement), **`20261029110000` (matching roster)** — all safe, additive, reversible.
3. **Supabase Auth redirect allowlist:** add `xoot://auth/callback` and `https://xoot.co.za/**` so the emulated app can complete email sign-in.
4. **Emulate:** `cd mobile && eas build -p ios --profile preview-simulator` (or `-p android --profile development`), then `npx expo start --dev-client`. Details in `mobile/EMULATION-20261029.md`.
5. Mailboxes: confirm support@ / newsletter@xoot.co.za receive (no MX was visible in public DNS at the 2026-10-24 check).

## Rollback

- Matching: revert `35ad599` (the view migration is a single `create or replace view`; the function changes are one commit).
- Emulation defaults: delete `mobile/config/public-environments.json` and the two resolver hunks — builds fall back to explicit-env-only behaviour.

## Not verifiable from this sandbox (no credentials)

Live redeploy, production migration apply, Supabase console settings, EAS cloud builds, PayFast live keys, app-store submissions. The full founder-owned E2E list is in `CODEX-HANDOFF-V4-20261029.md` §"What is left for full end-to-end production" and `docs/release/production-checklist.md`.
