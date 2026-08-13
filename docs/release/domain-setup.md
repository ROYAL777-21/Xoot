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

> **DNS is fine. Do not touch GoDaddy.** Netlify already reports `xoot.co.za` as the primary URL with
> `ssl_url: https://xoot.co.za`, so the domain and the certificate are both in place. The problem is
> entirely on the build side.

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
