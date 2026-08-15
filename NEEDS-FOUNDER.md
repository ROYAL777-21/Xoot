# Needs the founder

**Everything here is blocked on a human. Nothing here is blocked on a session.**

Each row says what it unblocks and how it is proven done — because an item with no closing condition
never gets closed, only re-read. Sessions add to this file and keep working; they do not stop to ask.

Last updated **2026-08-15**.

---

## ⏳ CI is down until the monthly reset — nothing to do, nothing to buy

**GitHub Actions stopped for this account on 2026-08-14 at 10:38Z and is still stopped.** Every job
fails 2–6 seconds after it is created, with no runner assigned and no logs, on every runner type.

**This is the Free plan's Actions allowance running out**, not a fault and not a setting. Free
includes **2,000 minutes a month for private repositories**, and minutes are billed by runner —
Linux 1×, **Windows 2×, macOS 10×**. It is not a spending limit that can be raised. It resets on the
**1st of the month**.

**No action is needed from you.** It is listed here only so nobody spends an afternoon debugging red
checks that have nothing to do with the code.

What was actually burning it, and what changed on 2026-08-15:

| | before | after |
|---|---|---|
| macOS Swift type-check | ran on **every** push, ~10 billed min | only when `native/ios/**` changes |
| `tests` + `semgrep` | ran **twice** per push (`push` *and* `pull_request` fired) | once |
| superseded runs | kept billing after the next push | cancelled |
| **estimated per push** | **~29 min** | **~8 min** |

Roughly 250 pushes a month inside the allowance, against roughly 70 before. **Estimated from
observed run durations and GitHub's published multipliers** — the usage API returns zeros for this
account, so these are not billed figures.

⚠️ **One behaviour change worth knowing:** pushing to a branch with **no open pull request** no
longer runs CI. Open the PR and it runs normally. Local `npx vitest run` is the fast loop.

**Proves it done:** the first green run after the reset. Nothing before that confirms it.

---

## 🔴 Blocking revenue

### 1. PayFast merchant credentials

The integration is built and tested. It cannot take a cent without these.

| secret | where it goes | where you get it |
|---|---|---|
| `PAYFAST_MERCHANT_ID` | Supabase → Edge Functions → Secrets, **both projects** | PayFast dashboard → Settings |
| `PAYFAST_MERCHANT_KEY` | same | same |
| `PAYFAST_PASSPHRASE` | same | PayFast → Settings → Security. **Set one** — the signature is materially weaker without it |

⚠️ **Different values per environment.** Staging should use PayFast's **sandbox** merchant, live
should use the real one. Sharing one merchant means a test payment appears in real books.

Also set, per environment:
- `PAYFAST_MODE` — `sandbox` or `live`. **Anything that is not exactly `live` means sandbox**, so
  the failure direction is a test payment rather than a real charge.
- `PAYFAST_PROCESS_URL` and `PAYFAST_VALIDATE_URL` — sandbox hosts on staging, live hosts on
  production. Defaults are in `supabase/functions/_shared/payfast.ts`; `PAYFAST_MODE` already picks
  the right one, so these are only needed to override.
- `PAYFAST_NOTIFY_URL` *(optional)* — where PayFast posts the ITN. Derived from `SUPABASE_URL` as
  `<project>/functions/v1/confirm-payment` when unset, which is right unless the functions sit
  behind a custom domain.
- **`XOOT_APP_ENV`** — set to `staging` on the staging project. ⚠️ Not currently set anywhere, and
  it is not cosmetic: `payment_provider_capabilities` has one row per environment, and an
  unlabelled deployment resolves to **`production`**. So a staging Edge Function reads
  *production's* readiness row — verifying PayFast on staging would not open staging, and approving
  production would open staging too. Neither bites today because every flag on both rows is false,
  but it is a money gate reading the wrong row.
- `PAYFAST_ALLOWED_IPS` *(optional, recommended)* — comma-separated. **Left empty the source check
  is skipped and logged**, deliberately: this environment's egress proxy blocks
  `developers.payfast.co.za`, so the list could not be read from the primary source, and a guessed
  list would reject genuine callbacks silently. Get the current list from PayFast's docs and paste
  it here — it is the one control this integration is missing.

**Proves it done:** a sandbox payment completes and `confirm-payment` records it. Then flip
`payments.provider_checkout` and `payments.hosted_checkout.payfast` on.

