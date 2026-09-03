# What Xoot needs to go live

Compiled 31 August 2026 from the repo's own ledgers — `blocker.md`, `NEEDS-FOUNDER.md`,
`EXECUTION_PLAN.md` and `CLAUDE.md`. **Nothing here is invented.** Where the repo says a thing is
unverified, this says so too.

The headline, because it is not what a checklist normally says:

> Almost nothing left is blocked on writing code. It needs an account, a dashboard, a device, or
> a decision. Two of the items below are blocking *everything else*.

---

## 🔴 Blocking everything — do these two first

### 1. The live site is not the repo

`xoot.co.za` serves a **hand-uploaded `index.html` from 28 May 2026**. The Netlify project
`xoot-home-care` exists with the domain and certificate attached correctly, but it was never
connected to the repository — deploy source reads `api`, no commit ref, no committer.

**No push has ever changed the live site.** Nothing merged since May is live: not the R39 booking
fee, not Care+, not the Zoot→Xoot rename, not voice, not the security headers.

Do not touch GoDaddy — DNS and TLS are already correct. What is needed:

| step | where |
|---|---|
| Link the project to the repo | Netlify → Site configuration → Build & deploy |
| `VITE_SUPABASE_URL` = `https://mvlrkelahhsyjrwgsxaf.supabase.co` | Netlify → Environment variables, **Production context** |
| `VITE_SUPABASE_PUBLISHABLE_KEY` = the `sb_publishable_…` key | same. Supabase → Settings → API |

Neither value is a secret — both ship inside the client bundle already.

⚠️ Linking alone was never sufficient, and the repo's own docs used to imply it was. Netlify sets
`CI=true`, and the env validator fails outright when `CI` is set and `VITE_APP_ENV` is not. That was
fixed in `netlify.toml` on 13 Aug, so deploy previews now build unattended — but before that fix
every deploy preview on PR #42 failed before compiling anything, four commits running.

**Done when:** Actions → *Verify live deploy* reports ✅.

### 2. CI cannot allocate a runner

Since **14 Aug ~10:59Z**, GitHub Actions has been unable to assign a runner. Last successful run of
anything: 13 Aug 22:07Z. Failing jobs show `runner_id: 0`, no steps, logs 404 — **no step ever
executed**.

This matters beyond red checkmarks: it disables `db-push` and `deploy-edge-functions`, which are
the only two routes the repo has to change either Supabase project.

Usual causes are a failed payment or an exhausted Actions spending limit. GitHub → Settings →
Billing. Founder-only.

⚠️ Until it lifts, a local run is the only evidence any change has. Any claim that "CI is green"
about work after 13 Aug is a claim about a run that never happened.

---

## 🔴 Blocking revenue

### 3. PayFast credentials

Both halves of the integration exist. `confirm-payment` verifies the ITN callback on four
independent checks and is on `main`. `create-payment-session` builds and signs the checkout form
and is **in PR #42, not merged**.

Neither has ever run against a live PayFast merchant. Until one sandbox transaction completes, this
is written and internally consistent, not working.

Set in Supabase → Edge Functions → Secrets, **on both projects, with different values**:

| secret | note |
|---|---|
| `PAYFAST_MERCHANT_ID` | PayFast dashboard → Settings |
| `PAYFAST_MERCHANT_KEY` | same |
| `PAYFAST_PASSPHRASE` | **Set one.** The signature is materially weaker without it |
| `PAYFAST_MODE` | `sandbox` on staging, `live` on production. Anything not exactly `live` means sandbox — so the failure direction is a test payment, not a real charge |
| `PAYFAST_ALLOWED_IPS` | Optional but recommended. Left empty the source check is **skipped and logged** |
| `XOOT_APP_ENV` | **Set to `staging` on staging.** Not currently set anywhere |

⚠️ `XOOT_APP_ENV` is not cosmetic. `payment_provider_capabilities` has one row per environment and
`getEdgeEnvironment()` defaults to `production` when unset — so an unlabelled staging deployment
reads *production's* readiness row. Not exploitable today (every flag on both rows is false), but
it is a money gate with a latent wrong answer.

**Done when:** a sandbox payment completes and `confirm-payment` records it. Only then set
`hosted_checkout_enabled`, `webhook_signature_verified`, `callback_urls_verified` and
`reconciliation_verified` to true — that row is a claim that someone verified it.

### 4. Invoice legal entity

`generate-booking-invoice` refuses outright when the legal entity is unset, so **no completed
booking produces an invoice** until these exist:

`XOOT_INVOICE_LEGAL_ENTITY`, `XOOT_INVOICE_LEGAL_ENTITY_REGISTRATION`, `XOOT_INVOICE_VAT_RATE`
(`0` until VAT-registered), `XOOT_INVOICE_VAT_NUMBER` (required once the rate is above zero,
enforced in code).

