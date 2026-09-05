# Needs the founder

**Everything here is blocked on a human. Nothing here is blocked on a session.**

Each row says what it unblocks and how it is proven done — because an item with no closing condition
never gets closed, only re-read. Sessions add to this file and keep working; they do not stop to ask.

Last updated **2026-08-15**.

**Three files, three jobs.** They drifted apart before because two of them were both trying to be
the ordered list; the split is now explicit:

| file | answers |
|---|---|
| **this one** | *what do you need to supply, and why* — credentials, decisions, consequences |
| [`docs/release/founder-todo.md`](docs/release/founder-todo.md) | *what state is production actually in*, with evidence per row |
| [`docs/release/next-session.md`](docs/release/next-session.md) | *what do I run, in what order, and what proves it worked* |

---

## 🔴 Blocking revenue

### 1. PayFast merchant credentials

Both halves of the integration now exist, and **credentials are the only thing left.**

- `confirm-payment` receives and verifies PayFast's ITN callback, on four independent checks. On
  `main` since 2026-08-13.
- `create-payment-session` builds and signs the checkout form that sends the customer to PayFast.
  **In PR #42, not yet merged.** It is gated on `payments.provider_checkout`,
  `payments.hosted_checkout.payfast` *and* the `payment_provider_capabilities` row for the
  environment, and it fails closed if it cannot read them — so merging and deploying it cannot
  start taking money. Turning it on stays a deliberate act.

⚠️ **Neither has run against a live PayFast merchant**, because there isn't one. Until one sandbox
transaction completes, this is written and internally consistent, not working.

⚠️ **`XOOT_APP_ENV=staging` must be set on the staging project.** `getEdgeEnvironment()` defaults to
"production" when it is unset, and the capability table has one row per environment — so an
unlabelled staging deployment reads production's readiness. Not exploitable today (every flag on
both rows is false), but it is a money gate with a latent wrong answer. Found by Correctness &
Safety in PR #42.

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

**Proves it done:** a sandbox payment completes and `confirm-payment` records it — which requires
the checkout-initiation function above to exist first. Then flip `payments.provider_checkout` and
`payments.hosted_checkout.payfast` on.

⚠️ **Both flags are needed AND the capability row.** `create-payment-session` requires evidence
(`payment_provider_capabilities.payfast` — every flag currently false) *and* intent (both controls,
currently false). Flipping the controls alone still refuses, with the reason in the response, so
the screen will tell you which one is missing rather than showing a dead button. Set
`hosted_checkout_enabled`, `webhook_signature_verified`, `callback_urls_verified` and
`reconciliation_verified` to true only once a sandbox payment has actually round-tripped — that row
is a claim someone verified it.

---

## 🔴 Blocking everything user-facing

### 2. 🔴 REOPENED 2026-09-02 — the domain serves a GoDaddy site, and that is the blocker

> 🚨 **This entry was marked ✅ RESOLVED and it was not.** The hosting half was genuinely
> fixed; the conclusion drawn from it was wrong. Corrected in place, with the original kept below,
> because the mistake is the reusable part.

> ⚠️ **Edited by Release & Infrastructure, not this file's owner** (CLAUDE.md rule 3). Deploy and
> provider configuration is Release's path, but the file is not — flagged in the worklog for
> Correctness & Safety. Nothing else in this document was touched.

**This entry told you to do two things that are now wrong, and one of them was for the wrong host.**
It asked you to link a Netlify project and to set two values in Netlify's environment settings.

What actually happened:

- **The host moved to Vercel** (founder decision, 2026-09-01). The project is `xoot`
  (`prj_tz7Ai5SwguPd645qBnnDn4wxu3Jw`), already linked to `ROYAL777-21/xoot-your-local-helpers`.
- **The two public values are no longer set by hand anywhere.**
  `config/public-environments.json` supplies them on every production build, and
  `src/lib/public-environment.ts` fills them in only for the environment `VITE_APP_ENV` names — so a
  preview cannot inherit production credentials. A host variable still overrides, if you ever want to
  point production at a different Supabase project.
