# Xoot: everything that needs you, in order

**Canonical as of 2026-08-21.** This is the single ordered list of what only you can do. It replaces
scattered "founder" sections in five other documents — they keep their reasoning and history, but
this file is the answer to *"what do I do next?"*

**It is not 8 items. It is 22, across 6 phases**, plus six decisions. An earlier summary named 8;
that was the critical path, not the set. The count in that sentence and the rows in the table below
are checked against each other by `src/lib/founder-guide-integrity.test.ts` — I wrote 21 first and
the test caught it, which is the same mistake one order of magnitude smaller.

**Phone-readable version:** <https://claude.ai/code/artifact/3f6cb715-cc40-4ce4-8d21-2d41bfa13175>
— same content, with tick boxes that save in your browser and copy buttons on every command. This
markdown file stays canonical; the page mirrors it.

## How to use this

Do the phases in order. Inside a phase, order does not matter. Every item has:

- **Blocks** — what stays broken until it is done
- **Do this** — the exact click-path or command
- **Proves it done** — how you know, not how you hope
- **If you skip it** — what actually breaks

> **Never paste a secret into a chat, an issue, or this file.** Everything below names *what* to set
> and *where*. Values go straight into the provider console. Credentials pasted into chat on
> 2026-08-07 are treated as compromised and are item 3.6.

---

## The one-page version

