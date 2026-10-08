# 7 October integration preflight

This records read-only checks before integrating `main` at `5400b89a4aa5ea93b882baa2b7d5f0b2fee955dd`
into implementation commit `c80fd40d4942e5433141c9f0c38b84fd34c98797`. It is not a production
release certificate. The [production checklist](../../production-checklist.md) is the launch register.

## Public deployment and backend

`https://xoot.co.za/` returned HTTP 200 with Vercel headers. Its build stamp still reported
`02bb284b8703ee8e90ff54add4729e5d12ccc3e9`, built 3 September, pricing rule ZD-026 and a
3,900-cent booking fee. A responding page and build stamp alone do not establish a usable
booking journey. The newly received Netlify/GoDaddy instructions are not the approved host
plan; Vercel remains the user's choice. No DNS or hosting settings were changed.

Read-only Supabase catalog and function inventory checks found:

| Check | Staging | Production |
|---|---|---|
| Project | `fxmxyabdjqviqbcxmvlp` | `mvlrkelahhsyjrwgsxaf` |
| Recorded migrations | 83 | 81 |
| Latest version | `20261003140000` | `20260902120000` |
| Functions | 54 | 57 |
| Directory, quote and Xooter checklist functions | All present, active v1 | All absent |
| Notifications in `supabase_realtime` | No | No |
| Client TRUNCATE/TRIGGER grants on notifications/push tokens | 8 | 8 |

These checks read metadata only, with no customer records or hosted writes. The staging
October 3 migration is a new external-state change. A fresh CLI dry run should follow the
integrated commit so that the local migration history includes that version. Repository
secret metadata still reports the access-token secret last changed on 15 August; this does
not establish that credentials work or that environment secrets are absent. The previous
1 October dry run failed at project linking, before database-password validation or writes.

A subsequent exact-version ledger query checked `20260903120000`, `20260920200000`,
`20260928003000`, `20260929055022`, `20261002000000`, `20261003140000`,
`20261004160000` and `20261007140000`. Staging records only the first and October 3 versions;
production records none of those eight. This establishes the missing ledger entries directly,
rather than inferring them from the latest timestamp. Schema effects and live delivery still
need the guarded CLI preflight and actual behavior checks; absence is not permission to
repair-mark versions as applied.

## Notification database CI

[Tests run 37611237465](https://github.com/ROYAL777-21/xoot-your-local-helpers/actions/runs/37611237465)
passed on `c80fd40`. Both PostgreSQL 17.6 and 17.11 completed the new notification step with
23 assertion groups and 30 expected SQL rejections. The runner confirmed removal of its
disposable database and preservation of existing roles and memberships. Both also passed
39 benefit-transaction cases and observed 20 blocking barriers. The lint/build/unit-test job
and separate booking/gift SQL-contract job passed.

This is isolated SQL evidence. Neither live WebSocket delivery nor application of the
notification migration to staging or production is established by this CI run.

## Local integrated tree

The complete local suite passed 149 files / 1,531 tests, with seven existing SQL-runtime
skips. The separate SQL jobs provide their executable database coverage. Three existing
React tests emitted `act(...)` warnings; the negative configuration tests intentionally
printed rejected-build diagnostics. These messages are not a claim of pristine test output.

A staging-configured build of the staged integration passed, followed by the real-directory
browser check (zero approved Xooters, homepage, sign-in navigation/controls and runtime state)
and build-artifact scan. No synthetic backend responses were used for that browser check.
At this point the merge was uncommitted: the generated build stamp still says `c80fd40` and
must not be treated as an identifier for the integrated source tree. A committed hosted
preview must be checked separately. The build also reports missing Apple team and Android
certificate association configuration; those native release requirements remain open.

## Integration limits

The incoming October 4 storage policy incorrectly counts the filename as a folder, rejecting
the existing one-folder upload paths. The reviewed additive correction preserves that historical
migration and verifies the accepted and denied paths. Real Xooter checklists and split-fare
flows survive integration with the existing handoff ports.

Fresh dependency audits on the unchanged lockfiles report 3 web findings (1 high, 2 moderate)
and 29 mobile findings (1 critical, 25 high, 3 moderate). Counts include transitive attribution,
not 32 independently exploitable application flaws. Compatible repairs require review; no
blanket audit-force upgrade or framework downgrade is authorized by this evidence.

The approved ZD-038 quote remains R393 base plus the separate R39 fee for the specified
Airbnb/two-Xooter example. This quote is not proof that the still-unfinished atomic crew
booking writer, payment, allocation and referral journeys are production ready.

## Final integration verification — 8 October

Independent review approved the merge after one fix round. The five corrections cover the
Concierge origin guard, environment-specific native split invitations, visible checklist
errors, server-enforced checklist lifecycle restrictions and unsupported operational claims.
Reviewed source tree: `a63e347849ad59a0e863e34b4f255d5147ab9a95` before parent evidence updates.

The final aggregate ran 152 files: 1,558 tests passed, one documentation assertion failed and
seven existing SQL-runtime tests were skipped. Restoring the truthful `Domain resolves`
wording fixed that assertion; the affected readiness file then passed all 135 tests. No code
changed after the aggregate. The full suite was not repeated merely for the documentation fix.
The staging build, real-directory rendered smoke, artifact scan and four repository security
scans subsequently passed. Build output retains the existing large-chunk warning and missing
native association configuration. The uncommitted build stamp is still the parent commit,
not evidence that the integration is hosted.

The implementer reports 20 storage SQL groups / 37 expected denials and 50 checklist SQL
groups using the isolated PGlite runtime. Both are now required CI steps. The reviewer inspected
the tests and recorded the limit that the fix report has no separate raw output logs; this
report does not turn that review into independent execution evidence. Await committed CI.
Independent-connection PostgreSQL contention/deadlock proof and hosted role/provider checks
remain delivery gates for the new checklist RPC. Migrate before deploying its dependent
function; no hosted schema or function was changed during this integration.
