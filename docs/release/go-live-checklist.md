# What a fully functional Xoot still needs

Written 2026-09-04, answering the founder's question directly and **from the code**, not from the
other status documents — two of which contradict each other (§3 below).

> **"The backend is finished. The product has never been live."** Both are true. Production's schema
> is fully migrated, every Edge Function was redeployed with it in one operation, and it holds
> **0 bookings and 1 user**.

---

## 🔴 1. Payments — seven conditions, in this order

⚠️ **"Turn on payments" is not one switch.** `_shared/payment-provider-gate.ts` fails closed and
checks seven things in sequence. Each returns a different reason, so whatever you do first, the
error message tells you the next one.

| # | Condition | Where |
|---|---|---|
| 1 | A capability row exists for `payfast` + this environment | `payment_provider_capabilities` |
| 2 | `hosted_checkout_enabled` | same row |
| 3 | `webhook_signature_verified` | same row |
| 4 | `callback_urls_verified` | same row |
| 5 | `reconciliation_verified` | same row |
| 6 | `payments.provider_checkout` = true | `app_controls` |
| 7 | `payments.hosted_checkout.payfast` = true | `app_controls` |

⛔ **Row 1 fails closed deliberately.** From the source: *"No capability row means nobody made the
claim. That is not the same as the claim being false, but it has to be treated identically: absence
of evidence cannot be a licence to charge."*

**And twelve secrets**, all read by the Edge Functions at runtime:

```
PAYFAST_MERCHANT_ID        PAYFAST_MERCHANT_KEY      PAYFAST_PASSPHRASE
PAYFAST_MODE               PAYFAST_ALLOWED_IPS       PAYFAST_NOTIFY_URL
PAYFAST_PROCESS_URL        PAYFAST_PROCESS_URL_LIVE  PAYFAST_PROCESS_URL_SANDBOX
PAYFAST_VALIDATE_URL       PAYFAST_VALIDATE_URL_LIVE PAYFAST_VALIDATE_URL_SANDBOX
```

⚠️ **It is PayFast, not Stitch or Ozow.** `founder-todo.md` said Stitch/Ozow until 2026-09-04 and
would have sent you to buy the wrong credentials. The schema no longer accepts them —
`payment_reconciliation_checks.provider` is constrained to `('payfast')`.

**This is also what blocks gifting.** `ops-workflow` stamps every gift order
`provider_required: "PayFast credentials not connected"`, which is why the new homepage gift section
takes an enquiry rather than a payment.

## 🔴 2. `ENCRYPTION_KEY` — gate and alarm codes

Read by `sensitive-access-save` and `sensitive-access-read`. Without it a customer cannot save a
gate code, alarm code or access note, and the function fails loudly rather than storing it in the
clear — which is the right failure, and still a broken feature.

Issue [#28]. Needs setting on **both** projects.

## 🔴 3. ⚠️ Nobody can tell from this repository whether the website is live

`founder-todo.md` **§65** says Netlify serves a hand-uploaded `index.html` from **28 May**.
**§109** says the domain now serves this repo's build. Both sentences are in the same file.

It could not be settled from the build environment — `curl` to `xoot.co.za` and `www.xoot.co.za`
both returned `CONNECT tunnel failed, response 403`, an organisation proxy policy denial.

⛔ **Open the site in a browser and say which it is.** Everything user-facing depends on the answer
and no amount of reading resolves it.

---

## 🟡 Smaller, and real

| What | Why it matters |
|---|---|
| **Six orphaned Edge Functions** live on production — `approve-zooter`, `admin-reject-zooter`, `submit-zooter-application`, `get-zooter-job-cards`, `redeem-zootcred`, `respond-zooter-job` | Their source no longer exists and nothing calls them, but they are live endpoints querying dropped tables |
| **Production voice is off** — `twilio.masked_voice` and `twilio.operational_messages` both false | **No real call has ever been placed on any surface** |
| `SUPABASE_DB_PASSWORD_PRODUCTION` missing | ⛔ Do not overwrite the shared secret — it is staging's |
| Store submission | Not started |
| **DM Mono and Caveat fonts** declared in `kit-tokens.css`, neither ships | Any surface using a price in mono or the script wordmark falls back silently |

---

## ✅ What is genuinely done

Schema migrated on both projects · every Edge Function redeployed with it · commission ladder,
pricing ladder and the R47/h legal floor implemented and guarded · Care+ · referrals · fare
splitting · suburb-proximity matching · the trust workflow · voice-over-data built (untested live) ·
**1238 tests across 120 files**, tsc clean, build clean, 4/4 security scans.

The homepage now carries the two sections the design put at positions 2 and 3, which it had never
had.

---

## ⛔ What I will not do

Blockers 1, 2 and the database password are console acts only the founder can perform.
`deploy-edge-functions.yml` is `workflow_dispatch` and production requires typing the project ref —
**neither Claude session triggers it unasked.** I prepare and verify; a human deploys.