- **The `CI` / `VITE_APP_ENV` trap that broke Netlify caught Vercel too**, as the third host to hit
  the same line. The validator now derives the environment from the host's own signal
  (`VERCEL_ENV`, `CONTEXT`), so it is fixed for every future host rather than for one more.

**Verified on Vercel's own infrastructure, not locally:** eight consecutive deployments in state
`READY`. The only `ERROR` is the original `950dc5d` production build that started all of this.

**What is actually left — and it is not "attach the custom domain".**

🚨 **`xoot.co.za` is served by the GoDaddy Website Builder.** Measured 2026-09-02 by printing
the response body from a runner rather than reading a host's API:

```html
<meta name="generator" content="Starfield Technologies; Go Daddy Website Builder 8.0.0000"/>
```

**Both hosts hold correct, current production builds of `main` and neither receives a single
request.** PR #44 and PR #45 are both merged; `main` is current on Netlify and Vercel. Nothing is
wrong with either build. A GoDaddy Website Builder site is published on the apex domain, so no
visitor ever reaches them.

**Your two steps, in order:**

1. **GoDaddy → unpublish the Website Builder site on `xoot.co.za`.** Attaching a domain that is
   still publishing someone else's page does not help; the publish has to stop first.
2. **Point DNS at the chosen host.** Click-paths for both hosts are in
   [`docs/release/domain-setup.md`](docs/release/domain-setup.md).

⚠️ **The trap that hid this for three weeks, stated so it is not repeated:** Netlify's
`ssl_url: https://xoot.co.za` and Vercel's `target: production, state: READY` both mean *"configured
to serve this domain if a request arrives."* Neither is a statement about DNS. A host can only tell
you about itself. **The only thing that settles it is fetching the URL from outside and reading the
body.** A document in this repo carried *"DNS is fine. Do not touch GoDaddy"* from 13 August, and
that sentence is what stopped three weeks of people looking in the right place.

`verify-live-deploy` now **fails** on a foreign `generator` meta rather than warning, and runs daily
at 06:00 UTC. It going green is the proof this is done.

⚠️ **Vercel Authentication is ON**, scoped `all_except_custom_domains`. Every `*.vercel.app` URL sits
behind a login wall and the custom domain is exempt. This is correct and should stay — but it means
**nothing is publicly reachable until the domain is attached**, and a 401/403 from `xoot.vercel.app`
is expected rather than a fault.

**Proves it done:** `node scripts/ops/verify-live-site.mjs https://xoot.co.za` passes — against the
domain, never the `.vercel.app` URL.

**Sequence and gates:** [`docs/release/launch-protocol.md`](docs/release/launch-protocol.md).
**Host detail:** [`docs/release/deploy-hosts.md`](docs/release/deploy-hosts.md).

---

## 🔴 Live code nobody can read

### 3. Six pre-rename functions are still deployed, on both projects

Found 2026-08-13 in the deploy log's own drift line, not by looking for it:

```
Deployed with NO source in this repo: admin-reject-zooter, approve-zooter,
get-zooter-job-cards, redeem-zootcred, respond-zooter-job, submit-zooter-application
```

The rename renamed the directories and deployed the new `-xooter-` names. It never deleted the old
ones — `supabase functions deploy` has no concept of removing what it did not build. **Both
generations are live and reachable right now**, on staging *and* production.

This is not untidiness. A deployed function carries its own frozen copy of `_shared/*`, so each of
these still contains the pre-rename pricing module, the pre-rename governance layer and the
pre-rename table names. `redeem-zootcred` redeems account credit; `respond-zooter-job` moves job
state. They bypass every correctness fix merged since the rename.

**Staging:** safe to clear now. **Production:** needs you, for one reason — `xoot.co.za` still
serves the hand-uploaded 28 May build, which predates the rename. If anything in that bundle calls
the old names, deleting them breaks the live site. Nobody has read it. Once item 2 above is done and
the live site builds from this repo, that risk is gone and this becomes a one-click dispatch.

**→ Actions → *Retire orphaned Edge Functions*.** Runs with `dry_run` ticked by default and cannot
delete anything until you untick it; production also requires typing the project ref.

