# Reviewed integration checkpoint — 8 October

Published commit: `8aca3d88fe87db77c8b9fc6cc3706c5434ac198c`. It merges current engineering
main `5400b89` with the reviewed handoff work. The [production checklist](../../production-checklist.md)
remains the launch register; this checkpoint is not the completed website or mobile release.

## Actual hosted rendering

[Staging preview](https://xoot-git-codex-xoot-production-20260911-royal777-21s-projects.vercel.app/)
was captured at 01:12 UTC / 03:12 SAST. Authorized Vercel access or a temporary share link is
required. The temporary token is absent from this repository.

Home and sign-in passed at 1440 × 1000 and 390 × 844: exact commit stamp, loaded fonts and
visible images, real staging directory response with zero approved profiles, no console/page
errors, no configuration overlay and no horizontal overflow. No request interception or
synthetic account records were used. [Measurements](hosted-evidence.json).

The new desktop home and both sign-in captures are byte-identical to the prior checkpoint,
so their existing images are reused here instead of storing duplicates:

| Capture | SHA-256 | Image |
|---|---|---|
| Home 1440 | `E87D568CA7237462A291F4A1D69BAB162419ABAA53EE2C67103C4CFAD6108F88` | [Desktop](../2026-10-07/current-preview/website-home-1440.png) |
| Home 390 | `9533ECD38662E8F5013432E616EA62DA86B58FD4BABF227BD5AFF2410FD8D69E` | [Mobile](website-home-390.png) |
| Sign-in 1440 | `587087C5CCC32DC685E4848C2991DEAE6405B7489C8748FE63F9E0D5B225ECB8` | [Desktop](../2026-10-07/current-preview/website-signin-1440.png) |
| Sign-in 390 | `77E4F796BD7DFAB0E7ED768FE22DC67BF7320F66A4AF88C1C861A3B46BC75683` | [Mobile](../2026-10-07/current-preview/website-signin-390.png) |

The original logo, typography, supplied photo/artwork and composition remain. Runtime copy
does not invent verified helpers or instant availability. The build stamp still names the
legacy ZD-026 rule: the approved R393 ZD-038 quote is not evidence of a completed crew-writer
or payment cutover. Authenticated and paid journeys, remaining handoff screens and physical
native rendering are not established by these public-page captures.

## Database contract checks

The required SQL job in [Tests 37711664508](https://github.com/ROYAL777-21/xoot-your-local-helpers/actions/runs/37711664508/job/113098737997)
passed the actual migrations: eight SQL quote tests, gift rollback/access checks, 20 storage
groups with 37 expected permission rejections and 50 checklist lifecycle/access groups.
The checklist output explicitly reports `concurrentConnections: false`; independent PostgreSQL
contention and hosted role/provider proof remain necessary before delivery. The separate
PostgreSQL 17.6 and 17.11 benefit/notification jobs also passed.

The complete Tests workflow passed all four jobs. Its unit suite passed 152 files / 1,559
tests with seven existing SQL-runtime skips; the isolated SQL job exercises those contracts.
Lint, web/mobile typechecks, native booking checks, two Deno tests, build and the development
rendered check passed. That development check intentionally has no backend; the hosted check
above supplies the real staging-directory evidence. Semgrep, the readiness guard and native
Swift check also passed. A Swift check is not physical-device or native-screen evidence.

The production-configured [Web build](https://github.com/ROYAL777-21/xoot-your-local-helpers/actions/runs/37711664607)
failed at the real directory HTTP404. The [production type comparison](https://github.com/ROYAL777-21/xoot-your-local-helpers/actions/runs/37711664593)
failed with 403 lines of schema/type differences, and the [Claude review guard](https://github.com/ROYAL777-21/xoot-your-local-helpers/actions/runs/37711664564)
reported that its scan did not complete. These remain failed gates. Earlier artifact evidence
identifies API credit and oversized PR-diff retrieval as external-review prerequisites; this
run's failed guard alone does not establish a new cause. No production promotion occurred.

## Restore database deployment access

The [fresh staging dry run](https://github.com/ROYAL777-21/xoot-your-local-helpers/actions/runs/37711711676)
used this exact commit with `dry_run=true` and `repair_orphan_ledger_rows=false`. It stopped at
project linking because the token/account lacked endpoint privileges. Password validation,
migration planning and database writes were not reached. A fresh token alone does not repair
a missing account role.

1. Sign in to Supabase with the account intended to deploy Xoot. Confirm it can access the
   staging project `fxmxyabdjqviqbcxmvlp` and the production project `mvlrkelahhsyjrwgsxaf`.
2. In the owning organization's team settings, have the owner grant that deployment account
   the project/database-management permissions it needs. Use the narrowest suitable access;
   [Supabase's role guide](https://supabase.com/docs/guides/platform/access-control) explains the choices.
3. If the saved token belongs to a different account or needs replacing, generate its replacement
   in [Supabase account tokens](https://supabase.com/dashboard/account/tokens).
4. Open this repository's **Settings → Secrets and variables → Actions**. Update the repository
   secret named `SUPABASE_ACCESS_TOKEN` directly there. Keep the token out of chat and files.
   [GitHub's secret instructions](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets)
   show the secure form. Keep the separate staging/production database password secrets intact.
5. Tell the engineer that deployment access is updated. The next check is the same read-only
   staging dry run, followed by review of its migration plan. Do not enable an apply or ledger
   repair merely to make the workflow green.

Engineering can continue the remaining screen ports and dependency repairs while access is
pending. Existing provider, business, helper, pilot and mobile account requirements remain in
the production checklist.

## Later external changes on 8 October

Main advanced to `9504c1149e22b77cd5e59a0e872f1a0ed2539c6d` with one documentation-only
connected-service report. Its production-ready deployment assertion is not browser evidence.
A fresh `xoot.co.za/build-info.json` read reports that exact main commit, built at 01:20 UTC.
The actual production browser check fails: **Configuration Error**, with `VITE_APP_ENV`
missing. The reviewed `8aca3d8` staging rendering above remains separate evidence. This
controller did not perform the new main deployment or promote the implementation branch.

Read-only production metadata now shows 82 migrations. The added entry is
`20261008011821_live_security_advisor_safety_pin_hardening`. Its recorded statements enable
RLS, add an authenticated owner SELECT policy, revoke anonymous/authenticated execution of
`set_safety_pin(text)` and grant execution to `service_role`. Metadata confirms those effects;
both client roles still lack table SELECT privileges despite the new policy. No PIN rows or
hashes were read. The migration is absent from the engineering migration directory and
differs from its documented authenticated-own-PIN setter contract. Preserve the external
record and review reconciliation before another database plan; do not blindly repair-mark
or replay migrations. No hosted writes were performed by this checkpoint work.

## Compatible dependency repair

The subsequent bounded repair passed independent spec/quality review. Exact override patches
clear the website audit and remove mobile's critical finding while preserving generated CSS
byte-for-byte in the compared typography, CSS-module and application output. Fifty-three
focused web tests, seven mobile booking tests, eight compatibility groups, web/mobile types,
both lock formats and the development build pass. [Full disposition](../../../security/dependency-advisories-2026-10-07.md)
records the three unresolved mobile advisories and their actual use paths. The 1,559-test CI
run above predates these dependency patches; fresh committed CI remains required for them.
