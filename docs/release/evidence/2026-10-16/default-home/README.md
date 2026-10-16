# Atomic default-home verification — 16 October 2026

Source `d1c12ea2a412f1bf81a093deff7fecfe1e51e906` unifies saved places under
`household_profiles`, with explicit legacy identity mapping, owner-serialized save,
default selection and archival, and consistent web/native readers. Selecting a new
default clears the previous selection in the same transaction. No legacy row is merged
by address text or deleted. No implicit replacement default is chosen after archival.

The independent task review and scoped fix review approve the local source. Review
artifacts remain in managed Codex Security storage. This is not hosted delivery,
authenticated production proof, native-device acceptance or whole-company readiness.

| Check | Result and raw evidence |
|---|---|
| Actual PostgreSQL 17.11 | [22 scenarios, eight observed lock barriers](focused/postgres-final.txt); isolated synthetic database removed and pre-existing roles preserved. Tests cover competing writes, ownership, atomic rollback, lost-response retry and history-preserving archival. |
| Regression sensitivity | [Picker reload failed before the correction](focused/fix1-picker-before.txt); corrected component retains draft/UUID and original default request through uncertain save and reload. [41 focused tests pass](focused/fix1-focused-tests.txt). |
| Final aggregate | [166 files / 1,774 tests pass](aggregate-fix1.log), seven pre-existing SQL-runtime skips. Actual SQL proof is recorded separately above. Expected negative configuration errors in the log are successful rejection cases. |
| Source checks | Web/mobile type checks, global lint, lockfile validation and source guards all pass in `final-*.log`. No native/Expo runtime was started. |
| Browser | [Seven viewports and failed-save/retry states](browser/evidence.json) pass for actual HomeEdit/Profile components, with keyboard toggle/save, no root overflow and no persistent heading transform/filter. |
| Build | [Staging-configured build](configured-build.log), [rendered artifact](configured-ops-smoke-rendered-artifact.log) and [artifact scan](configured-build-artifact-scan.log) pass. Actual staging directory response has zero approved Xooters. |

Browser scope: the isolated output-only harness substitutes synthetic auth/database/wallet
adapters; it proves the actual web controls, layout and confirmation handling. It cannot
prove real sign-in, hosted SQL, user permissions or physical devices. The synthetic homes
shown in these QA screenshots are not production data or shipping UI defaults.

Screens cover 320, 390, 768, 1024, 1440, 1920 pixels and 844×390 landscape. Real browser
menu zoom, additional browsers and physical high-density devices remain final-plan gates.
The original handoff composition is preserved; unsupported place-type persistence remains
an explicit unfinished feature rather than a working-looking selector.

Earlier failures are retained: `aggregate.log` exposed a root documentation regression and
the source ACL scanner's inability to read multiple function signatures; both were fixed.
The initial final build (`final-build.log`) correctly refused absent local staging public
settings. The next build used the existing branch-specific Vercel staging public settings;
no secret was added to source. An initial PostgreSQL fixture/FK error and a test-only TS
library error are also retained beside their successful corrected runs. The original
implementation report referenced a missing lint file; only the saved final/fix lint logs
are claimed as evidence.

After the founder's new requirements were recorded, the two relevant documentation guards
passed 143 tests (`docs-final-corrected.log`). A prior selector named nonexistent files
and ran no tests (`docs-final.log`); it is not verification. The first correct selection
found missing Mapbox coverage phrases in the edited checklist; the wording was corrected
without restoring the obsolete requirement for browser URL restrictions on native keys.

Delivery remains gated on reviewed migration ordering, compatible canonical-home clients,
actual target ACL/PostgREST/two-account checks, and a rollback exercise. The new migration
depends on the prior default uniqueness safeguards. Retain canonical/history records on
rollback; disable new writes rather than restoring unsafe legacy writes. See the current
[production checklist](../../../production-checklist.md) for deployment access and phases.

Raw bytes are preserved by local Git attributes and `manifest.sha256`. The supplied
browser harness is retained for reproducibility; it does not ship in the app.
