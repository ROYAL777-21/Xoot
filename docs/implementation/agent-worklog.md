# Agent worklog

Two Claude sessions work on this repo and **cannot message each other**. Neither can ask the
other what it is holding. This file is how they find out.

Roles and path ownership are in `/CLAUDE.md`. This file is the live state.

## How to use it

**Claim before you code, and push the claim.** An unpushed claim is invisible and therefore
useless. One commit containing only a worklog claim is a normal and good thing to do.

**Release the claim when you stop**, whether you finished or not. A stale `HOLDING` is worse than
no claim: the other session will route around work that is not actually happening.

**Read this file after every `git pull`.** The other session may have claimed something you were
about to start.

Newest entry at the top. Keep closed entries — the history is how each session learns what the
other has already tried.

---

## 🟢 HOLDING — work in progress right now

### Correctness & Safety — 2026-08-12

**Design-kit port.** Not yet started; claimed so the other session does not begin it.
Expected paths: `src/index.css`, `src/lib/design-tokens.ts`, `src/components/kit/**`.

> ⚠️ Touching a shared path: the port will reach `src/components/**` and `src/pages/**`, which
> neither role owns outright. If Release needs those files for the voice UI, say so here and I
> will sequence around it rather than both of us editing the same components.

---

## ✅ RELEASED — done, or stopped and available

### Correctness & Safety — 2026-08-12 — the R39 booking fee (ZD-026)

Done, pushed to `claude/xoot-ios-build-setup-0te1sl`, **not deployed**.

R39 became a fee on every booking, waived only for Care+. Renamed
`ONE_TIME_SERVICE_FEE_CENTS` → `BOOKING_FEE_CENTS`.

> ⚠️ **For Release, before you deploy anything:** `go-live.md` §3b. The web app must ship from
> `main` **before** `create-booking` and `create-booking-request`, and those two must go
> **together**. Production `create-booking` is at v15 and still runs the one-time rule — verified
> by reading the deployed body. Deploying the server first makes `Book.tsx` under-quote a
> recurring booking by R39, which is the CPA defect the change exists to remove.

Also in scope, for awareness rather than action:

- `create-booking-request` had no Care+ awareness at all and now shares
  `_shared/care-plus-membership.ts` with `create-booking`. Both are stale in production.
- Seven functions still pending the `governance-utils` redeploy — `support-respond`,
  `create-concierge-handoff`, `create-masked-call`, `ops-workflow`, `report-concierge-answer`,
  `send-booking-message`, `confirm-payment`. **These import no pricing module and carry none of
  the §3b constraint.** They can go at any time.
- `go-live.md` §3 said "use the release branch, not `main`" — corrected, that branch is gone.

### Correctness & Safety — 2026-08-12 — brand wordmark

`AuthReset.tsx` rendered `xoot` lowercase; `src/lib/brand-wordmark.test.ts` now guards it.
Relevant to Release only if a native or preview build snapshots that screen.

---

## Open questions between the roles

Neither session should answer these alone. Record the question, let the founder decide.

- **Nothing open.**

---

## Founder-only items

Neither session can do these. Listed so neither keeps re-discovering them.

| item | why no session can do it |
| --- | --- |
| `ENCRYPTION_KEY` (#28) | Supabase secret, console-only |
| Twilio Console voice URLs (§2c-0) | provider console, not code |
| Staging Twilio subaccount | account-level provider action |
| SOS device test (#36) | needs a real device |
| Device verification (#37) | needs a real device |
| Rotate credentials pasted 2026-08-07 | founder-held secrets |
| Dismiss the two by-design advisors | no MCP dismiss tool exists |
| Production deploy dispatch | deliberately a human act |
