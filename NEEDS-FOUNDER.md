# Needs the founder

**Everything here is blocked on a human. Nothing here is blocked on a session.**

Each row says what it unblocks and how it is proven done — because an item with no closing condition
never gets closed, only re-read. Sessions add to this file and keep working; they do not stop to ask.

Last updated **2026-08-13**.

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
- `PAYFAST_PROCESS_URL` and `PAYFAST_VALIDATE_URL` — sandbox hosts on staging, live hosts on
  production. Defaults are in `supabase/functions/_shared/payfast.ts`.
- `PAYFAST_ALLOWED_IPS` *(optional, recommended)* — comma-separated. **Left empty the source check
  is skipped and logged**, deliberately: this environment's egress proxy blocks
  `developers.payfast.co.za`, so the list could not be read from the primary source, and a guessed
  list would reject genuine callbacks silently. Get the current list from PayFast's docs and paste
  it here — it is the one control this integration is missing.

**Proves it done:** a sandbox payment completes and `confirm-payment` records it. Then flip
`payments.provider_checkout` and `payments.hosted_checkout.payfast` on.

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

## 🟠 Decide, then it is settled

### 4. The R399 placement admin fee is charged but recorded nowhere

`care/CarePlusApply.tsx` has told households *"Non-refundable admin fee: R399"* since it was
written. It is a non-refundable charge to a consumer, and it appears in **no** decision-log entry
and **nothing** in `docs/product/locked-commercial-facts.md`.

Every other price the company charges is recorded there — the R39 booking fee, R99 Care+, the
R280/R325/R400 sizes, the R21 Booking Cover. This one is not, which means nothing authorises it
and nothing would notice if it changed.

I have given it a constant (`PLACEMENT_ADMIN_FEE_CENTS` in `src/lib/care-plus.ts`) so the figure
has one home instead of being typed into a sentence — **the amount is unchanged**. What a session
cannot do is decide whether R399 is the right number or write it into the locked facts, because
that is a commercial decision with a consumer-law edge: under the CPA a non-refundable fee has to
be disclosed before the consumer is bound, and the page currently discloses it at step 3 of 4.

**Proves it done:** a line in `locked-commercial-facts.md` giving the amount and what it covers,
and a decision-log entry. Then the constant cites the document rather than the other way round.

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
