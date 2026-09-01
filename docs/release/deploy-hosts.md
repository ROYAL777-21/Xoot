# Deploy hosts — what every host needs before it can build

One page for every place Xoot ships from. **If a build fails on `config:check`, the answer is here.**

Written 2026-09-01 after the same bug failed a build on its third host.

---

## 0. The bug this page exists to end

`scripts/config/validate-public-env.mjs` refuses to build when `CI` is set and it cannot tell which
environment it is building. Every CI host sets `CI`. So every new host fails on that line, before
compiling anything, with a message that names an environment variable and nothing about the host:

```
Xoot environment configuration error: CI builds must set VITE_APP_ENV explicitly.
Error: Command "npm run build" exited with 1
```

It has happened three times.

| # | Host | When | Fixed by |
|---|---|---|---|
| 1 | GitHub Actions | — | Setting it in `tests.yml`, plus a comment |
| 2 | Netlify | 2026-08-13 | `netlify.toml`, plus `src/lib/netlify-build-env.test.ts` |
| 3 | **Vercel** | **2026-09-01**, commit `950dc5d` on `main` | This page, and the fix below |

Each fix was written into one host's file. The guard from step 2 watched `netlify.toml` **by name**,
so it passed green the entire time Vercel was failing. A per-host guard cannot catch a per-host bug.

**The fix is host-agnostic.** The validator now reads the host's own environment signal:

| Host | Signal | Production value | Everything else becomes |
|---|---|---|---|
| Vercel | `VERCEL_ENV` | `production` | `development` |
| Netlify | `CONTEXT` | `production` | `development` |
| EAS (native) | `EAS_BUILD_PROFILE` | `production` | per `eas.json` profile |

This is not a default — it is a derivation. **With no signal at all, it still fails**, because
guessing an environment is how a production build silently becomes a development one.

A preview is **never** derived as `production`. A preview built as production would point branch
code at the production Supabase project.

Guarded by `src/lib/deploy-host-config.test.ts` (web) and `src/lib/mobile-build-env.test.ts`
(native). Both run the real validators as subprocesses — a source-text assertion would pass while
the build failed, which is the shape of the bug.

---

## 1. Vercel — the current web host

`vercel.json` carries the build config, the SPA rewrite and the security headers. `VITE_APP_ENV` is
derived from `VERCEL_ENV`, so **there is nothing to set for gate one.**

### ⚠️ 2. What you must still set by hand

A production build derives `VITE_APP_ENV=production`, which makes `requiresRealSupabase` true. That
gate is deliberate and cannot be automated away: **a production site built without Supabase values
is a shell that cannot sign anyone in or take a booking, and it would deploy green.**

The project is **`xoot`** (`prj_tz7Ai5SwguPd645qBnnDn4wxu3Jw`), on team `royal777-21s-projects`,
linked to `ROYAL777-21/xoot-your-local-helpers`.

In **Vercel → xoot → Settings → Environment Variables**, tick **Production only**:

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://mvlrkelahhsyjrwgsxaf.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | the `sb_publishable_…` key from Supabase → Settings → API Keys |

**Use the `sb_publishable_…` key, not the legacy `eyJ…` anon JWT.** Both are public and both work —
the code makes no assumption about the format (`src/integrations/supabase/client.ts` passes the
string straight to `createClient`). Two reasons to prefer the publishable one:

1. **The legacy anon JWT trips this repo's secret scanner.** Its `eyJ…` shape matches the
   "Supabase service role JWT" pattern, which cannot distinguish an `anon` JWT from a
   `service_role` one by shape alone. `sb_publishable_…` is clean — verified, and deliberately so:
   the scanner's Supabase pattern matches only `sb_secret_` and `sb_service_role_`.
2. Supabase is migrating off legacy JWT keys.

Leave **Preview** and **Development** unset. They derive `development`, need no credentials, and
cannot reach the production project.

> **Why these are not committed.** Both are public values that already ship inside the client
> bundle, so this is not secrecy — it is that a project reference should live in one place. Putting
> them in `vercel.json`'s `build.env` would also hand them to **preview** builds, which is exactly
> the "a preview can never accidentally point at the production Supabase project" property
> `netlify.toml` was written to preserve.

### Prove it afterwards, rather than assuming

```bash
node scripts/ops/verify-live-site.mjs https://xoot.co.za
```

