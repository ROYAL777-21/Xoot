# Needs the founder

**Everything here is blocked on a human. Nothing here is blocked on a session.**

Each row says what it unblocks and how it is proven done — because an item with no closing condition
never gets closed, only re-read. Sessions add to this file and keep working; they do not stop to ask.

Last updated **2026-08-13**.

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
- `PAYFAST_PROCESS_URL` and `PAYFAST_VALIDATE_URL` — sandbox hosts on staging, live hosts on
  production. Defaults are in `supabase/functions/_shared/payfast.ts`.
- `PAYFAST_ALLOWED_IPS` *(optional, recommended)* — comma-separated. **Left empty the source check
  is skipped and logged**, deliberately: this environment's egress proxy blocks
  `developers.payfast.co.za`, so the list could not be read from the primary source, and a guessed
  list would reject genuine callbacks silently. Get the current list from PayFast's docs and paste
  it here — it is the one control this integration is missing.

**Proves it done:** a sandbox payment completes and `confirm-payment` records it — which requires
the checkout-initiation function above to exist first. Then flip `payments.provider_checkout` and
`payments.hosted_checkout.payfast` on.

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

**Proves it done:** Actions → *Verify live deploy* reports ✅. That also opens the §3b pricing gate,
which currently blocks production Edge Function deploys.

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

## 🟠 Say yes or no before the site goes live

### 4. Four trust claims the homepage states as fact

`SafetyTrust` publishes these to anyone who visits, in the present tense:

| claim | is this running today? |
|---|---|
| Profiles show ratings, reliability score, completion rate, repeat-client count, trust badges | ? |
| ID, selfie, proof of address, bank, references and **MIE screening** reviewed before activation | ? |
| Required training covers etiquette, luxury-home expectations, pets, fragile items, punctuality | ? |
| Lateness, damages and escalations **routed into trust review queues** | ? |

`BRAND.md` allows "real process evidence, verified reviews, and approved client proof **only**"
and forbids publishing invented guarantees. Production currently has **one user and zero
bookings**, so none of these has been exercised — the schema and the queues exist, but existing
does not mean operating.

Separately, `BookingHero` says "**MIE-ready** trust workflow". *Ready* reads as *not yet running*,
which is either an accidental admission or an accurate one.

This is not a code question and I have not changed the copy. A claim about vetting that turns out
to be aspirational is the kind a customer repeats to a journalist after something goes wrong.

**Proves it done:** a yes/no on each row. Anything that is a no gets reworded to the future tense
or removed before the site is linked to the domain.

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

## 🟡 Before the first store submission

### 8. The `zoot://` deep-link scheme (#34)

Still live in `mobile/app.config.ts`. It is baked into the app record at first submission, so it
changes **now or never**.

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

- **`ENCRYPTION_KEY`** — set on both projects 2026-08-13, different values. Closes #28 once a gate
  code round-trips.
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
