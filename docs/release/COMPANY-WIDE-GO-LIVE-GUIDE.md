# Xoot — the company-wide go-live guide

**One ordered list. Do it top to bottom.** Everything below is either yours or mine, and every step
says which, what to click, and what proves it worked.

Written 2026-09-02. **This guide does not hold any information of its own** — it sequences what the
registers already contain, because seven previous lists rotted by duplicating each other. Where a
step needs detail, it links.

---

## Read this first: why nothing you have done so far has appeared

`xoot.co.za` is served by the **GoDaddy Website Builder**. Not Vercel. Not Netlify.

```html
<meta name="generator" content="Starfield Technologies; Go Daddy Website Builder 8.0.0000"/>
```

Both hosts hold **correct, current production builds** and neither receives a single request. This
is why editing credentials in Vercel changed nothing a visitor sees — visitors never reach Vercel.

**Phase 1 is the whole unlock.** Almost nothing else can be verified until it is done.

---

## Phase 1 — Make the site reachable ⛔ YOURS · ~30 minutes

### Step 1.1 — Stop the GoDaddy builder answering

**GoDaddy → My Products → Websites + Marketing** (may be listed as *Website Builder*).
Find the site attached to `xoot.co.za` → **Unpublish it**, or remove the domain from it.

⚠️ **Do this before step 1.2.** While it is published, GoDaddy keeps its own apex records and
overwrites whatever you set. Skipping this makes the next step look broken.

### Step 1.2 — Point the domain at a host

**Pick one and finish it.** A half-moved domain is worse than either.

| | Netlify | Vercel |
|---|---|---|
| Already builds this repo | ✅ | ✅ |
| Certificate already issued for `xoot.co.za` | ✅ | ❌ |
| Work left | none, just DNS | add domain first |
| Plan issue | none | ⚠️ Hobby tier is non-commercial |

**Netlify is the shorter path.** You said Vercel; both work. Full click-paths for each:
[`domain-setup.md` → *Point the domain at the app*](./domain-setup.md).

**GoDaddy → Domains → xoot.co.za → DNS.** Set exactly what the host shows you. Then **delete any
leftover `@` or `www` A / CNAME / forwarding record** GoDaddy added for the builder — a stale record
is what makes this look intermittent.

### Step 1.3 — Prove it ✅ MINE

**Actions → *Verify live deploy* → Run workflow.** It polls `xoot.co.za/build-info.json` for ~10
minutes, then runs the header and routing checks against the served site.

**Proves it done:** "Live site is serving this commit". If it prints a GoDaddy body again, step 1.1
did not take.

---

## Phase 2 — Unblock the backend ⛔ ONE FIELD IS YOURS · ~5 minutes

### Step 2.1 — Add one Actions secret ⛔ YOURS

**GitHub → Settings → Secrets and variables → Actions → New repository secret**

| Name | Value |
|---|---|
| `SUPABASE_DB_PASSWORD_PRODUCTION` | The database password for `mvlrkelahhsyjrwgsxaf` — **Supabase → Project Settings → Database**. Reset it there if it is not written down; nothing else uses it |

⚠️ **Do not touch the existing `SUPABASE_DB_PASSWORD`.** That value is *staging's*, staging works
with it, and overwriting it trades one broken environment for another.

**Why this is needed:** one secret was serving both projects while the project ref switched. A
Postgres password belongs to one server, so production has **never** been reachable through
`db-push` — it returns `SQLSTATE 28P01`. Detail: [`founder-todo.md` §0a](./founder-todo.md).

### Steps 2.2–2.5 — Everything downstream ✅ MINE, and already rehearsed

I run these in order the moment 2.1 exists. **Staging has already been through this exact sequence
and came out clean**, so this is a repeat, not an experiment:

```
Deployed vs repo — staging (fxmxyabdjqviqbcxmvlp)
0 stale, 51 in step, of 51 deployed.
```

| Step | What | Why in this order |
|---|---|---|
| 2.2 | `db-push` → production | Four migrations behind, including one that restores the signup trigger |
| 2.3 | `verify-types` → production | Confirms the schema contract finally matches |
| 2.4 | `deploy-edge-functions` → production | **51 of 57 deployed functions are stale.** Each carries its own frozen `_shared` from 13 August |
| 2.5 | *Retire orphaned functions* → production | Six pre-rename functions still live with no source in the repo |