| # | item | phase | ~time |
|---|---|---|---|
| 1.1 | Run `db-push` — 7 migrations waiting | 1 | 10 min |
| 1.2 | Link Netlify to the repo | 1 | 10 min |
| 1.3 | Two Netlify production env vars | 1 | 5 min |
| 2.1 | PayFast merchant credentials | 2 | 20 min |
| 2.2 | Flip the three payment controls | 2 | 5 min |
| 2.3 | Pay one sandbox booking end to end | 2 | 30 min |
| 3.1 | `ENCRYPTION_KEY` on both projects (#28) | 3 | 10 min |
| 3.2 | Retire 6 orphaned Edge Functions | 3 | 5 min |
| 3.3 | `XOOT_APP_ENV=staging` on staging | 3 | 2 min |
| 3.4 | Invoice legal entity | 3 | 10 min |
| 3.5 | Dismiss 2 by-design Supabase advisors | 3 | 2 min |
| 3.6 | Rotate the 2026-08-07 credentials | 3 | 20 min |
| 4.1 | Twilio account credentials as repo secrets | 4 | 10 min |
| 4.2 | Twilio production: number, Proxy service, senders | 4 | 1–3 days* |
| 4.3 | Place the first two-party call | 4 | 30 min |
| 4.4 | Decide and activate SOS (#36) | 4 | 1 hr |
| 5.1 | Register the production domain | 5 | 1 day* |
| 5.2 | Cloudflare zone | 5 | 30 min |
| 5.3 | Restricted Mapbox tokens | 5 | 15 min |
| 5.4 | Apple / Google / EAS credentials | 5 | 2–5 days* |
| 5.5 | Provider consoles learn `xoot://` (ZD-028) | 5 | 30 min |
| 5.6 | Device verification on real hardware (#37) | 5 | 2 hr |
| 6.x | Six decisions | 6 | — |

\* mostly waiting on someone else's approval, not your time.

---

# Phase 1 — nothing else works until these

## 1.1 Run the database migration push

**Blocks:** everything. Seven migrations are written, reviewed and verified; none is applied.

| version | what it does |
|---|---|
| `20260814230000` | renames the half-renamed `analytics_contractor_quality` output column |
| `20260820120000` | revokes 34 client write grants no policy can satisfy |
| `20260820130000` | stops **any signed-in user** filing untraceable rows into the admin review queue |
| `20260820140000` | takes `anon`'s INSERT/UPDATE/DELETE off `booking_tips`, a money table |
| `20260820150000` | comments the three payout tables where `xooter_id` means `auth.users` |
| `20260820160000` | re-revokes grants a view rebuild handed back on a gate-code view |
| `20260821090000` | renames the last 180 `zoot`-named constraints, indexes, policies and triggers |

`20260815150000` and `20260815160000` are already applied; `db push` skips them by version.

**Do this**

1. GitHub → **Actions** → **Database migration push** → *Run workflow*.
2. First run: `environment` = **staging**, `dry_run` = **ticked**. Read the plan.
3. Second run: `environment` = **staging**, `dry_run` = **unticked**.
4. Third run: `environment` = **production**, `dry_run` = **ticked**.
5. Fourth run: `environment` = **production**, `dry_run` = **unticked**, and type
   `mvlrkelahhsyjrwgsxaf` into `confirm_project_ref`.

⚠️ **Actions minutes.** The GitHub Free allowance for private repos resets on the 1st. If runs are
refused with no logs and `runner_id: 0`, the allowance is spent — that is not a broken workflow, and
it cannot be bought back on Free.

**Proves it done** — run this in the Supabase SQL editor:

```sql
select count(*) as should_be_zero from (
  select 1 from pg_constraint where conname like '%zoot%'
    and connamespace in ('public'::regnamespace,'private'::regnamespace)
  union all select 1 from pg_indexes  where schemaname in ('public','private') and indexname like '%zoot%'
  union all select 1 from pg_policies where schemaname in ('public','private') and policyname like '%zoot%'
  union all select 1 from pg_trigger  where not tgisinternal and tgname like '%zoot%'
) t;
```

Zero. And **Actions → Verify generated types match the live schema** goes green — it has been red for
weeks for exactly this reason.

**If you skip it:** the write-grant lockdown never applies, and the type check stays red.

---

## 1.2 Link the Netlify site to the repository

**Blocks:** the entire live site. `xoot.co.za` currently serves a hand-uploaded `index.html` from
**28 May**. Nothing merged since then has ever been live.

Read from the Netlify API 2026-08-13:

```
published_at   2026-05-28T19:47:45Z
title          "Deploy triggered by upload"
deploy_source  "api"      commit_ref  null
```

**Do this:** Netlify → your site → **Site configuration → Build & deploy → Continuous deployment →
Link repository** → GitHub → `ROYAL777-21/zoot-your-local-helpers` → branch `main`. Build command and
publish directory come from `netlify.toml`; do not override them.

Full click-path with screenshots: [`domain-setup.md`](./domain-setup.md).

**Proves it done:** a new deploy appears with a real `commit_ref`, and the deploy log shows
`npm ci && npm run build` rather than "1 new file uploaded".

**If you skip it:** every UI change, price fix and legal-wording change stays invisible to customers.

---

## 1.3 Two public values in Netlify's environment settings

**Blocks:** the **production** Netlify build only. Deploy previews already build without this.

`netlify.toml` sets `VITE_APP_ENV` per context. Production additionally needs real Supabase values,
because `VITE_APP_ENV = "production"` makes `requiresRealSupabase` true in
`scripts/config/validate-public-env.mjs`.

**Do this:** Netlify → **Site configuration → Environment variables** → add, scoped to
**Production** only:

| name | where to get it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API → **anon / publishable** key |

Both are public values — they ship in the browser bundle by design. They are not committed because
they differ per environment, not because they are secret.

**Proves it done:** a production deploy completes. If it fails with
`CI builds must set VITE_APP_ENV explicitly`, the context scoping is wrong.

**If you skip it:** production builds fail; previews keep working, which makes it look fine.

---

# Phase 2 — money

> Until 2.3 has completed once, the PayFast integration is written and internally consistent but
> **unproven**. Do not describe payments as working before then.

## 2.1 PayFast merchant credentials

**Blocks:** all revenue. The app cannot take money.

**Do this:** Supabase Dashboard → **Edge Functions → Secrets**, on **staging first**:

| secret | sandbox value source |
|---|---|
| `PAYFAST_MERCHANT_ID` | PayFast sandbox account |
| `PAYFAST_MERCHANT_KEY` | PayFast sandbox account |
| `PAYFAST_PASSPHRASE` | the passphrase you set in PayFast |
| `PAYFAST_MODE` | `sandbox` |

`PAYFAST_PROCESS_URL`, `PAYFAST_VALIDATE_URL`, `PAYFAST_NOTIFY_URL` and `PAYFAST_ALLOWED_IPS` have
working defaults — set them only if PayFast tells you otherwise.

Repeat with live credentials on production **only after 2.3 passes on staging**.

**Proves it done:** **Actions → Verify Edge Function secrets** reports them present. It cannot show
you the values — Supabase never reads a secret back — so "reported set" is not "verified correct"
until a payment completes.

**If you skip it:** the Pay button reaches PayFast and PayFast rejects the signature.

---

## 2.2 Flip the three payment controls

**Blocks:** checkout, even with credentials set. These are deliberately separate from the secrets:
credentials are capability, controls are **intent**.

**Do this** — Supabase SQL editor, **staging only** at this stage:

```sql
-- 1. the master switch
update public.admin_controls set enabled = true where key = 'payments.provider_checkout';
-- 2. the per-provider switch
update public.admin_controls set enabled = true where key = 'payments.hosted_checkout.payfast';
-- 3. the provider's own readiness row
update public.payment_provider_capabilities
   set hosted_checkout_enabled = true
 where provider = 'payfast' and environment = 'staging';
```

**Proves it done:** the Pay button no longer returns
`payments.provider_checkout is switched off`.

**If you skip it:** `payment-provider-gate.ts` refuses every checkout, correctly.

---

## 2.3 Pay one sandbox booking, end to end

**Blocks:** any honest claim that payments work.

**Do this**, on staging, in order — each step must actually happen:

1. Create a booking as a customer.
2. Press Pay. The form posts to PayFast.
3. PayFast **accepts the signature** (a mismatch here means the passphrase is wrong).
4. Complete the sandbox payment.
5. The ITN callback reaches `confirm-payment`.
6. The booking reaches status `payment_confirmed`.

**Proves it done:**

```sql
select id, status, provider, amount_cents
  from public.payment_records order by created_at desc limit 5;
```

A row with `provider = 'payfast'` and the booking at `payment_confirmed`.

**If you skip it:** you find out in production, with a real customer's money.

---

# Phase 3 — clean up the live surface

## 3.1 `ENCRYPTION_KEY` on both projects ([#28](https://github.com/ROYAL777-21/zoot-your-local-helpers/issues/28))

**Blocks:** gate and alarm code storage. Customers cannot save an access code; the function fails
loudly.

**Do this:** generate a **different** value per project and set it in Supabase → Edge Functions →
Secrets:

```bash
npm run ops:supabase:encryption-key -- -ProjectRef fxmxyabdjqviqbcxmvlp   # staging
npm run ops:supabase:encryption-key -- -ProjectRef mvlrkelahhsyjrwgsxaf   # production
```

**Proves it done:** save a gate code on a booking, then read it back through the app. **Reading it
back is the test** — Supabase never reads a secret value back, so "reported set" has been wrong here
before. #28 stays open until a code round-trips.

**If you skip it:** the sensitive-access feature is dead, silently for the customer.

---

## 3.2 Retire the six orphaned Edge Functions

**Blocks:** nothing today — but six pre-rename functions are **live and callable** with no source in
the repo, each carrying a frozen copy of pre-rename shared code:

```
admin-reject-zooter   approve-zooter        get-zooter-job-cards
redeem-zootcred       respond-zooter-job    submit-zooter-application
```

Verified still ACTIVE on production 2026-08-21.

**Do this:** Actions → **Retire orphaned Edge Functions**.
Staging: `dry_run` ticked, then unticked. Production: same, and type `mvlrkelahhsyjrwgsxaf`.

⚠️ **Do 1.2 first.** The live site is the 28 May bundle, which predates the rename. If anything in it
calls the old names, deleting them breaks the live site. Once the site builds from this repo, that
risk is gone. Deletion cannot be undone — there is no source to redeploy from.

**Proves it done:** the workflow's final step lists deployed functions and fails if any name matches
`zooter` or `zootcred`.

---

## 3.3 `XOOT_APP_ENV=staging` on the staging project

**Blocks:** correct environment separation for the money gate.

`getEdgeEnvironment()` falls back to `"production"` when unset, and
`payment_provider_capabilities` has one row per environment — so an unlabelled staging deployment
reads **production's** readiness row. Every flag on both rows is false today, so it is not currently
exploitable. It is still a money gate answering about the wrong environment.

**Do this:** Supabase → staging project → Edge Functions → Secrets → `XOOT_APP_ENV` = `staging`.
Leave production unset or `production`.

**Proves it done:** staging's checkout reads the staging capability row — flip staging's row only and
confirm production is unaffected.

---

## 3.4 Invoice legal entity

**Blocks:** legally correct invoices. These changed prefix from `ZOOT_` to `XOOT_`; the old names are
ignored.

**Do this:** Supabase → Edge Functions → Secrets, both projects:

| secret | value |
|---|---|
| `XOOT_INVOICE_LEGAL_ENTITY` | the registered company name |
| `XOOT_INVOICE_LEGAL_ENTITY_REGISTRATION` | CIPC registration number |
| `XOOT_INVOICE_VAT_NUMBER` | VAT number, or leave unset if not registered |
| `XOOT_INVOICE_VAT_RATE` | `15` for South Africa, or unset if not VAT registered |

**Proves it done:** generate an invoice and read the entity block on the PDF.

**If you skip it:** invoices go out with placeholder or missing entity details.

---

## 3.5 Dismiss the two by-design Supabase advisors

**Do this:** Supabase → **Advisors** → dismiss the findings on `set_safety_pin` and
`user_safety_pins`. Both are intentional; no MCP tool can dismiss them.

**Proves it done:** the advisor list is clean, so a real finding is visible next time.

---

## 3.6 Rotate the credentials pasted into chat on 2026-08-07

**Blocks:** nothing visible. Treat anything pasted into a chat as public permanently.

**Do this:** in each issuing provider console, rotate and revoke the old value. Includes the
OpenRouter key — `OPENROUTER_API_KEY` must come from Edge Function secrets, never from a pasted
value.

**Proves it done:** the old values are rejected by the provider.

---

# Phase 4 — voice and safety

## 4.1 Twilio account credentials as repository secrets

**Blocks:** 4.2 entirely — the staging subaccount cannot be provisioned without them.

**Do this:** GitHub repo → **Settings → Secrets and variables → Actions**:
`XOOT_TWILIO_ACCOUNT_SID`, `XOOT_TWILIO_AUTH_TOKEN`.

**Proves it done:** **Actions → Provision the staging Twilio subaccount** passes its credential check.

⚠️ `scripts/ops/create-staging-twilio-subaccount.mjs` prints a secret Twilio shows exactly once. Run
it in a terminal, never wrapped in a workflow, or it lands in a retained log.

---

## 4.2 Twilio production configuration

**Blocks:** masked calling and WhatsApp. Measured: `twilio.masked_voice` = false,
`twilio.operational_messages` = false, and the code requires **both**.

**Do this:** upgrade the Twilio account, get a South African number, create a **Proxy Service with a
number pool**, create a transactional Messaging Service, and register the WhatsApp sender
(regulatory approval takes days).

⚠️ **Confirm before spending.** The implementation uses the Twilio **Proxy** API, which Twilio has
signalled end-of-life for. I could not verify its current status. If it is retired, masking needs
rebuilding on Voice + TwiML dial-out against a caller-ID pool — a design decision, not config. That
is issue [#32](https://github.com/ROYAL777-21/zoot-your-local-helpers/issues/32).

⚠️ Recording and transcription are hard-coded `false` in both callers. **Leave them off** — turning
them on without a consent flow is a RICA/POPIA problem.

**Proves it done:** **Actions → Twilio self-test** green, and both controls true.

---

## 4.3 Place the first two-party call

Full walkthrough, already written: [`founder-walkthroughs.md`](./founder-walkthroughs.md) §A — arm
the booking, read the run summary, sign in on both devices, allow the microphone, press call.

**Proves it done:** two people hear each other. Never been done on any surface.

---

## 4.4 Decide what SOS does, then activate it ([#36](https://github.com/ROYAL777-21/zoot-your-local-helpers/issues/36))

**Ships dark on purpose.** `src/lib/sos-session.ts` and the button render nothing until
`SAFETY_READINESS === "live"`, and `safety.test.ts:181` pins that deliberately.

**Do not just flip the constant.** The rule `safety.ts` sets is that no safety promise may be shown
before the thing it promises works. The sequence — decide behaviour, make the notification path real,
get the wording legally safe, test on a real device from a real booking, *then* change the constant —
is [`founder-walkthroughs.md`](./founder-walkthroughs.md) §B.

**Proves it done:** an ops person actually receives an alert raised from a real handset.

---

# Phase 5 — iOS and Android to the stores

> None of this was in the earlier list of 8. It is the longest-lead phase — start 5.1 and 5.4 early,
> they are mostly waiting.

## 5.1 Register the production domain

**Blocks:** 5.2, TLS, OAuth redirect origins, sender-domain DNS, App Links and Universal Links.
Everything with a URL in it waits here.

**Proves it done:** the domain resolves and you control its DNS.

## 5.2 Cloudflare zone

**Do this:** create the zone, move nameservers, issue a scoped API token with zone-management
permission.

**Proves it done:** `scripts/ops/verify-production-readiness.ps1 -IncludeExternal` passes the
Cloudflare check from an authenticated ops shell.

## 5.3 Restricted Mapbox tokens

**Do this:** three least-privilege tokens — browser (URL-restricted), native, and build-download.
Never one token for all three.

**Proves it done:** maps render on web and native with the restricted tokens.

## 5.4 Apple, Google and EAS release credentials

**Blocks:** any build reaching a device or a store.

**Do this:**
1. Apple Developer Program membership (annual, can take days to verify).
2. Google Play Console account (one-off fee; identity verification).
3. EAS credentials — signing certificates, provisioning profiles, Android keystore.
4. Privacy declarations on both stores — the app collects location, contact details and payment data.
5. App Store and Play listings.

⚠️ Legal review of the privacy declarations before submission; POPIA and the store policies are not
the same requirement.

**Proves it done:** an internal-distribution build installs on a real device from TestFlight and from
Play internal testing.

## 5.5 Provider consoles learn the new app identity (ZD-028)

**Blocks:** sign-in on native, and every deep link.

Decided and shipped in code 2026-08-13: scheme `xoot://` primary (`zoot://` retained), bundle
identifier `za.co.xoot.app`. **The consoles do not know yet.**

**Do this:** update the redirect URIs and bundle identifiers in Google Cloud Console (OAuth), Apple
Developer (App IDs, Associated Domains), and Supabase → Authentication → URL Configuration
(redirect allowlist).

**Proves it done:** Google sign-in completes on a real device, and an `xoot://` link opens the app.

## 5.6 Device verification on real hardware ([#37](https://github.com/ROYAL777-21/zoot-your-local-helpers/issues/37))

Simulators are not sufficient for any of it. Step by step:
[`founder-walkthroughs.md`](./founder-walkthroughs.md) §C — cold launch, deep link, push
notifications, Live Activities and widgets (iOS), Siri intents (iOS).

**Proves it done:** each surface opened once, on hardware, and reported back.

---

# Phase 6 — decisions, not clicks

These need a decision. They live in the tracker with full reasoning.

| # | decision |
|---|---|
| [#33](https://github.com/ROYAL777-21/zoot-your-local-helpers/issues/33) | ZD-005 schema source of truth |
| [#38](https://github.com/ROYAL777-21/zoot-your-local-helpers/issues/38) | `--destructive` fails AA contrast, worse in dark mode |
| [#40](https://github.com/ROYAL777-21/zoot-your-local-helpers/issues/40) | long bookings pay R27.95/h — the ladder is sub-linear |
| [#41](https://github.com/ROYAL777-21/zoot-your-local-helpers/issues/41) | 200 jobs to reach the 20% commission floor is roughly two years |
| [#32](https://github.com/ROYAL777-21/zoot-your-local-helpers/issues/32) | voice: Proxy EOL, and whether to keep the PSTN fallback |
| — | **four trust claims the homepage states as fact** — `NEEDS-FOUNDER.md` §4. Say yes or no before the site goes live; under the Consumer Protection Act a stated fact is a promise |

---

## Deliberately deferred

**Leaked-password protection** — off, by your decision. Supabase → Authentication → Policies can turn
it on whenever you want. Recorded so it is not rediscovered as an oversight.

---

## What is already done, so nobody re-does it

- Production schema carries ZD-029; Edge Functions were redeployed with it.
- The three payment functions deployed together 2026-08-15 15:40 UTC, and **no function source has
  changed since** — nothing is carrying a stale `_shared` copy.
- `20260814170000` is applied.
- The seven `admin-*` functions were redeployed 2026-08-12/13/15. `blocker.md` lists this as OPEN
  from 2026-08-08; that entry is stale.
- `ALLOWED_ORIGINS` set and verified live on both projects.
- Client and server pricing agree, and the R39 fee shows on both price screens.
- `netlify.toml` sets `VITE_APP_ENV` per context — before that fix no Netlify build had ever
  succeeded.

## Where the detail lives

| file | still the best source for |
|---|---|
| [`founder-walkthroughs.md`](./founder-walkthroughs.md) | step-by-step for the call, SOS and device verification |
| [`go-live.md`](./go-live.md) | deploy ordering (§3a migrations before functions, §3b web app first) |
| [`founder-todo.md`](./founder-todo.md) | the live-measured production state table |
| [`../../NEEDS-FOUNDER.md`](../../NEEDS-FOUNDER.md) | per-item evidence and *proves it done* |
| [`../../blocker.md`](../../blocker.md) | the full history and reasoning behind each blocker |
| [`release-blockers.md`](./release-blockers.md) | a 2026-07-03 snapshot — **superseded**, kept only for history |