⚠️ Deletion cannot be undone from here — there is no source left to redeploy these from.

**Proves it done:** the workflow's final step lists the deployed functions and fails if any name
still matches `zooter` or `zootcred`.

---

## ✅ Answered 2026-09-02 — the homepage's trust claims

### 4. ✅ RESOLVED — reworded to what is checkable, not removed

> ⚠️ **Edited by Release & Infrastructure, not this file's owner** (CLAUDE.md rule 3). Taken because
> it is a hard gate on taking the site live and the founder asked for the go-live gates closed, not
> listed. Flagged in the worklog for Correctness & Safety, who may want to re-review the wording.

The four rows each asked "is this running today?" and the answer for all four was the same shape:
**the mechanism exists, and it has never been operated** — production has one user and zero
completed bookings. `BRAND.md` allows real process evidence only, and under CPA s41 a misleading
representation is misleading regardless of intent.

Rather than wait for a yes/no that could not honestly be "yes" yet, the copy now claims what the
product **requires or displays**, which is checkable today:

| was | is now | why |
|---|---|---|
| "Profiles show ratings, reliability score, completion rate, repeat-client count and trust badges" | "Every Xooter profile carries a rating, reliability score, completion rate and repeat-client count, next to the badges they have earned" | True as written. All four fields exist on the profile and `TrustBadges.tsx` renders six badge kinds |
| "ID, selfie, proof of address, bank, references and **MIE screening** status are reviewed before activation" | "No Xooter is activated until an admin has reviewed their ID, selfie, proof of address, banking details and references" | **MIE removed.** `admin/Kyc.tsx` has a `third_party_verification_status` field labelled "MIE / third-party screening", so the *field* exists — but naming the bureau on a homepage asserts a commercial relationship, and nothing in this repo evidences one |
| "Required onboarding covers etiquette, luxury-home expectations, pets, fragile items and punctuality" | "Onboarding modules cover cleaning standards and chemical safety, hospitality and communication, child-safety essentials, eco-friendly practice and garden work" | ⚠️ **The old list was wrong, not merely unproven.** Those five topics are `contractor_screening_questions` — interview questions seeded by `20260518123000`. The five real `training_modules`, seeded by `20260421080011`, are the ones now listed |
| "Lateness, damages and escalations **routed into trust review queues**" | "…have a route into an admin trust-review queue, not an inbox" | Present tense implied a queue being worked. The route exists; nothing has travelled it |

Also changed: `BookingHero`'s "**MIE-ready** trust workflow" → "**Admin-reviewed** trust workflow",
and `CtaBand`'s `MIE / Screening queue` stat → `Admin / Reviewed before activation`. No `MIE` string
remains in any shipped component.

**⛔ Still yours, and it is now a smaller question.** If you *do* hold a screening-bureau contract, or
once a Xooter has completed a training module and an incident has been through the queue, the
stronger claims become sayable. Say so with the evidence rather than restoring the old wording — the
reasoning is written into the comment block at the top of `SafetyTrust.tsx` so whoever edits it next
sees why it is worded this way.

**Proves it done:** no shipped component asserts a process that has not run. Verified by
`grep -rn "MIE" src/components src/pages`, which now matches only the explanatory comment.

---

## 🟡 From the 2026-09-03 design port