⚠️ If these were set before 13 Aug they were set under `ZOOT_` names and are doing nothing.

⚠️ **This is currently blocked on incorporation.** The company is mid-restructure and deregistered,
so there is no registered name or number to put here. Failing closed is the right direction — a
South African tax invoice with a blank legal entity would be worse than no invoice — but the
symptom is silence, not an error anyone sees.

---

## 🔴 Live code nobody can read

### 5. Six pre-rename Edge Functions are still deployed

```
admin-reject-zooter, approve-zooter, get-zooter-job-cards,
redeem-zootcred, respond-zooter-job, submit-zooter-application
```

The rename deployed the new `-xooter-` names and never deleted the old ones — `supabase functions
deploy` has no concept of removing what it did not build. **Both generations are live and reachable
right now, on staging and production.**

This is not untidiness. A deployed function carries its own frozen copy of `_shared/*`, so each of
these still contains the pre-rename pricing module, governance layer and table names.
`redeem-zootcred` redeems account credit; `respond-zooter-job` moves job state. They bypass every
correctness fix merged since the rename.

Staging is safe to clear now. Production needs item 1 done first — the live site predates the
rename, and if that bundle calls the old names, deleting them breaks the site.

**Actions → *Retire orphaned Edge Functions*.** Dry-run by default; production also requires typing
the project ref. ⚠️ Cannot be undone — there is no source left to redeploy these from.

### 6. Every deployed function is behind the repo

42 of 42 production functions. Mostly one shared cause: `_shared/action-utils.ts` is bundled into
33 of them at deploy time and last changed after the newest deployment, so no deployed function
carries the `xoot.co.za` domain change.

That was worked around rather than redeployed — setting `ALLOWED_ORIGINS` fixed all 42 at once
because `getAllowedOrigins()` reads the env var before the compiled fallback. **Verified live on
both projects.** But it means live functions still send email saying "Confirm your Zoot account".

Seven `admin-*` functions have never been drift-checked correctly (the checker missed sibling
imports). Run `node scripts/ops/check-deployed-drift.mjs` and act on the result rather than
assuming.

---

## 🟠 Four trust claims that must be answered before launch

`SafetyTrust` publishes these **in the present tense**, to anyone who visits:

| claim | running today? |
|---|---|
| Profiles show ratings, reliability score, completion rate, repeat-client count, trust badges | ? |
| ID, selfie, proof of address, bank, references and **MIE screening** reviewed before activation | ? |
| Required training covers etiquette, luxury-home expectations, pets, fragile items, punctuality | ? |
| Lateness, damages and escalations **routed into trust review queues** | ? |

Production has **one user and zero bookings**, so none of these has been exercised. The schema and
the queues exist; existing is not operating. `BRAND.md` allows "real process evidence, verified
reviews, and approved client proof only".

Separately, `BookingHero` says "MIE-**ready** trust workflow" — *ready* reads as *not yet running*,
which is either an accidental admission or an accurate one.

**A claim about vetting that turns out to be aspirational is the kind a customer repeats to a
journalist after something goes wrong.** Anything answered "no" gets reworded to the future tense or
removed before the domain is linked.

---

## 🟠 Feature gates — each blocked on a decision, not code

### SOS (#36)

Built and **ships dark on purpose.** `src/lib/sos-session.ts` and `SosButton.tsx` render nothing
until `canArmSos()` is true, which needs `SAFETY_READINESS === "live"`. It is `schema_pending`, and
`safety.test.ts:181` pins that deliberately.

The rule `safety.ts` sets: **no safety promise may be shown before the thing it promises works.**
To advance: redeploy `raise-sos-alert`, dial 112 from a real handset and confirm it connects, and
confirm an ops person actually receives the alert.

⚠️ **Ops has no paging route.** `raise-sos-alert` writes the alert and notifies the raiser; nobody
at Xoot is woken. Decide the channel first, or an alert lands in a table nobody is watching.

Every step has a failure mode where the button appears to work. A person in trouble pressing
something that does nothing is worse than no button.

### Gate codes / sensitive access (#28)

`ENCRYPTION_KEY` is set on both projects with different values, but #28 is correctly still open: its
definition of done is a gate code stored *and read back*, because Supabase never reads a secret
value back. "Reported set" is not "verified set".

That proof was impossible until recently for a second reason — `sensitive-access-read` called an RPC
with a parameter it does not declare, so the endpoint answered 500 to every request. Fixed on a
branch, **not on `main` and not deployed**. Nothing leaked (it failed closed), but no Xooter could
read a gate code either.

### Masked calling (#32)

