# Everything required to go live

**Written 2026-09-02**, the day the launch stopped being blocked on CI.

One page, two halves. The first is **every gate and where it actually stands**, measured today
rather than recalled. The second is **the short list only the founder can do**, each with the reason
no session can do it — because "ask the founder" without a reason is how a list becomes wallpaper.

This is a status page, not a fourth register. It adds no items. `NEEDS-FOUNDER.md` holds what you
must supply, `founder-todo.md` holds what state production is in, `next-session.md` holds what to
run. `launch-protocol.md` holds the ordering and the reasoning behind it; this holds today's answer.

---

## Part 1 — the gates, and where they stand

| # | Gate | State | Evidence |
|---|---|---|---|
| 0 | CI can allocate a runner | ✅ **closed today** | Job `100145687623`, `runner_id 1000002340`, 15 steps, 06:16:32 → 06:18:40, success. Nineteen days of `runner_id 0` ended |
| 1 | Production actually deploys | ✅ **closed today** | Vercel `dpl_A5fuZXCQAPF7zCQJVKy7cAxzrPNx`, `target: production`, **READY**, commit `8cb2d0b`. The first non-ERROR production deployment the project has ever had |
| 2 | The site is publicly reachable | ✅ **closed today** | Netlify's deploy record for `xoot-home-care`: `commit_ref 8cb2d0ba…`, `branch main`, `context production`, `state ready`, `ssl_url https://xoot.co.za`, published 11:31:57Z. **The domain serves the merged commit.** ⚠️ The *header and routing* verification is a separate question and has still not run — see below |
| 3 | A booking can be paid for | 🔴 **founder** | No PayFast merchant exists. `NEEDS-FOUNDER.md` §1 |
| 3a | The homepage's claims are true | ✅ **closed today** | Four claims reworded to what is checkable; `MIE` removed from every shipped component. `NEEDS-FOUNDER.md` §4 |
| 4 | Instrumented before spend | ⚪ not started | No analytics, no crash reporting, no funnel. Attribution before acquisition — `hormozi-findings.md` §1 |
| 5 | Supply before demand | 🔴 **founder** | Named, activated Xooters per launch suburb. **The one that looks compressible and is not** |
| 6 | 10–20 friendly bookings | 🔴 **founder** | Real reviews, real photography, real numbers. Cannot be manufactured later |
| 7 | Content banked | 🟠 partial | Drafts exist on the Eden Content Engine board. TikTok primary, Instagram secondary, sequential |

**Gates 0, 1, 2 and 3a closed today.** What is left before a
customer can pay is gate 3, and it is a merchant account.

### ⚠️ What gate 2 does and does not prove

**Proved, from Netlify's own API rather than from inference:** the production deploy attached to
`xoot.co.za` is `commit_ref 8cb2d0ba9ceab839068e3b9968811caa4818adeb`, `branch main`,
`context production`, `state ready`, published `2026-09-02T11:31:57Z`, with 1 redirect rule and 22
header rules processed. The 28 May hand-upload is no longer what the domain serves.

**Not proved: that it serves it *correctly*.** `verify-live-deploy` polls
`xoot.co.za/build-info.json` for the commit and gates the header check on that stamp matching. The
stamp is **not readable** — twenty attempts over ten minutes. So `verify-live-site.mjs` has still
never run against the live site, and CSP, HSTS, `noindex` on `/app` `/auth` `/admin`,
`/.well-known/` handling and "no service-role key in the bundle" are all unverified in production.

**The repo is not the cause.** Built locally under Vercel's exact production environment:

```
> postbuild
Wrote dist/build-info.json (commit 2d0ce032)
```

`postbuild` runs the stamp writer, `netlify.toml` publishes `dist`, and its SPA redirect is
`status = 200` **without** `force`, so a real file wins over the rewrite. The remaining candidates
are all on the deploy side, and the next run prints the response body rather than only the verdict.

### 🟠 A second finding from that same local build — the association files do not ship

```
Skipped apple-app-site-association: set XOOT_APPLE_TEAM_ID or XOOT_IOS_APP_ID.
Skipped assetlinks.json: set XOOT_ANDROID_SHA256_CERT_FINGERPRINTS.
```

**`dist/.well-known/` does not exist.** So iOS Universal Links and Android App Links have no
association file to fetch, and because the SPA redirect catches anything that is not a real file,
those paths return HTML rather than JSON.

This does not affect the website. It **silently breaks deep links the moment the app ships** — which
is the exact failure mode `vercel.json`'s `/.well-known/` exclusion exists to prevent, arriving from
the other direction: the rewrite is configured correctly and there is simply no file behind it.

Three build-time variables fix it, and they are the founder's because they come from the Apple and
Google consoles: `XOOT_APPLE_TEAM_ID`, `XOOT_IOS_APP_ID`, `XOOT_ANDROID_SHA256_CERT_FINGERPRINTS`.

### Two things that are true at once about the web host

`xoot.co.za` is served by **Netlify**; the **Vercel** project builds the same commit in parallel and
has no custom domain attached. That is a deliberate choice made on 2026-09-02, not drift: Netlify
already held the domain and its certificate, so taking the site live cost nothing, while attaching
the domain to Vercel needs a dashboard and a DNS change.

