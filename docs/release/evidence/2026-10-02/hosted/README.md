# Hosted checkpoint — 2 October

Verified website commit: `01ec3d6dfc281f4906d92617c75c5babfed6ffac`.
Vercel deployment: `dpl_FaNn5vv3FuQGon1iHafnwNdrgyen`, READY.
Use the [protected stable preview](https://xoot-git-codex-xoot-production-20260911-royal777-21s-projects.vercel.app/).
Temporary preview-access links expire and are not committed.

- Actual homepage: [1440px](website-home-1440.png), [390px](website-home-390.png).
- Actual sign-in: [1440px](website-signin-1440.png), [390px](website-signin-390.png).
- [Capture measurements and exact hosted build stamp](evidence.json), 00:17 SAST.
- [Private source checkpoint ZIP](https://github.com/ROYAL777-21/xoot-your-local-helpers/archive/01ec3d6dfc281f4906d92617c75c5babfed6ffac.zip).
  Downloads require authorized GitHub access. This is a checkpoint, not the completed release.

The updated live browser verifier waited for the actual staging directory response and
settled roster (zero approved Xooters) before navigating to sign-in. Homepage controls,
navigation and direct auth reload passed. The two-size capture had no page/console errors,
configuration overlay or horizontal overflow. No authentication/database records or requests
were substituted. The [signed-in feed comparisons](../notifications/README.md) separately use
synthetic test adapters and do not establish live authenticated delivery.

[GitHub Tests 36933862603](https://github.com/ROYAL777-21/xoot-your-local-helpers/actions/runs/36933862603)
passed 147 files / 1,514 tests (seven existing skips), separate booking/gift SQL checks and
PostgreSQL 17.6/17.11 transaction jobs (39 scenarios and 20 observed blocking barriers each).
The hermetic CI browser check explicitly reports that the real roster was not checked.
Semgrep, production-readiness guards and native Swift checks passed; the Swift result
does not verify Expo/device behavior.

[Production-configured Web build 36933862601](https://github.com/ROYAL777-21/xoot-your-local-helpers/actions/runs/36933862601)
compiled but failed its real-directory browser check with HTTP 404 before leaving home.
The production schema comparison also failed, and the Claude scan did not complete.
Prior diagnostic evidence identifies insufficient API credit and GitHub's 300-file diff
retrieval limit; those are not successful security review results. Production promotion,
database delivery, remaining handoff coverage, paid journeys and native releases remain open.
