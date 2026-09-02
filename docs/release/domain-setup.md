# Getting xoot.co.za to serve the actual app

## ⚠️ Answered 2026-08-13, from the Netlify API: the site was never connected to the repository

Eight runs of *Verify live deploy* found no build stamp. The reason is not a failing build, a queue,
or DNS. It is this — the live deploy record, read directly:

```
id            6a189bd7a6082006e0ca6aed
state         ready
published_at  2026-05-28T19:47:45Z        ← nearly three months old
title         "Deploy triggered by upload"
deploy_source "api"
commit_ref    null                        ← not from a git commit at all
committer     null
summary       "1 new file uploaded — 1 generated page changed: index.html"
              "No header rules processed"
```

**`xoot.co.za` is serving a hand-uploaded `index.html` from 28 May 2026.** The Netlify project
`xoot-home-care` exists and the domain is correctly attached to it — but **nothing has ever linked
it to `ROYAL777-21/zoot-your-local-helpers`**. There is no `commit_ref`, no commit URL, no committer,
and the deploy source is `api`.

So no push to `main` has ever changed the live site, and none ever will until this is fixed. Three
things follow, and they are worth stating plainly:

1. **The live site is not the app.** Every feature merged since 28 May — the R39 booking fee, the
   Care+ waiver, the whole Xoot rename, voice calling — is not on it.
2. **The security headers are not live either.** *"No header rules processed"* means `public/_headers`
   has never been applied. The `/xooter/*` `noindex` / `no-store` rules I fixed this morning are in
   the repo and not on the internet.
3. **The founder's "Netlify published at ~22:11" was this same static file being served.** Nothing
   published then. That is not a criticism — a site that returns 200 looks identical either way,
   which is exactly why the build stamp exists.

> ## 🚨 CORRECTED 2026-09-02 — DNS is NOT fine, and GoDaddy is exactly what to touch
>
> The line that used to sit here read: *"DNS is fine. Do not touch GoDaddy. Netlify already reports
> `xoot.co.za` as the primary URL with `ssl_url: https://xoot.co.za`, so the domain and the
> certificate are both in place. The problem is entirely on the build side."*
>
> **Every clause of that is wrong, and it is kept here rather than deleted because it is the sentence
> that stopped anyone from looking in the right place for three weeks.**
>
> The build side was fixed: the project is linked, and Netlify holds a correct production deploy of
> `commit_ref 8cb2d0ba…`, `branch main`, `context production`, `state ready`. The site still did not
> change, and on 2026-09-02 `verify-live-deploy` finally printed what `https://xoot.co.za` actually
> returns:
>
> ```html
> <!DOCTYPE html><html lang="en-US"><head>…<title>Xoot</title>
> <meta name="generator" content="Starfield Technologies; Go Daddy Website Builder 8.0.0000"/>
> <link rel="canonical" href="https://xoot.co.za/404"/>
> ```
>
> **The domain resolves to the GoDaddy Website Builder.** Not Netlify. Not Vercel. A GoDaddy
> placeholder site is answering for the apex, and `/build-info.json` returns its 404 page.
>
> ### The mistake worth learning from, because it was made three times
>
> `ssl_url: https://xoot.co.za` in Netlify's API means **"Netlify is configured to serve this domain
> if traffic arrives."** It is not a statement about where DNS sends traffic. The same trap caught
> the Vercel reading of `target: production, state: READY`, and it caught me twice in one morning.
>
> **A host's own record can never answer "what does a visitor get?"** Only fetching the URL from
> outside can, and `xoot.co.za:443` is refused by the agent environment's egress policy — so this
> question was unanswerable from a session and had to come from a GitHub runner.
>
> **→ The fix is in `## Point the domain at the app` at the bottom of this file.**

---

## The fix: connect the existing project to the repo

**Do not create a second site.** The domain is attached to `xoot-home-care`; making a new project
would mean moving the domain and re-issuing the certificate for no reason.

### 1. Open the project