Both hosts stay correct because `validate-public-env.mjs` derives the environment from whichever
host it is on, and the security headers are mirrored into `vercel.json` with
`assert-static-hosting-security.mjs` failing if they drift. Moving the domain to Vercel later is a
DNS change and nothing else.

---

## Part 2 — only the founder can do these

Ordered by what they unblock. Each says why no session can do it, because that is the part that
makes the list trustworthy.

### 🔴 1. `SUPABASE_DB_PASSWORD_PRODUCTION` — found today, and it is one field

GitHub → Settings → Secrets and variables → Actions → New repository secret. The value is the
database password for `mvlrkelahhsyjrwgsxaf` (Supabase → Project Settings → Database). Reset it
there if it is not written down; nothing else uses it.

**Why no session can do it:** setting an Actions secret requires encrypting the value against the
repository public key, and the GitHub MCP surface here has no secret-write tool. More to the point,
**nobody in this session knows the password** — it is not in the container and it is never readable
back from Supabase.

⚠️ **Do not overwrite the shared `SUPABASE_DB_PASSWORD`.** That value is staging's, staging works
with it, and overwriting it trades one broken environment for another. The workflow now prefers a
per-environment secret and falls back to the shared one.

**What is waiting on it:** `20260902120000_finish_zd028_rename_in_constraint_names.sql` — applied
and proven on staging, refused on production with `SQLSTATE 28P01`. It is why the
`Types match the live schema` check is red. Nothing breaks at runtime; ~31 foreign-key constraint
names and one view column still spell the old brand.

### 🔴 2. PayFast merchant credentials — gate 3, the last hard gate

Three secrets on both Supabase projects, plus `PAYFAST_MODE` and `XOOT_APP_ENV=staging`. Full detail
and the capability-row mechanics: `NEEDS-FOUNDER.md` §1.

**Why no session can do it:** there is no merchant account to get credentials from. This is a
commercial relationship, not a configuration value.

### 🔴 3. Invoice legal entity — `XOOT_INVOICE_LEGAL_ENTITY` and its registration number

`generate-booking-invoice` refuses outright when unset, so **no completed booking produces an
invoice** until it is. `NEEDS-FOUNDER.md` §6.

**Why no session can do it:** these are facts about a registered company. A guessed entity name on a
South African tax invoice is worse than no invoice, which is exactly why the function fails closed.

### 🟠 4. The Vercel plan, if Vercel is ever to serve the domain

The team is on **`hobby`**. Vercel's Hobby tier is for non-commercial use, and Xoot intends to take
payments. This is a terms question rather than a technical one, and it belongs on the list before
any spend starts. Nothing today depends on it, because Netlify serves the domain.

**Why no session can do it:** buying a plan is a purchase, and attaching a custom domain has no MCP
tool on this surface.

### 🟠 5. Three `XOOT_*` build variables, or deep links break the day the app ships

`XOOT_APPLE_TEAM_ID`, `XOOT_IOS_APP_ID`, `XOOT_ANDROID_SHA256_CERT_FINGERPRINTS`, set in the web
host's build environment. Without them `write-native-association-files.mjs` skips both files and
`dist/.well-known/` is never created — measured on a local production build today.

**Why no session can do it:** the team id and app id come from Apple Developer, and the SHA-256
signing fingerprint comes from the Android keystore or Play App Signing. None of them is derivable
from this repository.

**Proves it done:** `https://xoot.co.za/.well-known/apple-app-site-association` returns JSON rather
than the SPA's HTML. `verify-live-site.mjs` already asserts exactly this, once it can run.

### 🟠 6. Four `EXPO_PUBLIC_*` variables, before the next production app build

`EXPO_PUBLIC_SUPABASE_URL`, `_PROJECT_ID`, `_PUBLISHABLE_KEY`, `_EAS_PROJECT_ID`. Table and
reasoning: `deploy-hosts.md` §3.

**Why no session can do it:** the Expo MCP surface here is builds, workflows and store reviews.
There is no environment-variable tool. ⚠️ A production EAS build will now **fail** until these are
set — that is the intended change; it previously succeeded silently while pointing at no backend.

### 🟠 7. `XOOT_CALL_TEST_PASSWORD`, and then place the first two-party call

`NEEDS-FOUNDER.md` §5, walkthrough §A.

**Why no session can do it:** everything else about voice proves configuration. This proves sound
comes out of a phone, and a person has to hold one.

### ⚪ 8. Four decisions in the tracker

[#33](https://github.com/ROYAL777-21/zoot-your-local-helpers/issues/33),
[#38](https://github.com/ROYAL777-21/zoot-your-local-helpers/issues/38),
[#40](https://github.com/ROYAL777-21/zoot-your-local-helpers/issues/40),
[#41](https://github.com/ROYAL777-21/zoot-your-local-helpers/issues/41).

**Why no session can do it:** they are commercial calls with real money on either side of them.

---

## What changed today, in one paragraph

CI came back, which unblocked everything behind it. PR #44 merged, producing Vercel's first
successful production deployment and publishing the real app to `xoot.co.za` through Netlify —
retiring a static file that had been the live site since 28 May. The homepage stopped claiming a
screening bureau it has no contract with, and stopped listing training topics that were actually
interview questions. The ZD-028/029 rename was finished in the staging database and is written and
waiting for production. Three defects were found in the machinery that was supposed to be watching
all of this: one database password serving two projects, a deploy check that polled for three
minutes while claiming ten, and a site verifier that had never been run by anything.
