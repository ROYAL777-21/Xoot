# Pointing xoot.co.za at Netlify

**This is the highest-value thing on the founder's list**, and it is not a cosmetic one. Two
separate guards are currently held shut by it:

| guard | what it does | state |
|---|---|---|
| *Verify live deploy* | fetches `xoot.co.za/build-info.json`, compares to the pushed commit | ❌ 7 runs, no stamp |
| §3b pricing gate in `deploy-edge-functions` | same file, compares `.pricingRule` and `.bookingFeeCents` | ❌ **blocks every production function deploy** |

They read the **same file**, so fixing the site opens both at once. Until then, production Edge
Functions cannot be deployed at all — which means the ZD-029 schema rename cannot go to production,
because that migration requires all 33 functions to be redeployed immediately after it.

---

## What we know, and what we do not

**Measured, seven times between 00:48Z and 02:06Z on 2026-08-13:** `https://xoot.co.za/build-info.json`
returns nothing a JSON parser can read. 84 fetches in total.

The stamp shipped in commit `d64f403` at 00:45Z. If anything had built and published since, that
file would exist — `netlify.toml`'s `/*` → `/index.html` rule has **no `force` flag**, and Netlify
serves a real file ahead of a non-forced redirect, so it would be reachable.

**What that does *not* tell us** is why. Build queued, build failing, branch unwired, or the domain
never pointed at Netlify in the first place — all four look identical from outside. No agent session
can tell them apart: outbound `CONNECT` to `xoot.co.za:443` is refused by the organisation's egress
policy (`connect_rejected`, gateway 403), and the Netlify dashboard needs your login regardless.

**The repo is configured for Netlify.** `netlify.toml` already carries the build command
(`npm ci --no-audit --prefer-offline && npm run build`), the publish directory (`dist`) and the SPA
redirect. Nothing in it needs changing.

> The repo also ships `public/.htaccess`, which `postbuild` copies into `dist` — an Apache file that
> Netlify ignores completely. It is a leftover from a Hostinger target. Harmless, and worth knowing
> so it does not read as evidence that Hostinger is the live host.

---

## Step 1 — find out whether a Netlify site exists

Sign in at **[app.netlify.com](https://app.netlify.com)** and look at your list of sites.

**If a site is already connected to `ROYAL777-21/zoot-your-local-helpers`:** open it, go to
**Deploys**, and read the most recent one. That single screen answers the question:

| what you see | what it means | what to do |
|---|---|---|
| Last deploy hours old, no recent attempts | the branch is not wired, or auto-publishing is off | step 2 |
| A **failed** deploy | the build broke — open it and read the log | send me the error; it is almost certainly fixable in the repo |
| Deploys succeeding, but the domain is not listed | Netlify is building but nothing points at it | step 3 |

**If no site exists**, create one: **Add new site → Import an existing project → GitHub →** pick the
repo. Netlify reads `netlify.toml`, so leave the build command and publish directory exactly as it
proposes them. Set the production branch to **`main`**.

⚠️ **Environment variables.** The build inlines `VITE_*` values at build time. Netlify needs the
same ones GitHub has under Settings → Variables — `VITE_SUPABASE_URL`,
`VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`, `VITE_PUBLIC_SITE_URL`,
`VITE_MAPBOX_PUBLIC_TOKEN`, `VITE_APP_ENV`, and the rest. **A build with these missing succeeds and
produces a site that cannot reach Supabase** — the failure is silent and looks like an app bug.
Copy them into **Site configuration → Environment variables** before the first deploy.

## Step 2 — make sure it builds `main` and publishes automatically

**Site configuration → Build & deploy:**

- **Production branch:** `main`
- **Auto publish:** enabled. If it is off, deploys build but never go live — which would explain
  every one of our seven measurements.
- **Build command / publish directory:** should already read from `netlify.toml`.

Then **Trigger deploy → Deploy site** and watch it finish once by hand.

## Step 3 — add the domain in Netlify first

**Domain management → Add a domain → `xoot.co.za`.** Netlify will say it does not control the DNS
yet and offer you two ways to fix that. **Take note of the exact values it shows you** — do not use
values from any guide, including this one, because Netlify assigns them per site.

Either option works. They differ in who runs your DNS:

|  | **Netlify DNS** (simpler) | **External DNS** (keep GoDaddy) |
|---|---|---|
| what you change at GoDaddy | the **nameservers** | two **records** |
| Netlify gives you | 4 nameservers, `dns1.p0x.nsone.net`-shaped | an `A` record IP and a `CNAME` target |
| HTTPS certificate | automatic | automatic, once DNS resolves |
| other records (email, etc.) | must be recreated in Netlify | untouched |

**If you have email on this domain, or any other DNS records, choose External DNS** — switching
nameservers moves *all* DNS to Netlify and anything you do not recreate stops working. For a domain
bought purely for this site, Netlify DNS is fewer moving parts.

## Step 4 — GoDaddy

Sign in → **My Products → Domains → `xoot.co.za` → DNS** (or *Manage DNS*).

**If you chose Netlify DNS:** find **Nameservers** → *Change* → *Enter my own nameservers* → paste
the four Netlify gave you, in order → Save. GoDaddy will warn you this moves DNS away; that is the
intent.

**If you chose External DNS:** in **DNS Records**, add or edit:

| Type | Name | Value | TTL |
|---|---|---|---|
| `A` | `@` | the IP Netlify showed you | 600 |
| `CNAME` | `www` | the `*.netlify.app` target Netlify showed you | 600 |

Delete GoDaddy's default parking records for `@` and `www` first — a leftover parking `A` record
alongside yours resolves round-robin, so the site works intermittently, which is far more confusing
to debug than it being plainly down.

⚠️ Do **not** use a `CNAME` on the root (`@`). It is invalid at the apex in ordinary DNS, and GoDaddy
will either refuse it or silently break mail routing. Root gets an `A` record.

## Step 5 — wait, then check

DNS propagation is typically minutes and can be up to 48 hours; GoDaddy's own TTL is the floor.
Netlify's Domain management page shows a green tick per hostname once it resolves, and issues the
Let's Encrypt certificate automatically after that.

**Then, and this is the proof:** GitHub → Actions → **Verify live deploy** → *Run workflow*.

- ✅ **green** — the site is serving the commit `main` is on. Both guards are now open. Tell me and
  I will take the ZD-029 rename to production.
- ➖ **"no build stamp"** — DNS resolves but the published build predates `write-build-info.mjs`.
  Trigger one more Netlify deploy from `main` and re-run.
- ❌ **wrong commit** — the site is serving something older. The run prints both SHAs; send them to
  me.

---

## What happens after it goes green

Nothing automatic, and deliberately so — a production deploy stays a human act. But the sequence
that is currently impossible becomes possible, in this order:

1. `db-push` → **production** (the ZD-029 migration)
2. `deploy-edge-functions` → **production**, function list **blank**, immediately after

Step 2 must follow step 1 without a gap: between them, every function is querying tables that have
been renamed out from under it. That is survivable only because no operational table has rows in it,
and that is the last moment it will be true.
