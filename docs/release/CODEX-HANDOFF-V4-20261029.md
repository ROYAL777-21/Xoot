# Codex handoff v4 — 2026-10-29 (final consolidation: sessions 6 → 9)

Supersedes `CODEX-HANDOFF-V3-20261028.md`. V3 covered sessions 6 + 7 + 7b (tip `ab89de7`).
This adds **session 8** (concierge retirement, momentum gamification, security-sweep fixes,
llms.txt + growth playbook — tip `db49da9`) and **session 9** (one bookable matching roster,
emulation-ready mobile defaults, mobile-suite repair — tip `5e30040`). Remote GitHub `main` is
still `1062bdba`; nothing has ever been pushed from the build sandboxes.

**Everything since the last handoff base `e2927029` is in this package as one 12-commit patch
series and one complete-history bundle.**

## Branch chain (all in the bundle)

```
e2927029  release/20261028-careplus-earnings-sos          (previous handoff tip)
└─ security/website-hardening-20261028
   ├─ cf55cba0  headers / robots / prompt-injection / deps   (session 6-1)
   └─ b5f4f460  Apple-level defence in depth                 (session 6-2)
      └─ feat/mobile-camera-sos-20261028
         ├─ 108c02a6  mobile camera + SOS + crew settlement + item-8/15 designs
         └─ c4455bde  fix: stale production publishable key  (session 6-3)
            └─ feat/crew-eligibility-app-ux-20261028
               ├─ 6e40ae9  crew eligibility (offices/airbnbs) + camera/SOS UX  (session 7)
               ├─ ab89de7  premium feel pass — haptics, skeletons, recovery    (session 7b)
               ├─ 85213ee  retire the AI concierge → human support directory   (session 8)
               ├─ 5c8f5d4  Xooter momentum: streaks + job milestones           (session 8)
               ├─ ddf2e33  close the 2026-10-29 recon findings + pin them      (session 8)
               ├─ db49da9  llms.txt + traffic-compounding playbook + worklog   (session 8)
               ├─ 35ad599  one bookable roster + emulation-ready mobile        (session 9)
               └─ 5e30040  session-9 worklog                                    (session 9) ← TIP
```

## The accumulated delivery since `e2927029`, by theme

**Security (defence in depth).** Website hardening (headers, robots, prompt-injection
containment, dependency advisories) then Apple-level depth: AAL2 money-settlement gate,
spoof-resistant rate-limit keys, per-caller address-search budgets, ops-workflow contractor
lockdown, seven bounded writers, CORS allowlist convergence, DB deny-before-policy
(migration `20261028140000`). Session-8 sweep: dot-leading paths can no longer soft-200 through
the SPA rewrite, the route-inventory file is gone from `public/`, Hostinger CSP `form-action`
carries PayFast, `/book` noindex parity, `Options -Indexes`, obsolete `X-XSS-Protection`
removed — every one pinned by `assert-static-hosting-security.mjs`. A stale production
publishable key in the committed defaults was found and fixed (`c4455bde`) — any repo-built
deploy before that fix would have shipped a site unable to reach its own backend.

**Marketplace integrity (matching).** Crew settlement re-keyed to (booking, xooter) so a crew
booking carries one earning per assignee from their OWN struck rate (`20261028160000`), with
completeness refusal until every assignee is offered. Crew eligibility confined to offices and
short-stay rentals above size/duration/price thresholds (founder rule 2026-10-28, one tunable
file, `BOOKING_PRICING_VERSION` zd039). Session 9 closed the last matching hole: **one shared
definition of "publicly bookable" (active + background-check approved + not reliability-flagged)
now gates the directory, ai-match, both booking writers, the replacement search, the accept
path, and the `xooters_public` view** — the roster a customer can see, name and pay can no
longer differ (`20261029110000` + `matching-roster-contract.test.ts`).

**Safety.** Armed SOS (`SAFETY_READINESS: "live"` in `src/lib/safety.ts:105`): dial 112 BEFORE
any server call, server-verified PIN, raise/cancel with honest half-failure copy, works across
web and native from one state machine. Native SOS polished (56pt countdown, per-second dots,
full-width cancel, distinct dispatch vibration, status checklist) without touching a single
load-bearing rule. Still gated on the founder's physical 112 test before public release.