Four of five gates shut. `twilio.masked_voice` false, `twilio.operational_messages` false, zero
profiles with a phone number. Also: nothing populates `provider_call_sid`, so the status callback
has nothing to correlate against.

⚠️ **Check Twilio Proxy's end-of-life status before spending on this.** If retired, masking needs
rebuilding on Voice + TwiML against a caller-ID pool — a design decision, not a config change.

### Tipping

`booking_tips` migration is written and **unapplied on both projects**. No tip payout path exists.
`TIP_READINESS` is `schema_pending` and `tip-policy.test.ts` fails the build if the UI offers a tip
while it is unset.

---

## 🟡 Accounts and consoles

| provider | what is needed |
|---|---|
| **Supabase Auth** | Redirect allowlists for local, staging, production, Expo, `xoot://auth/callback` **and** the retained `zoot://auth/callback` |
| **Google OAuth** | Redirect URI / reversed-client id for the new bundle id |
| **Apple Developer** | Bundle id `za.co.xoot.app`, Sign in with Apple. **New identifier means new EAS credentials** — the old ones are bound to `za.co.zoothome.app` |
| **Mapbox** | Browser token restricted to Xoot HTTPS origins; native token for iOS/Android; secret downloads token in EAS/CI only. ⚠️ A secret token was pasted in chat and must be rotated |
| **Cloudflare** | No `xoot.co.za` zone exists. The connected token lacks zone-create permission. WAF, Turnstile, rate limiting all blocked on this |
| **Twilio** | Trial status removal, approved number, WhatsApp sender approval, messaging service classified transactional, webhook assignments, approved templates |
| **Brevo** | Sender-domain DNS; invoice templates for `booking_invoice_created` and `booking_invoice_resend` |
| **Stores** | Apple Team ID, App Store Connect record, Play record, signing fingerprints, privacy declarations, account-deletion URL, support URL |

⚠️ Secrets pasted into chat — Supabase, Cloudflare, Expo, PostHog, Mapbox, CodeRabbit, and a
Supabase CLI access token on 30 June — **must be rotated before production use.**

---

## 🟡 Legal and POPIA — blocked on incorporation

- **No legal entity is named and no POPIA Information Officer is registered.** This blocks a
  truthful privacy policy, App Store privacy labels, invoice fields, and store submission. The
  Information Officer must be a *registered person* at the Information Regulator — not a
  documentation task.
- A **section 72 assessment** is required for any personal information leaving South Africa.
  Supabase regions, Sentry, PostHog, Brevo, Twilio and Mapbox all need checking against it, and the
  answer written into the privacy policy.
- **Consent recording is not implemented.** Terms are accepted implicitly at sign-up (ZD-021), which
  requires storing which version was accepted and when, per user. Without it there is no defensible
  record.
- **Breach notification has no runbook.** POPIA has no generous risk exemption. Detection,
  assessment and notification must be written down before a breach, not after.

The twelve draft policies in the Legal centre carry `[bracketed]` slots for exactly the facts
incorporation will supply. They need a South African attorney's review before publication.

---

## ⚪ Open decisions in the tracker

| # | decision |
|---|---|
| #33 | ZD-005 schema source of truth — four written migrations blocked behind it |
| #38 | `--destructive` fails AA contrast, worse in dark mode |
| #40 | Long bookings pay R27.95/h — the ladder is sub-linear in hours |
| #41 | 200 jobs to the 20% commission floor is roughly two years |

⚠️ **#40 is partly addressed in this design work.** `xoot/quote.js` applies a minimum hourly floor
from 5.5 hours precisely so a long job cannot pay under minimum wage. That is the design-side answer;
the server ladder still needs the same treatment, and the two must agree.

---

## Two rules this repo learned the hard way

**Client and server price separately and must agree.** `src/lib/xoot-pricing.ts` mirrors
`supabase/functions/_shared/pricing.ts`, and `pricing-parity.test.ts` fails if they drift. This repo
has shipped a screen showing one price and charging another **three times**.

**Under the Consumer Protection Act the displayed price is the price.** A total shown and then
exceeded at charge time is a legal problem, not untidiness. Over-stating is survivable;
under-stating is not. Every default should fail in the over-stating direction.

---

## Shortest path to a working booking

1. Fix CI billing (item 2) — nothing can deploy without it.
2. Link Netlify to the repo + two env vars (item 1) — the live site becomes the real app.
3. PayFast sandbox credentials, complete one test transaction (item 3).
4. Answer the four trust claims (above) and reword anything that is a "no".
5. Retire the six orphaned functions (item 5).
6. Incorporate → legal entity secrets → invoices work, and the legal pages can name a party.

Steps 1–3 give a site that can take a booking and a payment. Steps 4–6 are what make it lawful to
advertise.