⚠️ **Both flags are needed AND the capability row.** `create-payment-session` requires evidence
(`payment_provider_capabilities.payfast` — every flag currently false) *and* intent (both controls,
currently false). Flipping the controls alone still refuses, with the reason in the response, so
the screen will tell you which one is missing rather than showing a dead button. Set
`hosted_checkout_enabled`, `webhook_signature_verified`, `callback_urls_verified` and
`reconciliation_verified` to true only once a sandbox payment has actually round-tripped — that row
is a claim someone verified it.

---

## 🔴 Blocking everything user-facing

### 2. Link the Netlify project to the repo

`xoot.co.za` serves a hand-uploaded `index.html` from **28 May 2026**. The project `xoot-home-care`
exists with the domain and certificate correctly attached, but it was never connected to the
repository — no commit ref, no committer, deploy source `api`. **No push has ever changed the live
site.**

Nothing merged since May is live: not the R39 fee, not Care+, not the rename, not voice, not the
security headers.

**→ Four screens: [`docs/release/domain-setup.md`](./docs/release/domain-setup.md)**

**Do not touch GoDaddy.** DNS and TLS are already right.

⚠️ **Linking was never sufficient, and this entry used to imply it was.** Netlify sets `CI=true`,
and `scripts/config/validate-public-env.mjs` fails outright when `CI` is set and `VITE_APP_ENV` is
not. `netlify.toml` set only `NODE_VERSION`, so **the very first push after linking would have
failed before compiling anything** — and every deploy preview on PR #42 did exactly that, four
commits running.

Fixed in code on 2026-08-13: `netlify.toml` now sets `VITE_APP_ENV` per context. **Deploy previews
build with no further action from you.** Production needs two more values, below.

### 2a. Two public values in Netlify's environment settings

Needed by the **production context only**. `VITE_APP_ENV = "production"` also requires real Supabase
public values, or the build fails with *"staging and production builds require real
VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY"*.

| variable | value |
|---|---|
| `VITE_SUPABASE_URL` | `https://mvlrkelahhsyjrwgsxaf.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | the `sb_publishable_…` key — Supabase → Settings → API |

Netlify → Site configuration → Environment variables, scoped to the **Production** context.

**Neither is a secret** — both ship inside the client bundle already. They are not committed
because the repo supplies them from variables rather than source, so a project reference changes in
one place rather than two.

**Proves it done:** Actions → *Verify live deploy* reports ✅. That also opens the §3b pricing gate,
which currently blocks production Edge Function deploys.

---

## 🟠 Blocking a feature each

### 3. Place the first two-party call

No call has been made on any surface, ever. Everything else about voice proves configuration; this
proves sound comes out.

Needs first: repository secret **`XOOT_CALL_TEST_PASSWORD`** (12+ characters, typeable on a phone).
The smoke accounts already have passwords nobody knows, and their `.local` addresses cannot receive
mail, so the reset flow can never work — see the walkthrough.

**→ [`docs/release/founder-walkthroughs.md`](./docs/release/founder-walkthroughs.md) §A**

**Proves it done:** Twilio Console → Monitor → Logs → Calls shows **two** legs in one conference.

### 4. Decide what SOS does, then it can be enabled (#36)

Four prerequisites, all decisions rather than settings. **Not enabled until all four are answered** —
every step has a failure mode where the button appears to work, and a person in trouble pressing
something that does nothing is worse than no button.

**→ [`docs/release/founder-walkthroughs.md`](./docs/release/founder-walkthroughs.md) §B**

### 5. Device verification on real hardware (#37)

Live Activities, widgets, Siri intents, push, deep links. No simulator tests these honestly.

**→ [`docs/release/founder-walkthroughs.md`](./docs/release/founder-walkthroughs.md) §C**

---

### 6. Invoice legal entity — set under the `XOOT_` names, not `ZOOT_`

`generate-booking-invoice` refuses outright when the legal entity is unset — *"invoice legal entity
is not configured"* — so **no completed booking produces an invoice until these are set.**

| secret | note |
|---|---|
| `XOOT_INVOICE_LEGAL_ENTITY` | registered business name |
| `XOOT_INVOICE_LEGAL_ENTITY_REGISTRATION` | company registration number |
| `XOOT_INVOICE_VAT_RATE` | `0` until VAT-registered |
| `XOOT_INVOICE_VAT_NUMBER` | **required** once the rate is above zero, enforced in code |

⚠️ **If you set these before 2026-08-13, you set them under `ZOOT_` and they are doing nothing.**
ZD-029 moved the names in the function and left `.env.example` and both setup docs on the old
spelling, so the documented setup configured four variables nothing read. Fixed in the same change
as this entry; the secrets themselves have to be re-set by hand on both projects.

Failing closed was the right direction — a South African tax invoice showing a blank legal entity
would be worse than no invoice — but it means the symptom is silence, not an error anyone sees.

**Proves it done:** a completed booking generates a PDF invoice carrying the entity name.

---

## 🟡 Before the first store submission

### 7. Provider consoles must learn the new app identity (ZD-028)

The scheme and bundle id **changed in code** and now need the same change in three consoles. Until
they match, native sign-in works only on the retained `zoot://` callback.