⚠️ **2.2 must precede 2.4.** `go-live.md` §3a — migrations before functions, derived from a real
failure. Deploying 51 functions against a schema production does not have is what that rule exists
to prevent.

---

## Phase 3 — Make money work ⛔ YOURS · the last hard gate

### Step 3.1 — PayFast merchant credentials

Three secrets in **Supabase → Edge Functions → Secrets**, on **both** projects, with **different
values per environment** — sandbox on staging, live on production. Sharing one merchant means a test
payment appears in real books.

| Secret | Where it comes from |
|---|---|
| `PAYFAST_MERCHANT_ID` | PayFast dashboard → Settings |
| `PAYFAST_MERCHANT_KEY` | same |
| `PAYFAST_PASSPHRASE` | PayFast → Settings → Security. **Set one** — the signature is materially weaker without it |
| `PAYFAST_MODE` | `sandbox` on staging, `live` on production. Anything not exactly `live` means sandbox |
| `XOOT_APP_ENV` | **`staging` on the staging project.** Unset resolves to `production`, so staging reads production's readiness row |

**Proves it done:** a sandbox payment round-trips and `confirm-payment` records it. Only then flip
`payments.provider_checkout` and `payments.hosted_checkout.payfast` on. Full detail and the
capability-row mechanics: [`NEEDS-FOUNDER.md` §1](../../NEEDS-FOUNDER.md).

### Step 3.2 — Invoice legal entity

`generate-booking-invoice` **refuses outright** when unset, so no completed booking produces an
invoice until these exist.

| Secret | Note |
|---|---|
| `XOOT_INVOICE_LEGAL_ENTITY` | Registered business name |
| `XOOT_INVOICE_LEGAL_ENTITY_REGISTRATION` | Company registration number |
| `XOOT_INVOICE_VAT_RATE` | `0` until VAT-registered |
| `XOOT_INVOICE_VAT_NUMBER` | Required once the rate is above zero, enforced in code |

⚠️ **If you set these before 2026-08-13 you set them under `ZOOT_` and they are doing nothing.**

---

## Phase 4 — The mobile app ⛔ YOURS

### Step 4.1 — Four Expo variables

**Expo → Project → Environment Variables**, for `production` (and `preview` if you build it):
`EXPO_PUBLIC_SUPABASE_URL`, `_PROJECT_ID`, `_PUBLISHABLE_KEY`, `_EAS_PROJECT_ID`.

⚠️ **A production EAS build now fails until these exist.** That is the intended change — it
previously succeeded silently while pointing at no backend. Verified today:
`EXPO_PUBLIC_SUPABASE_URL must be a real value for production builds`.

### Step 4.2 — Three association variables, or deep links break silently

Set in the **web host's** build environment: `XOOT_APPLE_TEAM_ID`, `XOOT_IOS_APP_ID`,
`XOOT_ANDROID_SHA256_CERT_FINGERPRINTS`.

**Measured today on a local production build:** `dist/.well-known/` is never created, so iOS
Universal Links and Android App Links have **no association file at all** and those paths fall
through the SPA rewrite to HTML. This breaks deep links the day the app ships, and nothing warns.

### Step 4.3 — Three consoles must learn the new app identity

The scheme and bundle id changed in code (ZD-028) and need the same change in:
Supabase → Auth → URL Configuration (`xoot://auth/callback`); Google Cloud OAuth client;
Apple Developer → Identifiers. **New identifier means new EAS credentials.**

---

## Phase 5 — Voice and safety ⛔ YOURS

| Step | What | Proves it |
|---|---|---|
| 5.1 | Repository secret `XOOT_CALL_TEST_PASSWORD` (12+ chars, typeable on a phone) | — |
| 5.2 | Place the first two-party call | Twilio Console → Monitor → Logs → Calls shows **two legs in one conference** |
| 5.3 | Answer SOS's four prerequisites | All four answered before the button is enabled |