**Mobile product.** Camera capture → preview → confirm for completion photos (validation
identical to web); premium-feel pass (five-class haptic policy, living skeletons, one-tap
service recovery, one design language across the booking journey); momentum recognition
(completed-job counts, SAST-day streaks surviving one rest day, milestones — no pay/ranking
effects); concierge retired into a human support directory (support@ and newsletter@xoot.co.za
on app and website, deep links preserved). **Emulation-ready**: committed public defaults mean a
dev-client build runs against the live backend with zero console setup
(`mobile/EMULATION-20261029.md` documents the paths and limits; Expo Go cannot run this app —
Mapbox/Twilio Voice native modules).

**Growth.** `public/llms.txt` for AI assistants; `docs/marketing/TRAFFIC-COMPOUNDING-PLAYBOOK-2026.md`
(Hormozi $100M concepts + 12 platform playbooks + SEO/GEO/AEO, 90-day calendar — concepts only,
no copyrighted text); daily growth-log checklist. Two scheduled routines exist for consistency
(daily security recon, daily growth engine).

## How to reconstruct (from this package)

```bash
git clone xoot-final-branch-20261029.bundle Xoot-recovered
cd Xoot-recovered && git checkout feat/crew-eligibility-app-ux-20261028   # 5e30040
npm ci && cd mobile && npm ci && cd ..            # root + mobile deps
npm test                                          # 205 files / 2165 passed / 7 skipped
# or apply the series onto an existing e2927029 checkout:
git am patches/*.patch
```

The bundle records a **complete** history (`git bundle verify` → "The bundle records a complete
history.") — it needs no other remote.

## Verification (all at `5e30040`)

vitest 205 files / 2,165 passed / 7 skipped / 0 failed (includes the 43 rendered-browser
checks) · web `tsc --noEmit` clean · mobile `tsc --noEmit` clean · `expo lint` clean ·
`expo export` green for iOS (7.4 MB Hermes) and Android · `VITE_APP_ENV=production` build green ·
`security:scan` (live-header contract + secret scan + admin-queue/DOM assertions + static-hosting
assertions) PASS · `build:artifact-scan` PASS · `lockfiles:check` PASS · live artifact smoke vs
the production backend PASS · all ten mobile tsx suites PASS (booking suite repaired this
session — it had silently drifted outside the root vitest run).

## What is left for full end-to-end production (the honest list)

Nothing left is reachable by code from the build sandbox; every remaining item needs founder
credentials, founder money, or a physical device. In dependency order:

1. **Deploy the code.** Production still runs the 24-Oct build; every security, matching and
   product fix since is undeployed. Redeploy from `5e30040`, run the post-deploy gate. *(Closes
   SEC-1/2/4 from the recon report by itself.)*
2. **Apply the five pending migrations** (`20261028120000/140000/160000`,
   `20261029090000`, `20261029110000`) to production, then re-run drift checks.
3. **Supabase console:** Auth redirect allowlist (`xoot://auth/callback`, `https://xoot.co.za/**`)
   for mobile sign-in; admin TOTP enrolment (the AAL2 money gate refuses to open without it);
   Brevo API key for lifecycle email.
4. **PayFast live:** replace sandbox credentials, prove authorised checkout + server callback
   validation + duplicate/failure/cancellation handling, then switch the capability on.
5. **SOS physical test** (the runbook's gate for the live safety flag): place/observe a real 112
   dial on hardware before public release.
6. **Mobile store path:** EAS build (dev-client first — `EMULATION-20261029.md`), device
   acceptance, then the store profiles. Mapbox `pk.*` token and push-notification registration
   are production-build requirements. Apple needs an enrolled team, a paid plan and signing.
7. **Ops reality checks:** MX records for support@/newsletter@, Xooter vetting pipeline
   (background checks are the matching roster's trust basis), worker capacity in launch zones,
   voice first-call test before `twilio.masked_voice` flips on, E2EE cutover acceptance.
8. **CI:** the GitHub plan's included minutes were exhausted (3,000/3,000 on 26 Oct) — jobs ran
   with zero steps. Renew or the repo has no automated gate.

The authoritative long-form list stays `docs/release/production-checklist.md` (27-Oct section)
and `RUNBOOK-20261028.md`.

## Conventions that must survive any continuation

- Never copy Hormozi text — concepts only (copyright).
- `SAFETY_READINESS` "live" + dial-112-first + server PIN are load-bearing; pinned by tests.
- Money rules are server-authoritative and parity-pinned; client ladders mirror, never decide.
- Every threshold the founder may tune lives in one file with tuning instructions
  (crew: `booking-contract.ts`; safety: `safety.ts`).
- The mobile tsx suites run OUTSIDE root vitest — run them by name after any mobile change
  (`npm run test:booking … test:account-finance`); the booking-suite drift was exactly this blind spot.
- Deploy must go from the branch tip that carries the publishable-key fix (`c4455bde` or later).