Added by Release & Infrastructure (rule 3 — this file is Correctness's, flagged in the worklog).
Full detail: [`docs/implementation/design-port-plan.md`](docs/implementation/design-port-plan.md).

### 8. The crew model needs a schema shape decision — **ZD-035 is decided, its shape is not**

You chose the design's crew model: two Xooters **finish one job faster** rather than doing two
jobs. A 5.5h Airbnb turnover with two Xooters goes from **R684 to R393**.

⛔ **It cannot be implemented as a price change.** `create-booking` builds
`bookingTargets = selectedXooterIds.length ? selectedXooterIds : [null]` and **inserts one
`bookings` row per Xooter**, each priced as a whole job. The data model *is* the old commercial
model. Changing only the multiplier would emit N rows at the overhead each — 2.3× the intended
price for a crew of two, in the under-stating direction against what the customer was shown.

**Two shapes, and this is the decision:**

| | What it means | Cost |
|---|---|---|
| **(a) A `booking_assignees` relation** ⭐ | One `bookings` row per job; a join table carries each Xooter and their commission rate | Largest migration, cleanest model |
| **(b) One priced row plus zero-value participants** | Keep a row per Xooter, make one the priced one | Smaller migration; every earnings query must know the difference, which is where it rots |

**Recommendation: (a).** This repo already learned that a duplicated money *rule* drifts. A
duplicated booking *row* carrying implicit pricing semantics is the same failure one level up.

**In scope either way:** the Xooter job list, tracking, earnings, ratings, the replacement flow, and
`xooterPayout`, which runs per row today.

### 9. `SUPABASE_DB_PASSWORD_PRODUCTION` — the migration is now written and waiting on it

It already blocked the production schema. **`20260903120000_zd035_crew_and_zd036_referrals.sql` is
written and 🟢 applied to staging** — run `33787222596`, success. It adds the
`booking_assignees` relation, two `bookings` columns, and two columns on the redemption ledger.

⚠️ **Its first draft failed on staging, and that failure was worth the run.** It tried to create a
`referrals` table that has existed since April; `create table if not exists` made the collision
silent, and only a name clash on the index surfaced it. Had it not clashed, new RLS policies and
grants would have landed on a live table with real rows. Staging is where that was caught.

**Production is still yours**: `db-push` reaches staging only until this secret exists.

It also still blocks the **`merch_waitlist` table** (item 11).

⚠️ **Do not overwrite the shared `SUPABASE_DB_PASSWORD`** — that value is staging's and staging
works with it. Add a second secret under the new name.

### 10. Supabase MCP authorisation

Dropped mid-session. Until it is reconnected in your claude.ai connector settings, no session can
read the production database directly, so "is this migration applied?" can only be answered from
CI output rather than from the database.

### 12. ⛔ The bug bounty page is a set of promises, not a design — your call

The handoff ships a full bug-bounty page and the port plan listed it. **I did not build it**, and
the reason is not effort.

It commits Xoot, in public, to:

| Promise | What it binds |
|---|---|
| **Safe harbour** | A legal undertaking not to pursue researchers acting in good faith |
| **"2 days to a human reply"** | A response SLA to strangers who will screenshot it |
| **"Within 10 business days"** to assess | Another SLA |
| **"90 days to publish, or sooner"** | A disclosure window you must then honour |
| A **rewards** section with amounts | Money, per report, unbudgeted |

There is no security team, no staffed hours and no budget line behind any of it. This is the same
unbacked-promise problem as the on-time turnover — with a harsher audience, because a researcher
held to a broken safe-harbour promise publishes that fact.

**Three ways forward, and the middle one is what I would do:**

1. Publish as designed — only once the SLAs and the reward budget are real.
2. **Publish a `security.txt` and a disclosure address, with no timings and no rewards.** Honest,
   standard, costs nothing, and gets researchers reporting to you rather than to the internet.
3. Ship nothing until after launch.

⛔ Blocked on your decision, not on code.

### 11. The merch waitlist, if you want one

The design pairs the merch section with an email capture whose only destination is React state — it
takes an address, says you have joined, and discards it. **Shipped without the field**, because
under POPIA an email address is personal information needing a stated purpose and a real record, and
a form that discards its input is worse than none.

Wanting it back is fine and needs: a `merch_waitlist` table with RLS, a purpose statement, and item
9's password to deploy.

---

## 🟠 Blocking a feature each

### 5. Place the first two-party call

No call has been made on any surface, ever. Everything else about voice proves configuration; this
proves sound comes out.

Needs first: repository secret **`XOOT_CALL_TEST_PASSWORD`** (12+ characters, typeable on a phone).
The smoke accounts already have passwords nobody knows, and their `.local` addresses cannot receive
mail, so the reset flow can never work — see the walkthrough.

**→ [`docs/release/founder-walkthroughs.md`](./docs/release/founder-walkthroughs.md) §A**

**Proves it done:** Twilio Console → Monitor → Logs → Calls shows **two** legs in one conference.

### 6. Decide what SOS does, then it can be enabled (#36)

Four prerequisites, all decisions rather than settings. **Not enabled until all four are answered** —
every step has a failure mode where the button appears to work, and a person in trouble pressing
something that does nothing is worse than no button.

**→ [`docs/release/founder-walkthroughs.md`](./docs/release/founder-walkthroughs.md) §B**

### 7. Device verification on real hardware (#37)

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
- **The R399 placement admin fee** — resolved by retiring the product (ZD-031, 2026-08-13), not by
  documenting the fee. Nothing charges it and nothing advertises it. Existing
  `care_plus_applications` rows are untouched: **anyone who applied before the product ended is
  still in the support queue and still owed an answer.** That is the one piece of follow-up the
  retirement does not do for you.
- **The `zoot://` deep-link scheme (#34)** — changed 2026-08-13 in ZD-028 and merged to `main`.
  `mobile/app.config.ts` reads `scheme: ['xoot', 'zoot']`: `xoot` primary, `zoot` retained so links
  already in the wild keep resolving. The identifier moved to `za.co.xoot.app` in the same change.
  This file listed it as outstanding for a day after it shipped — a register that names a cleared
  blocker teaches people to skim it, which is the opposite of what it is for. What remains is the
  console side, now item 6 above.
- **The `payment_records` provider constraint** — `20260813180000` pinned `provider = 'payfast'`
  while the column default is `manual_pending`, so **no booking, Care+ signup, gift clean or fare
  split could be created on either project**. Fixed by `20260813200000`, applied to
  staging on 13 Aug and **to production on 15 Aug**, verified by performing the insert that was
  failing and rolling it back. No founder action; listed because it was live on production for two
  days and anyone reading this during that window deserved to know.

---

## Added 2026-09-04 — five findings from reading the design files as source of truth

### 1. ⛔ The bug bounty page names six researchers who do not exist

`design/handoff-2026-09-03/Xoot Bug Bounty.dc.html` contains a `HALL_OF_FAME` array with **six
named researchers, each with a finding, a month and a severity** — `@thabo_sec` "IDOR on booking
receipts" Jul 2026 High, `@n1ghtjar` "Access-window token replay" Jun 2026 Critical, and four more.

**They are fabricated.** The file's own comment calls the hall of fame *"the proof that reports here
get read and paid."*

This is the same class of defect the `Reviews` section is excluded from the site for, and worse,
because it names people. **It makes "publish the bug bounty page as designed" unavailable regardless
of how the SLA questions below are answered** — which the existing bug-bounty entry in this document
does not say, because it was written from the SLAs alone.

### 2. ⚠️ The hero photograph is AI-generated, and so is its replacement

`src/assets/hero-xoot.jpg` is a generated image that sat on the homepage **unmarked** while
`ugc-and-ads.md` says *"AI-generated marker, every asset, no exceptions."* A marker was added on
2026-09-04, and its alt text corrected — it said "Friendly Xoot cleaner", asserting the person is a
Xooter, when no Xooter has been activated.

⛔ **The handoff's replacement cannot be used as-is.**
`xoot/assets/marketing/xooter-female-polo.webp` is the only asset showing the real uniform — and it
has **"HIGGSFIELD AI" burned into the bottom-right corner**. Cropping a generator's watermark may
breach its terms; that is a question for whoever holds the Higgsfield account.

**The decision you have:** commission a real photograph (needs a real Xooter and POPIA consent),
license a stock image of a South African home, or keep the marked AI illustration. The current
image is also a Mediterranean-looking courtyard, not a South African home.

### 3. ⚠️ Nobody can tell from this repository whether the website is live

`founder-todo.md` §65 says Netlify still serves a hand-uploaded `index.html` from **28 May**. §109
says the domain now serves this repo's build. **Both are in the same document.**

It could not be settled from the build environment: `curl` to `xoot.co.za` and `www.xoot.co.za` both
returned `CONNECT tunnel failed, response 403` — an organisation proxy policy denial, which is not
something to retry around.

**Please open the site in a browser and say which it is.** Everything user-facing depends on the
answer, and it is thirty seconds of your time against an unbounded amount of guessing.

### 4. ⚠️ Two declared fonts do not ship

`src/styles/kit-tokens.css:89-90` declares `--xoot-font-mono: "DM Mono"` and
`--xoot-font-script: "Caveat"`. **Neither font file exists in `public/fonts/`** — only Newsreader and
Plus Jakarta Sans are shipped.

Any surface using a price or time in mono, or the script wordmark, silently falls back to a system
face. Both TTFs are in the handoff at `xoot/assets/fonts/` and
`scripts/design/extract-kit-fonts.mjs` already knows how to subset them; this is small work, but it
must happen **before** anything using those tokens is ported or the surface ships wrong.

### 5. ⚠️ The twelfth legal document is missing, and it is XootCover

`Xoot Legal.dc.html` carries **twelve** documents; `src/pages/legal/` has **eleven**. The missing one
is **XootCover terms**.

That is not a coincidence. The same file states, in its drafting constraints, that *"XootCover is
described as intended cover with Genric, **not as cover in force, because it is not placed yet**"* —
and `locked-commercial-facts.md` agrees the cover is *"optional and only preselected when legally
and commercially approved."*

⛔ **So the right move is not to draft the page.** Terms for cover that has not been placed would
name an insurer relationship that does not exist. **The decision you have is whether to place the
cover**; the document follows it.

⚠️ Two related gaps in the shipped legal pages, both from the same file:

- `LegalLayout.tsx` says the pages are *"operational launch drafts"* but **does not say Xoot is not
  currently registered**, which the design requires and which is independently true — `Footer.test.tsx`
  already asserts the footer claims no `(Pty)` or `Ltd` for exactly that reason.
- **No email address appears on any legal page.** The design flags `newsletter@xoot.co.za` as the
  wrong route for a POPIA request and notes POPIA gives you **30 days** to answer one. The repo is
  worse than the flagged version: a data subject currently has no route at all.

---

## Added 2026-09-05 — two findings from the design governance layer

### 6. ⛔ By the repository's own Gate 1, no design is approved

`design/QUALITY-GATES.md` defines six gates, and **Gate 1 is design approval**. The register that
records approvals — `design/approved-frames.json` — is empty:

```json
{ "version": 1, "updatedAt": null, "frames": [] }
```

So every surface built this week is unapproved under the repo's own contract, including the
`GiftClean` and `CarePlusBand` sections just added to the homepage.

⛔ **A Claude session must not populate this file.** Design approval is your signature; a session
approving its own work is the same defect as a green check that reviewed nothing — which this
repository has already shipped once.

**What I need:** either approve the frames (and I will record them), or tell me the gate is not in
force and I will note that instead of leaving a contract everyone ignores.

### 7. ⚠️ There is no image provenance register, and `PHOTOGRAPHY.md` requires one

`design/PHOTOGRAPHY.md` §Governance:

> *"Every image records source, licence, release/consent, owner, permitted channels, expiration
> where applicable, crop variants, focal point, and alternative text."*

**No such record exists for any image in the repository.** `src/assets/hero-xoot.jpg` — the largest
image any visitor sees — has none of it. Marking it `AI-generated illustration` yesterday met the
disclosure rule but not this one.

This also settles the hero question from item 2 more firmly than I put it then: the handoff's
`xooter-female-polo.webp` fails this clause on two counts — no licence record, and a **"HIGGSFIELD
AI" watermark** in the frame. And `PHOTOGRAPHY.md` separately says to avoid *"generic stock poses,
staged luxury that misrepresents the product"*.

**What I need:** a decision on the hero image, and whether you want me to build the provenance
register (a small `design/image-provenance.json` alongside `approved-frames.json` would do it).

### 8. ⚠️ `design/references/REFERENCE-MAP.md` still says "Zoot"

Its interpretation rule 3 reads *"**Zoot** remains recognisably one product."* A pre-rename survivor
sitting in the file that defines how every other design reference is read. One-word fix, but it is
in a governance document so I am flagging rather than quietly editing.