Checks the **served site**, not the config: CSP / HSTS / referrer / permissions headers, that a deep
link serves the SPA instead of a 404, that `/app`, `/auth` and `/admin` return `noindex`, that
`/.well-known/*` is served as JSON rather than rewritten to HTML, that the bundle carries a real
Supabase URL and publishable key — and that it carries **no service-role key**, which would be a
genuine incident rather than a misconfiguration.

Verified locally, exactly as Vercel runs it:

```bash
CI=1 VERCEL=1 VERCEL_ENV=production \
  VITE_SUPABASE_URL=https://mvlrkelahhsyjrwgsxaf.supabase.co \
  VITE_SUPABASE_PUBLISHABLE_KEY=<the publishable key> \
  npm run build
# → ✓ built in 10.86s
```

### 3. What `vercel.json` had to carry, that Netlify carried elsewhere

⚠️ **`public/_headers` is a Netlify file format. Vercel does not read it and does not warn.** Left
alone, the switch would have shipped xoot.co.za with **no CSP, no HSTS, and no `noindex` on `/app`,
`/auth` and `/admin`** — silently, on a green build. Every header is now mirrored into
`vercel.json`, and `scripts/security/assert-static-hosting-security.mjs` fails if they drift.

Also in `vercel.json`, each for a reason:

- **SPA rewrite** to `/index.html`, or every deep link 404s — including every link in a blog post.
- **`/.well-known/` excluded from that rewrite.** Rewriting it breaks iOS Universal Links and
  Android App Links, and it fails *silently*: the app just stops opening from links.
- **`buildCommand: "npm run build"`**, never `vite build` — `prebuild` is where the env check, the
  SEO validation and the native association files live.
- **`installCommand: "npm ci --no-audit --prefer-offline"`** for a deterministic install.

---

## 2. Netlify — still configured, not currently the live host

`netlify.toml` sets `VITE_APP_ENV` explicitly per context and is unchanged. Production needs the
same two Supabase values in Netlify's own environment settings. Kept working so the host switch is
reversible.

---

## 3. The native app — the silent version of the same bug

Found while fixing the web deploy, and **worse**, because it does not stop a deploy — it reaches a
store.

- `eas.json` sets `"environment": "production"` on the production profile. That selects which EAS
  **environment variables** to load. It does **not** set `EXPO_PUBLIC_APP_ENV`.
- `mobile/scripts/validate-env.ts` used to fall back to `development` when that was unset — and
  every real-Supabase assertion in it is gated behind `preview | staging | production`.
- `config:check` had **no `eas-build-*` hook**, so it never ran on an EAS build machine at all.

So `eas build --profile production` with the variable unset validated nothing, then built, signed
and submitted an app pointing at no backend.

**Both halves are fixed.** `EXPO_PUBLIC_APP_ENV` is derived from `EAS_BUILD_PROFILE`, and
`mobile/package.json` now has an `eas-build-post-install` hook that runs `config:check` on the build
machine. Local development is unchanged — with no EAS profile present it is still `development`.

### What you must set in EAS, per environment

In **Expo → Project → Environment Variables**, for `production` (and `preview` if you build it):

| Variable | Notes |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Must be a hosted `*.supabase.co` URL |
| `EXPO_PUBLIC_SUPABASE_PROJECT_ID` | Must equal the project ref inside that URL — the validator checks |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | The publishable / anon key |
| `EXPO_PUBLIC_EAS_PROJECT_ID` | Production only. Required for push and release tracing |

Until these are set, a production EAS build now **fails loudly** where it previously succeeded
silently. That is the intended change, and it is worth saying plainly: **this will stop your next
production app build until you fill these in.** A failed build you can fix in five minutes is the
cheaper outcome.

---

## 4. Adding a fourth host

1. Add its config file.
2. Add a row to `HOSTS` in `src/lib/deploy-host-config.test.ts`, with the env vars that host sets.
3. Run the suite. If it cannot resolve an environment, add the host's signal to
   `hostEnvironmentSignals` in `scripts/config/validate-public-env.mjs`.
4. If the host does not read `public/_headers`, mirror the headers into its config **and** extend
   `scripts/security/assert-static-hosting-security.mjs` — otherwise the site ships without them and
   nothing goes red.

Step 4 is the one that was missed. The build failure was loud; the missing headers would not have
been.