| what | where |
|---|---|
| Add `xoot://auth/callback` to the redirect allowlist | Supabase → Authentication → URL Configuration |
| Update the redirect URI / reversed-client id | Google Cloud OAuth client(s) |
| Update the bundle id, and Sign in with Apple if enabled | Apple Developer → Identifiers |
| **New identifier means new EAS credentials** | EAS — the old ones are bound to `za.co.zoothome.app` |

**Proves it done:** a native sign-in completes on a device build using `xoot://`.

---

## ⚪ Decisions in the tracker

No session should answer these alone. Each has its full reasoning on the issue.

| # | decision |
|---|---|
| [#33](https://github.com/ROYAL777-21/zoot-your-local-helpers/issues/33) | ZD-005 schema source of truth — four written migrations blocked behind it |
| [#38](https://github.com/ROYAL777-21/zoot-your-local-helpers/issues/38) | `--destructive` fails AA contrast, worse in dark mode |
| [#40](https://github.com/ROYAL777-21/zoot-your-local-helpers/issues/40) | long bookings pay R27.95/h — the ladder is sub-linear in hours |
| [#41](https://github.com/ROYAL777-21/zoot-your-local-helpers/issues/41) | 200 jobs to the 20% commission floor is roughly two years |

---

## ✅ Cleared — kept so nothing re-discovers them

- **`ENCRYPTION_KEY`** — set on both projects 2026-08-13, different values. ⚠️ **This does not close
  [#28](https://github.com/ROYAL777-21/zoot-your-local-helpers/issues/28), and the issue is right to
  still be open.** Its definition of done is a gate code stored *and read back* through the app,
  because Supabase never reads a secret value back — "reported set" is not "verified set".

  **That proof was impossible to obtain until now, for a second reason.** `sensitive-access-read`
  called `can_access_sensitive_data` with `p_actor_id`, a parameter it does not declare — PostgREST
  resolves an RPC by name **and** argument names, so the call never resolved and the endpoint
  answered 500 to every request. ZD-029 had also left the function's body querying `zooter_id` after
  the column became `xooter_id`. Both are fixed on this branch (`20260813220000` plus the
  `p_xooter_id` correction) and are **not on `main` and not deployed**. Nothing leaked — it failed
  closed — but no Xooter could read a gate code either, so a round-trip could not have succeeded no
  matter what the secret was set to.
- **`XOOT_TWILIO_ACCOUNT_SID` / `_AUTH_TOKEN`** — added; staging subaccount provisioned and proven by
  *Twilio self-test* run 16.
- **Staging Twilio separation** — done. Staging calls no longer bill the live account.
- **The production rename** — applied with its functions, consistent, 0 bookings at risk.
- **Credentials pasted 2026-08-07** — rotated.
- **GoDaddy DNS** — correct. The problem was never DNS.
- **The `zoot://` deep-link scheme (#34)** — changed 2026-08-13 in ZD-028 and merged to `main`.
  `mobile/app.config.ts` reads `scheme: ['xoot', 'zoot']`: `xoot` primary, `zoot` retained so links
  already in the wild keep resolving. The identifier moved to `za.co.xoot.app` in the same change.
  This file listed it as outstanding for a day after it shipped — a register that names a cleared
  blocker teaches people to skim it, which is the opposite of what it is for. What remains is the
  console side, now item 6 above.
- **The `payment_records` provider constraint** — `20260813180000` pinned `provider = 'payfast'`
  while the column default is `manual_pending`, so **no booking, Care+ signup, gift clean or fare
  split could be created on either project**. Fixed by `20260813200000` and applied to staging;
  production applies with the next `db-push`. No founder action, listed because it was live on
  production and anyone reading this during that window deserved to know.
