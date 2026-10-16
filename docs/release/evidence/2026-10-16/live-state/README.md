# Observed live state — 16 October 2026, Johannesburg

These are dated read-only observations, not a production release approval. The website
probe ran on 15 October at 15:35 UTC; schema reads and the deployment preflight ran on
15 October at 22:08–22:09 UTC (16 October just after midnight in Johannesburg).

## What currently renders

The actual public domain `https://xoot.co.za` reports commit
`5aebf7d34dde046b5c56cc5c94283f91104df98a`, built 14 October at 23:38 UTC.
At 1440×1000 and 390×844, home and direct sign-in render without a configuration
overlay, root/document overflow or recorded page/console errors. Desktop Sign in
navigates to the actual email form. The mobile header still contains Book and Book now.

No credentials were entered, accounts created, requests intercepted or backend data
fabricated. These checks do not establish a successful sign-in, complete network/lazy
section coverage, booking, payment or authenticated customer/Xooter/admin journey.
They supersede the earlier observed configuration failure only for these public pages.

- [Actual production homepage, desktop](production-home-1440.png)
- [Actual production homepage, phone](production-home-390.png)
- [Actual production sign-in, desktop](production-signin-1440.png)
- [Actual production sign-in, phone](production-signin-390.png)
- [Five browser records and build stamp](evidence.json)
- [Exact probe source](check-live-status.mjs)

The browser probe used the installed Playwright package under the frontend-testing
workflow because the Browser skill/plugin was unavailable. Its original execution
from the repository used `node ../../outputs/check-live-status-20261015.mjs`, terminal
exit 0. This copy preserves the original output path and is evidence, not a release gate.

The newer local Trust/Journal/navbar/SVG implementation is source `6056b6f` with
[separate source comparison evidence](../../2026-10-14/public-visual/README.md).
Those local captures are not screenshots of this production release. A fresh
unauthenticated request to the stable implementation-preview metadata redirected to
Vercel login; its 8 October verification is historical.

## Hosted metadata and source reconciliation

[Catalog receipt](catalog-receipt.json) contains schema/function metadata only, no
private user rows or secret values:

| Environment | Observed state | Remaining reconciliation |
|---|---|---|
| Staging | 85 migrations; new referral-client-grant version `20261015102137` and checklist version `20261015155437`. Checklist mutation exists, with execution denied to anon/authenticated and allowed to service role. | Compare exact statements/effects with the prepared October 7 checklist migration; the new version alone is not equivalence proof. |
| Production | 82 migrations; latest external safety-PIN `20261008011821`. Both referral tables and checklist mutation are absent. | Preserve and review the incoming referral-base prerequisite, reconcile the PIN change and deliver the complete ordered sequence. |
| Production functions | 58 endpoints; `public-xooter-directory` ACTIVE v1; `get-booking-quote` and `xooter-job-checklist` absent. | Directory is present, but remaining booking dependencies still need delivery and live verification. |

Fresh publishable-key metadata matches the current implementation branch's production
default and does not match the replacement in the newly fetched main branch. Values
are omitted. Integration must preserve the verified environment/project pairing.

Pinned fetched sources are `origin/main` at
`a87ea7828cabda13445cafefae55a5aa924935d8` and `release/xoot-production` at
`6487d78e7acb67774fbd82d1d123f55a89aa8fc1`. Their meaningful native/release changes must
be reconciled with the ongoing implementation, preserving both histories. No merge,
promotion or hosted mutation was performed as part of these observations.

## Database deployment access

[Staging dry run 38815125826](https://github.com/ROYAL777-21/xoot-your-local-helpers/actions/runs/38815125826)
used release source `6487d78`, `environment=staging`, `dry_run=true` and
`repair_orphan_ledger_rows=false`. Credential-presence and CLI setup passed; linking
failed with: `Authorization failed for the access token and project ref pair` and an
endpoint-privileges error. The job ended before migration listing, dry-run SQL or repair.
The generic workflow text about SQLSTATE 28P01 is conditional advice; that password
error did not occur. This result does not establish that either database password is wrong.

- [Exact failed-step log, secrets masked by Actions](staging-dry-run-38815125826.log)
- [Terminal job and step results](staging-dry-run-38815125826.json)

To restore access:

1. Sign in to the Supabase account that owns the deployment token. Confirm that it can
   open Xoot staging (`fxmxyabdjqviqbcxmvlp`). If it cannot, an organization owner must
   correct its project membership and required database-management access.
2. Check the token's resource and capability scope. If it excludes the project or the
   required endpoint, create a replacement restricted to the needed Xoot resources and
   capabilities. Supabase documents [account/project roles](https://supabase.com/docs/guides/platform/access-control)
   and [scoped tokens](https://supabase.com/changelog/scoped-personal-access-tokens-ga).
   Do not paste a token into chat.
3. In the GitHub repository, open Settings → Secrets and variables → Actions. Update
   the effective `SUPABASE_ACCESS_TOKEN` secret through the secure form; check the staging
   environment as well as repository secrets because an environment secret may override it.
   Keep `SUPABASE_DB_PASSWORD_STAGING` and `SUPABASE_DB_PASSWORD_PRODUCTION` separate.
4. Tell engineering that access has changed. Engineering can rerun the staging dry run,
   review the resulting migration plan, and verify the exact schema before any write.
   Repeating the unchanged credentials now would not make progress.

Logging in locally does not replace the GitHub Actions secret. The saved access failure
does not prevent continued local implementation, review or database concurrency tests.

## Evidence integrity

`manifest.sha256` hashes every file here except itself. Directory attributes preserve
raw bytes, including line endings in logs and JSON. No screenshot was retouched.
These checks do not close the complete visual, security, money, native-device, restore,
staffing, provider or production-pilot gates in the [current checklist](../../../production-checklist.md).
