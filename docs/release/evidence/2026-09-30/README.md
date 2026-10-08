# 30 September implementation evidence

This is a staging checkpoint, not a completed launch or mobile release. The original
uploaded HTML/ZIP sources remain the visual authority. No production promotion or
database migration was performed for this checkpoint.

## Actual hosted screenshots

Captured from Vercel deployment `xoot-n77peftty-royal777-21s-projects.vercel.app`,
whose browser-fetched build stamp identifies `105b9264ba6ba36e1cfd705169c57cac6021a991`.
The protected preview used temporary authorized access and a fresh anonymous browser.
There were no page errors or horizontal overflow on home/sign-in at 1440 and 390 pixels.
These are actual hosted UI captures; no API responses or account data were replaced.

- [Desktop homepage](website-home-1440.png)
- [Mobile homepage](website-home-390.png)
- [Desktop sign-in](website-signin-1440.png)
- [Mobile sign-in](website-signin-390.png)
- [Build stamp and capture checks](evidence.json)

The unchanged homepage composition retains the handoff logo, portrait, fonts, colours
and geometry. Availability copy avoids an unverified dispatch-time promise. These four
captures do not establish fidelity or functionality for every handoff screen. The full
[source coverage matrix](../../../implementation/visual-fidelity-ledger.md) remains open.

## Executed CI at c9a9386

- [Tests 36643027223](https://github.com/ROYAL777-21/xoot-your-local-helpers/actions/runs/36643027223):
  133 files / 1,352 tests passed. The ordinary suite's seven skipped SQL tests execute in
  the separate required SQL job, which also passed, alongside the gift rollback checks.
- Real independent-session PostgreSQL 17.6 and 17.11 jobs both passed: 39 scenarios each,
  including 20 database-observed blocking barriers. The exact old debit trigger permits
  two R70 debits from R100 and ends at minus R40; the correction rejects the competing
  debit and leaves R30. Bulk-statement rollback, waiting across expiry, nonfinite amounts,
  owner transfers, role denial and legitimate customer/signup operations are exercised.
- [Web build 36643027236](https://github.com/ROYAL777-21/xoot-your-local-helpers/actions/runs/36643027236)
  passed, including the browser check of the production-configured artifact at its actual
  origin, home/sign-in navigation, direct sign-in reload and controls. The earlier 404 did
  not recur; commit 04f309d retains failed-resource path diagnostics without query values.
- CodeRabbit reviewed all five files in 04f309d..c9a9386 and raised 0 issues. Scoped Codex
  Security scan `304a1eee-2fdf-4022-ba0d-e64129ba4d46` completed with 0 findings. It covers
  the benefit guard, test runner, CI and supporting fixture/status documents only.

The database fixture is deliberately bounded and synthetic. It does not prove the complete
Supabase migration chain, deployed roles or booking/payment fulfilment. The account guard
migration and private calculator are not deployed, and the new creation writer is not enabled.
The generated production-schema check remains red for pending migrations/types. The separate
Claude security action lacks API credit; it is not successful review evidence.

Remaining work includes signed-in quotes, atomic one-job creation, crew/referral/payment
lifecycle, all remaining source screens, production gates and native device verification.
The native preview startup was rejected by automatic approval review with “blocked by policy”;
no native rendered/device result or store artifact is claimed.