⚠️ **Before spending on masked calling:** it is built on Twilio's **Proxy** API, which Twilio has
signalled end-of-life for. If retired, this needs rebuilding on Voice + TwiML — a design decision,
not a config change. Walkthroughs: [`founder-walkthroughs.md`](./founder-walkthroughs.md).

---

## Phase 6 — Legal and commercial decisions ⛔ YOURS

| # | Decision | Why it cannot wait |
|---|---|---|
| 6.1 | **Are Xooters employees or independent contractors?** | Undefined anywhere in this repo. Under **LRA s200A** a person below the BCEA threshold is *presumed* an employee if any of seven factors applies, and the burden of rebutting is yours. **Both the recruitment ad and the school proposal are blocked on this** |
| 6.2 | Vercel Hobby → Pro, if Vercel serves the domain | Hobby is the non-commercial tier and you intend to take payments |
| 6.3 | [#33](https://github.com/ROYAL777-21/zoot-your-local-helpers/issues/33) · [#38](https://github.com/ROYAL777-21/zoot-your-local-helpers/issues/38) · [#40](https://github.com/ROYAL777-21/zoot-your-local-helpers/issues/40) · [#41](https://github.com/ROYAL777-21/zoot-your-local-helpers/issues/41) | Schema source of truth, contrast failure, the long-booking rate, the commission floor timeline |

---

## Phase 7 — Instrumentation ✅ MINE, once phases 1–3 are done

Analytics with referrer host, crash reporting, server-side funnel events, Search Console, and
"how did you hear about us?" at booking.

**Attribution before acquisition.** Two independent arguments agree: this repo has no analytics and
~0 rows, so every dashboard before this reports zeros; and Hormozi refuses to build a new
acquisition channel while existing ones are unmeasured.

---

## Phase 8 — Supply, then demand ⛔ YOURS, and the expensive one to skip

| Step | What |
|---|---|
| 8.1 | **Named, activated Xooters in each launch suburb** — before any demand campaign |
| 8.2 | 10–20 friendly bookings: real reviews, real photography, real numbers |

**The number behind this:** bad word of mouth means reaching **three times as many people** to get
the same customer, because two of the three who would have bought heard something negative first.
In three suburbs with a WhatsApp-dense market that is conservative. Source and reasoning:
[`growth-levers-2026.md`](../marketing/growth-levers-2026.md).

**Recruitment materials are written and waiting:**
[`xooter-hiring-ad.md`](../marketing/xooter-hiring-ad.md) (LinkedIn + Indeed) and
[`cleaning-school-partnership-proposal.md`](../marketing/cleaning-school-partnership-proposal.md).
Both are blocked on 6.1, and both are materially stronger after 8.2.

---

## Phase 9 — Launch content ✅ MINE to draft, YOURS to approve

TikTok primary, Instagram secondary, **sequential not parallel**. Creative is built:
[`ad-matrix-and-avatars.md`](../marketing/ad-matrix-and-avatars.md) — four avatars, five hook
families, six form factors, a six-cell test grid.

Founder account: [`x-drafts-week-one.md`](../marketing/x-drafts-week-one.md), all
`VOICE: UNCALIBRATED`, each marked `APPROVE / EDIT / KILL`. **Fix the `@TheRealSkosana` bio first** —
at 1 follower it converts more profile visits than any post will.

⛔ **Nothing is ever posted without you approving that exact text.**

---

## The one-page version

| Phase | Owner | Blocks |
|---|---|---|
| **1. GoDaddy DNS** | ⛔ **You** | **Everything.** Nobody can reach the app |
| **2. `SUPABASE_DB_PASSWORD_PRODUCTION`** | ⛔ **You**, then me | The whole backend — 51 stale functions, 4 unapplied migrations |
| **3. PayFast + invoice entity** | ⛔ You | Taking money at all |
| 4. App variables and consoles | ⛔ You | Any production app build |
| 5. Voice and SOS | ⛔ You | Two features |
| 6. Employment classification | ⛔ You | All recruitment material |
| 7. Instrumentation | ✅ Me | Knowing whether anything works |
| 8. Supply, then bookings | ⛔ You | Launch, honestly |
| 9. Content | ✅ Me to draft | — |

**Phases 1 and 2 together are about 35 minutes of your time, and they unblock everything I am
currently holding.**
