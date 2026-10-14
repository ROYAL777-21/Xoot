# Xoot 14 October production verification — isolated redesign hardening

## Source and scope

- Redesigned website release source: `release/redesigned-preview-20261014`, commit `7ebba290357de2a899151a7f9cd0e9f7e8350609`. This incorporates the founder-selected design and a keyboard-focus fix, without merging the draft Codex PR #46.
- Isolated follow-up branch: `goal/xoot-production-hardening-20261014`. The [isolated security change](https://github.com/ROYAL777-21/xoot-your-local-helpers/pull/50) is based on the redesigned release and deliberately does not alter `main` or Codex PR #46.
- Security scope: Vercel `/xooter` and `/xooter/(.*)`, Netlify `/xooter` and `/xooter/*`, and Apache `^/xooter(/|$)`; all set `noindex` and `no-store, private`. A static assertion and the live verifier were extended to include previously unlisted routes. This is defence-in-depth: user authentication and database RLS remain mandatory.
- Checked structural rules on the 14 October source; removing the Vercel wildcard from the candidate policy exposes an unprotected nested route in the check. This is not a browser test or proof of actual served HTTP headers.

## What is actually deployed

- Vercel production deployment `dpl_CYGVbfpayMvcRxfS7ZSVRLgSNdBB`, commit `66bdf8d62e1cd92f89a8c8f93b599fe901cde0e1`: API state `READY`, target `production`, assigned aliases `xoot.co.za` and `xoot.vercel.app`. Its prebuild config check and Vite build were observed in provider logs.
- Vercel status, configured aliases and passing compilation **do not prove DNS routing, live HTTP response headers, browser functionality or end-to-end transactional success**. Attempts to fetch the live domains from the model environment were blocked by network/DNS restrictions. A live network or authorized browser must check the current deployed version and run `node scripts/ops/verify-live-site.mjs https://xoot.co.za` and `npm run ops:smoke:rendered:live -- https://xoot.co.za` where supported.
- The current isolated branch did not run local `npm run build`, `npm run security:scan`, and `npx vitest run` in a full checked-out workspace; its Vercel build succeeded. Treat the GOAL's GREEN gate as **open**.
- No production database migrations, Supabase Edge Function deployments or enabled payment/voice flags resulted from this security release.

## Direct Supabase audit (14 October)

- Production project `mvlrkelahhsyjrwgsxaf` is `ACTIVE_HEALTHY` with **82 recorded migration versions**. Latest `20261008011821` is a live safety-PIN hardening entry not reconciled in repository history. Do not mistake the latest timestamp for all earlier changes being delivered.
- Production has **57** active Edge Functions. **Missing:** `public-xooter-directory`, `get-booking-quote`, `xooter-job-checklist`. Existing `create-booking`, `confirm-payment` and `twilio-voice-webhook` do not prove current functionality or match with the reviewed repo source.
- Staging project `fxmxyabdjqviqbcxmvlp` is `ACTIVE_HEALTHY`, with **54** functions and all three above present. Stage/production contracts are not equivalent.
- Production Supabase security advisor returned **Leaked Password Protection Disabled**. [Remediation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- No SQL writes, production function deployments, migration repair marks or provider-flag changes were made by this audit.

## Security review blocker

- Claude Security Review [run 38579922150](https://github.com/ROYAL777-21/xoot-your-local-helpers/actions/runs/38579922150) **failed** at `Require a completed security scan`; the scan process returned `Credit balance is too low`. This is not a clean audit. Restore the Anthropic account credit and rerun, or obtain an equivalent completed independent review.

## Full-production GOAL gates: evidence, not assumptions

| Gate | 14 October assessment |
|---|---|
| LIVE SITE | Redesigned Vercel production build `READY`; live browser, HTTP header, roster/backend and app route checks still required. Main branch is intentionally **not merged** with draft PR #46. |
| PAYMENTS | **Open.** No verified PayFast sandbox notification + `confirm-payment` success; flags remain disabled. |
| VOICE | **Open.** No demonstrated real connected Twilio two-leg conference. |
| DESIGN | **Open.** Selected handoff has partial verified implementation; full app and native parity still outstanding per `docs/implementation/app-handoff-coverage.md`. |
| SECURITY | **Open.** Xooter route policy improved; live headers, full security scan and authenticated RLS evidence remain required. |
| GREEN | **Open.** No complete fresh verify run, function/repo parity or reconciled database history. |

## Safe delivery sequence

1. Keep PR #46 separate; integrate reviewed handoff completion on its own development branch, not by overwriting history or declaring unfinished capabilities complete.
2. Obtain CI, reviewed database access credentials, staging migration ledger and precise migration effects. Resolve the externally introduced production migration before any production write.
3. Deliver reviewed migrations to staging and dependent functions in a coordinated change; prove owner, role and money boundaries with signed-in smoke tests.
4. Complete sandbox PayFast reconciliation, actual Twilio two-party call and independent security review. Only then evaluate enabling gated paid/calling features.
5. Promote a reviewed stable commit after running full build, tests, artifact/security scans and rendered web checks, and verify served routes and real provider effects after deployment. Keep rollback artifacts and do a consenting operational pilot.

See [production checklist](../../production-checklist.md) for founder credentials, legal/operational approvals and remaining release items. No credential values are included here.
