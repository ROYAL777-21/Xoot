# You, account and place editor — 1 October

These captures render the actual React pages and AppShell with **isolated synthetic
authentication, database and wallet adapters**. Other destinations are test stubs. They
do not show a live customer account or prove deployed writes, payments or native behavior.
Runtime production code has no seeded account records or QA feature flag.

Selected implementation captures:

- You: [member at 390px](you-member-390-viewport.png),
  [standard at 390px](you-standard-390-viewport.png),
  [1440px](you-member-1440-viewport.png)
- Account editor: [390px](account-390-viewport.png), [1440px](account-1440-viewport.png)
- Place editor: [390px](home-390-viewport.png)
- Original handoff: [You](reference-you-390-viewport.png),
  [account](reference-account-390-viewport.png), [place](reference-home-390-viewport.png)

The reference renders the unmodified `app/Profile.jsx`, `app/Frame.jsx`, app data and
design-system bundle independently. Its sample names, addresses and benefits belong to
the prototype, not production. Reference captures use a 20px wrapper above the source
screen; compare the internal header/control geometry independently of that wrapper.
The web implementation does not add a simulated native status bar.

All seven viewports passed: 320×844, 390×844, 768×844, 1024×844, 1440×1000,
1920×1080 and 844×390 landscape. Fonts loaded; headings and Save docks have no final
transform/filter; no document overflow, Vite error overlay or page/console error was found.
The browser exercised real form validation/save handlers through test database adapters,
return navigation, the theme switch and retryable read errors.

[Initial measurements](evidence.json) contain all 28 screen checks and seven interaction
runs. The process later failed only because the reference title was queried as a heading
although the source uses a span. The corrected reference-only run exited 0 with
[three original screens](reference-evidence.json). After review fixes, the amended account
and place views passed all seven sizes again, process exit 0:
[final form measurements](evidence-fix1.json). Those final form captures replace earlier
ones; the You overview was unchanged. Only selected PNGs are committed here.
[Source hashes](source-hashes.json) identify the captured files in the Windows working tree.

Independent spec/quality review passed after restoring the single source Save dock and
plain 44px Back control/header spacing. The focused six-file run passed 60 tests; the final
visual fix passed the 13 Profile component tests and scoped lint. Web typecheck passed
before the visual-only fix. CodeRabbit reviewed all 15 changed source/test/style files
and completed with one minor suggestion: optional-chain a nullable plan name. It was
declined because the database declares `subscription_plans.name NOT NULL` and generated
types declare `string`; the nullable joined plan itself is already guarded.

Account and ordinary home edits use minimal owner-filtered reads, bounded validation,
confirmed returned rows, duplicate-submit locks and account/unmount guards. Existing
default status is read-only: updates omit the flag and new places are nondefault until
atomic default selection exists. Sensitive home fields are read only in the owner editor.

This closes the bounded visual/data port, not the entire account area. Unsupported photo,
verified email/language, home type/default switching, automatic helper matching/reminders,
notification settings, saved cards, referrals, calendars, Siri and widgets remain explicit
work. The [app coverage inventory](../../../../implementation/app-handoff-coverage.md) and
[production checklist](../../../production-checklist.md) track the larger deliverable.
