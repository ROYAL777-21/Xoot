# Hosted account-port checkpoint — 1 October

Verified commit: `0ee9cb28fed185183766232353ff643f88ce9a82`.
Vercel deployment: `dpl_4WEvanN8L4gkh9NcunJPWADedB8p`, READY.
Use the [protected stable preview](https://xoot-git-codex-xoot-production-20260911-royal777-21s-projects.vercel.app/).
Temporary access links expire; they are not stored in Git.

- Actual hosted homepage: [1440 pixels](website-home-1440.png), [390 pixels](website-home-390.png).
- Actual hosted sign-in: [1440 pixels](website-signin-1440.png), [390 pixels](website-signin-390.png).
- [Browser measurements and exact build stamp](evidence.json).
- [Private source checkpoint ZIP](https://github.com/ROYAL777-21/xoot-your-local-helpers/archive/0ee9cb28fed185183766232353ff643f88ce9a82.zip). Authorized GitHub access is required; this is not a completed release.

These public-page captures used the actual preview, original logo/fonts/artwork, and real
staging requests without interception or synthetic accounts. The capture waited for network
settling and fonts. Home and direct sign-in had no page/console errors or horizontal overflow
at both widths. The separate [signed-in account/form comparisons](../profile/README.md)
use isolated synthetic QA adapters and do not establish live customer writes.

[Tests 36854442688](https://github.com/ROYAL777-21/xoot-your-local-helpers/actions/runs/36854442688)
passed 143 files / 1,444 tests (seven existing skips), separate SQL contracts, and actual
PostgreSQL 17.6/17.11 transaction jobs. The PR Tests run also passed. Semgrep,
production-readiness and native Swift checks passed; a Swift build is not device verification.

## Production check remains failed

[Web build 36854449284](https://github.com/ROYAL777-21/xoot-your-local-helpers/actions/runs/36854449284)
compiled but failed its production-configured browser check: HTTP 404 from
`mvlrkelahhsyjrwgsxaf.supabase.co/functions/v1/public-xooter-directory`.
Read-only function inventories on 1 October confirm the function is absent in production
and ACTIVE v1 in staging. Direct requests independently returned production 404/NOT_FOUND
and staging 200 with zero public profiles. The production function inventory also lacks
`get-booking-quote`; the quote needs the complete booking rollout, not an isolated enablement.

The [delayed-response probe](smoke-late-roster-20261001.json) reproduced a defect in the
existing smoke check: an immediate roster 404 fails, while an identical two-second-delayed
404 passes because navigation closes the request before the result arrives. Earlier green
smoke runs do not establish production directory readiness. Fixing this test race and
reviewed backend delivery remain launch gates; do not retry for a lucky green result.

A fresh [read-only staging migration preflight, run 36932028355](https://github.com/ROYAL777-21/xoot-your-local-helpers/actions/runs/36932028355)
used `dry_run=true` and disabled ledger repair. Credential-presence checks and CLI setup
passed, but `supabase link` failed because the configured access token/project pair lacks
the endpoint privileges. No migration or ledger write was attempted. This failure happens
before database password validation; it is not evidence of an incorrect database password.

Production schema comparison and the external Claude scan also remain failed gates.
The latest Claude artifact records a GitHub 406 response while fetching PR data, and its
error log independently reports insufficient Anthropic API credit. A separate read-only
diff request confirms GitHub's reason: the PR exceeds the 300-file diff limit. Review
retrieval needs a paginated file API or a local Git comparison, alongside owner API credit.
Neither failure is a clean security review. Full source coverage, paid journeys, production promotion and native distributions
remain unfinished. See the [current checklist](../../../production-checklist.md).
