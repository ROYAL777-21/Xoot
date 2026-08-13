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

## 🟡 Before the first store submission

### 6. The `zoot://` deep-link scheme (#34)

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