**[app.netlify.com/projects/xoot-home-care](https://app.netlify.com/projects/xoot-home-care)** →
**Project configuration** → **Build & deploy** → **Continuous deployment**.

It will say something like *"This project is not linked to a Git repository."* That line is the whole
bug.

### 2. Link the repository

**Link repository** → **GitHub** → authorise if asked → choose
**`ROYAL777-21/zoot-your-local-helpers`**.

Netlify reads `netlify.toml`, so accept what it proposes:

| field | value |
|---|---|
| Branch to deploy | **`main`** |
| Build command | `npm ci --no-audit --prefer-offline && npm run build` |
| Publish directory | `dist` |

### 3. ⚠️ Set the environment variables BEFORE the first build

This is the step that fails silently if skipped. The `VITE_*` values are **inlined at build time** —
a build without them succeeds and produces a site that cannot reach Supabase. It looks like an app
bug, not a config one.

**Project configuration → Environment variables → Add a variable.** Copy each from GitHub →
Settings → Secrets and variables → Actions → **Variables** tab:

```
VITE_SUPABASE_URL              VITE_APP_ENV
VITE_SUPABASE_PUBLISHABLE_KEY  VITE_PUBLIC_SITE_URL
VITE_SUPABASE_PROJECT_ID       VITE_MAPBOX_PUBLIC_TOKEN
VITE_SENTRY_DSN                VITE_CLOUDFLARE_TURNSTILE_SITE_KEY
VITE_GOOGLE_WEB_CLIENT_ID      VITE_APPLE_SERVICES_ID
```

All are safe to put in Netlify — they ship to the browser inside the bundle either way. None of them
is a secret. Set the scope to **all deploy contexts**.

### 4. Confirm auto-publishing is on

Same screen: **Build settings → Stop builds** should read *"Builds are enabled"*, and under
**Deploy contexts**, *Production branch* = `main`. If auto-publish is off, builds run and never go
live — the same symptom by a different route.

### 5. Trigger the first real build

**Deploys → Trigger deploy → Deploy site.** Watch it. It will take a few minutes, and the log should
end with the `postbuild` chain, including `Wrote dist/build-info.json`.

If it fails, send me the error — a build failure now is almost certainly a missing environment
variable or a Node version, and both are fixable in the repo.

### 6. Prove it

GitHub → Actions → **Verify live deploy** → *Run workflow*.

- ✅ **green** — the live site is serving the commit `main` is on. **This also opens the §3b pricing
  gate**, because both read the same stamp. Tell me and I will take the ZD-029 rename to production.
- ➖ **"no build stamp"** — the deploy did not publish. Check *Deploys* for whether it says
  *Published* or *Preview*.
- ❌ **wrong commit** — an older deploy is still the published one. **Deploys → the newest → Publish
  deploy.**

---

## After it goes green

The production sequence that is currently impossible becomes possible, in this order and with no gap
between the two steps:

1. `db-push` → **production** (the ZD-029 migration)
2. `deploy-edge-functions` → **production**, function list **blank**

Between them, every function queries tables that have been renamed out from under it. That is
survivable only while no operational table has rows, and that is the last moment it will be true.

`preflight-production.yml` now refuses step 1 if step 2 would be blocked — see
[`go-live.md`](./go-live.md) §3-1.

---

# Point the domain at the app

**Written 2026-09-02, after establishing that GoDaddy's Website Builder is answering for the apex.**

Everything on the build side is finished. **Both hosts hold a correct, current build of `main`:**

| host | state |
|---|---|
| Netlify `xoot-home-care` | deploy `6a9808ea`, `commit_ref 8cb2d0ba…`, `branch main`, `context production`, **ready** |
| Vercel `xoot` | `dpl_A5fuZXCQAPF7zCQJVKy7cAxzrPNx`, `target production`, **READY** |

Nothing needs rebuilding. **The domain needs repointing**, and that is the only thing between the
public and the app.

## Step 1 — stop the GoDaddy Website Builder answering (required either way)

This is first, and it is not optional for either host. While a Website Builder site is published on
`xoot.co.za`, GoDaddy keeps its own records on the apex and overwrites anything you point elsewhere.

1. **GoDaddy → My Products → Websites + Marketing** (it may be listed as *Website Builder*).
2. Find the site attached to **xoot.co.za**.
3. **Unpublish it**, or remove the domain from it. Deleting the site works too if you do not want it.

⚠️ **Do not skip to step 2.** If the builder site is still published, the DNS records you set will
either be reverted or ignored, and it will look like the new host is broken.

## Step 2 — choose the host, then set the records

Both work. Pick one and finish it — a half-moved domain is worse than either.

### Option A — Netlify (recommended if you want this live today)

**Why:** the Netlify project already builds this repo, already holds a correct production deploy of
`main`, already had the certificate issued for `xoot.co.za`, and `netlify.toml` is correct and
tested. There is nothing left to configure. It is the shortest path from here to a working site.

1. **[app.netlify.com/projects/xoot-home-care](https://app.netlify.com/projects/xoot-home-care)** →
   **Domain management** → **Production domains**.
2. `xoot.co.za` should already be listed. Netlify will show either its **nameservers** or the
   **DNS records** to set. Prefer the records — moving nameservers hands GoDaddy's whole zone to
   Netlify, which affects email as well as the website.
3. In **GoDaddy → Domains → xoot.co.za → DNS**, set exactly what Netlify shows. Typically:
   - the apex `@` as an **A record** to Netlify's load balancer IP, and
   - `www` as a **CNAME** to `xoot-home-care.netlify.app`.
4. **Delete any leftover A / CNAME / forwarding record for `@` or `www` that GoDaddy added for the
   Website Builder.** A stale record is what makes this look intermittent.

### Option B — Vercel (if you want Vercel to be the host)

1. **Vercel → xoot → Settings → Domains → Add** → `xoot.co.za`. Add `www.xoot.co.za` too.
2. Vercel then prints the exact records. Set them in **GoDaddy → Domains → xoot.co.za → DNS**.
3. ⚠️ **Vercel Authentication is ON**, scoped `all_except_custom_domains`. That is correct and should
   stay: previews stay behind a login wall and the custom domain is exempt. It also means a 401/403
   from `xoot.vercel.app` is **expected**, not a fault.
4. ⚠️ **The Vercel team is on the `hobby` plan**, which is Vercel's non-commercial tier. Taking
   payments on it is a terms question. Resolve it before launch spend, not after.

## Step 3 — prove it, rather than looking at the site and assuming

DNS takes minutes to hours. When it has propagated:

**Actions → *Verify live deploy* → Run workflow**, leaving `expected_commit` blank on `main`.

It polls `https://xoot.co.za/build-info.json` for the deployed commit for ~10 minutes, then runs
`verify-live-site.mjs` against the served site — CSP, HSTS, `noindex` on `/app` `/auth` `/admin`,
`/.well-known/` served as JSON, a real Supabase URL in the bundle, and **no service-role key** in it.

**Read the result, not the tick.** The run prints the first 400 bytes of the response when it cannot
read a stamp. If that body is a GoDaddy page again, step 1 did not take.
