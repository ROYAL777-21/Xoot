# Local build, checklist and booking transaction evidence

12 October 2026. This record closes specific local checks; the complete handoff,
paid website, hosted backend and native release remain unfinished.

## Fresh public-page captures

The production-mode staging build of `18b33f658c234d0bb2d1dc3a42723e41ada030fe` passes
home and sign-in captures at 1440×1000 and 390×844. Six records include password-mode
interaction at both sizes. [Measurements](built-site-evidence.json) identify the build
and the real staging directory response: zero approved helpers. Fonts load, text has
no persistent transform/filter, and no overflow or console/page errors occur.

The installed Playwright fallback was used because the Browser skill is absent.
Only website files are served from the local artifact at its configured preview origin;
backend requests remain real. This is not a fresh hosted deployment or an authenticated
booking journey. The legacy ZD-026 build marker does not establish the R393 crew cutover.

All four new screenshots are byte-identical to their earlier captures, so the repository
reuses the existing images rather than duplicating them:

| Screenshot | SHA-256 | Existing identical image |
|---|---|---|
| Home 1440 | `E87D568CA7237462A291F4A1D69BAB162419ABAA53EE2C67103C4CFAD6108F88` | [Desktop](../2026-10-07/current-preview/website-home-1440.png) |
| Home 390 | `9533ECD38662E8F5013432E616EA62DA86B58FD4BABF227BD5AFF2410FD8D69E` | [Mobile](../2026-10-08/website-home-390.png) |
| Sign-in 1440 | `587087C5CCC32DC685E4848C2991DEAE6405B7489C8748FE63F9E0D5B225ECB8` | [Desktop](../2026-10-07/current-preview/website-signin-1440.png) |
| Sign-in 390 | `77E4F796BD7DFAB0E7ED768FE22DC67BF7320F66A4AF88C1C861A3B46BC75683` | [Mobile](../2026-10-07/current-preview/website-signin-390.png) |

The supplied wordmark, fonts, portrait, flowers and hero composition remain intact.
Operational wording and empty roster data do not fabricate prototype helpers, verified
availability or dispatch speed. These captures do not verify every remaining source screen.

## Checklist updates against cancellation and ownership changes

[Raw results](checklist-evidence.json) and [command output](checklist-command.log) pass
nine scenarios with six observed PostgreSQL lock barriers on version 17.11. Four
independent database sessions use the actual October 3 schema and October 7 checklist
RPC migrations; their exact hashes are in the evidence. The fixture is the committed
minimal sequential verifier's schema, not a rewritten copy of the RPC.

- Cancellation first rejects a waiting update without changing attribution or timestamps.
- Checklist completion first survives later cancellation; later edits are rejected.
- Waiting updates recheck job state and helper ownership after the competing commit.
- Two changes to one task serialize; rollback permits an authorized waiting retry.
- Another booking for the same helper progresses independently.
- Anonymous and ordinary signed-in roles cannot call the service RPC or update rows directly.

Each required wait is observed through `pg_stat_activity` and `pg_blocking_pids`, rather
than inferred from timing. The disposable database and created roles are removed;
pre-existing role attributes/memberships are preserved. The owned loopback server is
stopped and handed back before another task uses it. No hosted records are read or written.

The output-only runner is `outputs/test-checklist-concurrency-20261012.mjs` in this task's
workspace. Required CI integration of this proof is still queued. Complete migration-chain,
hosted role and actual customer/helper checks remain delivery gates; this local result
does not establish them. No checklist product changes were needed for these scenarios.

## One-job booking transaction foundation

The [frozen source and command record](booking-writer-evidence.json) identifies twelve
changed product files over `14310b5`, source tree `b5e4ebf7d8565cd068d427e74efc33b4a3135b70`.
The [actual PostgreSQL output](booking-writer-postgres.log) passes 53 scenarios with nine
observed blocking barriers on PostgreSQL 17.11. The implementation also passes 51 focused
unit tests and focused contract/schema type and lint checks. The independent task review
approved the bounded implementation. Source commit `d139dd786672ca491395220fa6fdaff67093601f`
then passes the [aggregate](booking-writer-aggregate.log): 163 files, 1,742 tests and seven
existing SQL-runtime skips. [Global types/lint/lockfile/source checks](booking-writer-checks.log)
and the [staging build, rendered artifact and artifact scan](booking-writer-build.log) exit 0.
The rendered artifact uses real staging directory data: zero approved helpers. Existing
large-chunk and missing native signing-association warnings remain; no native build was run.
Review artifacts remain in managed Codex Security storage under
`artifacts/reviews/booking-writer-transaction-20261012-*`.

The transaction recalculates the complete accepted quote under account/referral guards
and creates one booking, one payment obligation and all mandatory records atomically.
The approved Airbnb 5.5-hour, two-person example is R393 base plus R39 booking fee.
Fixed empty slots retain the full crew price and deterministic work allocation; no
member commission or earnings is invented before assignment. Eleven mandatory insert
failures roll back the entire attempt. Duplicate attempts, competing credit/referral
use, changed membership, owner changes and absent referral codes are exercised through
separate database connections. Cleanup preserves existing roles and removes the owned
test database; the local server is stopped.

Public creation stays disabled on both existing URLs. Selected or partial helper rosters
return `reservation_policy_unavailable` without booking or benefit effects until the
owner supplies the unpaid reservation rule. Selected-roster acceptance, agreed member
commission/boost snapshots, crew fulfilment, payment confirmation, invoices and referral
rewards/reversals remain unfinished. This local foundation is not a paid booking journey.

Deliver `20261012120000_reviewed_booking_transaction.sql` only after the complete reviewed
prerequisite chain, including quote calculation and benefit guards. The target schema,
grants, triggers and external migration drift must be reconciled first. Then regenerate
database types and deploy both compatible endpoint bundles; shared source edits do not
change old deployed bundles. The old N-row bodies must be replaced before any enablement.
The fixture uses actual relevant migrations over synthetic base tables; complete hosted
migration/actor proof and PostgreSQL 17.6 CI execution remain separate checks. Replay
after membership changes and calculator retirement passes; actual elapsed-start clock
travel was not performed.

If delivery needs rollback, close creation and revoke the new RPC as appropriate while
retaining accepted rows, payment obligations, benefit history and additive schema.
Do not restore an old writer over new-format records. Destructive schema reversal needs
a separately reviewed migration and verified absence of dependent records/consumers.

## Monitoring connection check

The PostHog skill-discovery request (`learn -s "connected organization project setup"`)
returns `USER_NOT_LOGGED_IN`. No project, event or session data was read. Connect the
PostHog app in Codex, complete its sign-in and select the Xoot organization/project.

Sentry's installed read-only workflow requires a local `SENTRY_AUTH_TOKEN`; no callable
Sentry connector was found. The current process has no token, organization, project,
DSN or PostHog public configuration. These are presence-only checks: no secret values
were read into chat, and no claim is made about hosted environment settings.

For the owner: create a scoped Sentry read token in your account's secure settings, set
it locally as `SENTRY_AUTH_TOKEN`, and set `SENTRY_ORG`/`SENTRY_PROJECT` to Xoot's actual
project identity. Keep the token out of chat. After connection, the engineer can inspect
that project and prepare the separate client configuration and delivery checks. Existing
SDK code does not prove the booking funnel, actual ingestion or privacy requirements.
