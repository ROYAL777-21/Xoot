# Hosted website checkpoint — 1 October

Verified commit: `5f1b15000a22049344fb0147bdbf7aa10181e29a`.
Vercel deployment: `dpl_4j7mcV4Knbb3pdMBA55QXkKgxbXX`, READY.
Use the [protected stable preview](https://xoot-git-codex-xoot-production-20260911-royal777-21s-projects.vercel.app/).
The account's Vercel access is required; temporary access links expire and are not stored here.

- Homepage: [1440 pixels](website-home-1440.png), [390 pixels](website-home-390.png)
- Sign-in: [1440 pixels](website-signin-1440.png), [390 pixels](website-signin-390.png)
- [Captured measurements and hosted build stamp](evidence.json)
- [Source checkpoint ZIP](https://github.com/ROYAL777-21/xoot-your-local-helpers/archive/5f1b15000a22049344fb0147bdbf7aa10181e29a.zip) — authorized GitHub access required; not a final release.

These are actual hosted pages, with no mocked authentication, records or intercepted requests.
The real rendered-site smoke passed homepage navigation to sign-in, email/OTP/password controls
and runtime checks. Both captured viewports had no page/console errors or horizontal overflow.
The original logo, fonts and artwork remain in use.

The one-off deployment hostname rendered but its service requests failed the backend origin
allowlist. The stable preview hostname is permitted: its Concierge preflight and browser smoke
passed. No backend origin was added or weakened. The first screenshot harness also looked for an
obsolete Sign in button; it was corrected to the actual Your email/Send one-time code controls.

[Tests run 36788417052](https://github.com/ROYAL777-21/xoot-your-local-helpers/actions/runs/36788417052)
and [Web build 36788416997](https://github.com/ROYAL777-21/xoot-your-local-helpers/actions/runs/36788416997)
passed for this commit. Semgrep, production-readiness guard and native Swift check also passed.
The schema comparison and Claude security workflow remain failed; they are separate release gates.
See the [current checklist](../../production-checklist.md) for pending database/provider work.

This checkpoint includes the reviewed web Home/Visits ports. Their signed-in visual checks use
isolated synthetic QA records, separately documented in the 30 September folders. They do not
prove live account, payment or crew fulfilment. Full Profile/Notifications and remaining handoff
screens, database delivery, paid journeys and native devices/distributions remain unfinished.
The public `pricingRule` stamp still names the legacy fee rule ZD-026; it does not certify the
new shared-job quote contract `booking-zd038-v1`. No production promotion occurred.
