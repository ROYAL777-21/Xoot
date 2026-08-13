# What only you can do

**This is the live list.** Every other checklist in `docs/release/` is history — several were last
reviewed in July and are wrong about the current state. If they disagree with this file, this file
is right; if this file is stale, fix it here rather than starting a seventh list.

Last measured: **2026-08-13 01:20 SAST**. Everything below was checked against the live issue
tracker, the workflow run history, or the working tree on that date — not carried forward on trust.

**Every item has a *proves it done*.** That is the part the old lists were missing, and it is why
they rotted: an item with no closing condition is never closed, only re-read.

---

## 1. Blocking other work

### 1.1 Merge `claude/session-continuation-3upt0l` into `main`

Two things are waiting on it: the *Arm the two-party call test* workflow, and the corrected voice
guides.

**Why no session can skip it:** a `workflow_dispatch` workflow is not dispatchable until it exists
on the **default branch**. Dispatching it on the feature branch returns `404 Not Found` — measured,
not assumed. So the workflow cannot even be proven to run until this merges.

> **Proves it done:** *Arm the two-party call test* appears in the Actions sidebar.

### 1.2 Open the Netlify deploy log

**⚠️ Netlify has not published `main` since ~00:45Z on 2026-08-13.** *Verify live deploy* has run
three times and found no build stamp each time, the last one **31 minutes** after the push.

The stamp shipped in `d64f403` (00:45Z). If Netlify had built that commit or any since,
`https://xoot.co.za/build-info.json` would exist. It does not. This is a change of state — the site
published fine at ~22:11 the night before.

Checked before reporting it, so this is not a false alarm: `netlify.toml`'s `/*` → `/index.html`
rule has **no `force` flag**, and Netlify serves a real file ahead of a non-forced redirect, so the
stamp would be reachable if it were in the published build.

**Why no session can do it:** outbound `CONNECT` to `xoot.co.za:443` is refused by the
organisation's egress policy — the proxy logs it as `connect_rejected`, gateway 403. A GitHub runner
is not restricted, which is why the check is a workflow; but the Netlify *dashboard* is yours alone.

Three candidates, indistinguishable from here: build queued, build failing, branch no longer wired.

> **Proves it done:** *Verify live deploy* reports ✅ for a commit.

---

## 2. The two guides you asked for — both now followable from a browser

### 2.1 Give staging its own Twilio subaccount

Today staging and production share Twilio account `AC93de1e…`. **Every staging test call bills the
live account and appears in its call log**, indistinguishable from a customer's, and a staging
credential leak is a production credential leak. `SECRETS_INVENTORY.md:56` forbids it and gate 0
fails the run on it.

**→ [`voice-gates.md` route B](./voice-gates.md)** — six Console screens, one value each, then the
seven secrets through the **Supabase Dashboard** (Project Settings → Edge Functions → Secrets).

There is also a script (route A) that does the four Twilio screens for you, but it needs a terminal.
**It is deliberately not a workflow and must not become one:** it prints a Twilio API Key Secret
that Twilio shows exactly once, and a workflow log is retained.

Two traps, both already paid for once here:
- Both **Auth Token** names get the same value. Setting only `TWILIO_AUTH_TOKEN` and not
  `TWILIO_WEBHOOK_AUTH_TOKEN` leaves five webhooks rejecting every inbound request with a silent 403.
- Both TwiML App URL fields are **POST**. GET is the default on one of them, and a GET Voice URL is
  a call that connects and then dies in silence.

No redeploy afterwards — Edge Functions read secrets at runtime.

> **Proves it done:** Actions → *Twilio self-test* → `environment: both` stops reporting a shared
> Account SID, and the two accounts' SIDs differ.

### 2.2 Place the first real two-party call

**No call has been placed on any surface, ever.** Everything else about voice proves configuration;
this proves sound comes out.

1. Actions → **Arm the two-party call test** → Run workflow. Nothing to fill in. (Needs 1.1 first.)
2. Read the run summary: two sign-in addresses, the booking URL, when the window shuts, four checks.
3. **→ [`voice-gates.md` §2c-i](./voice-gates.md), steps 4 to 6** — two *different* browsers (a
   private window shares the session store, so you end up calling yourself), allow the microphone on
   both, press call on one side.

⚠️ The callable window is only about **four and a half hours** wide, and outside it there is **no
call button and nothing on screen saying why**. If the button has vanished, re-run the workflow
before concluding the feature is broken — that is by far the most likely reason.

`voice-gates.md` has a table of every failure symptom and what each one means.

> **Proves it done:** the Twilio Console (Monitor → Logs → Calls) shows **two** call legs joining one
> conference — two, because both parties are dialled into a room rather than one to the other.

---

## 3. Small, each unblocks one feature

| what | where | proves it done |
|---|---|---|
| `ENCRYPTION_KEY` on both projects ([#28](https://github.com/ROYAL777-21/zoot-your-local-helpers/issues/28)) | Supabase Dashboard → Edge Functions → Secrets | gate-code storage stops refusing |
| `XOOT_CALL_TEST_PASSWORD` — **only if** you want the smoke passwords reset | repo → Settings → Secrets and variables → Actions | *Arm the two-party call test* accepts `set_passwords` |
| SOS activation ([#36](https://github.com/ROYAL777-21/zoot-your-local-helpers/issues/36)) — **do not just flip the constant**, it ships dark on purpose | needs a real device | the sequence in #36, in order |
| Device verification ([#37](https://github.com/ROYAL777-21/zoot-your-local-helpers/issues/37)) — Live Activities, widgets, Siri, App Links | needs a real device | each surface opened once on hardware |
| Rotate the credentials pasted into chat on 2026-08-07 | the issuing provider consoles | old values rejected |
| Dismiss the two by-design Supabase advisors | Supabase Dashboard | no MCP tool can do it |
| Production deploy dispatches | Actions, typing the project ref | **deliberately** a human act; no session triggers it unasked |

---

## 4. Decisions, not tasks

These need you to decide, not to click. They live in the tracker with their full reasoning and are
listed here only so they stop resurfacing as if they were unstarted work.

| # | decision |
|---|---|
| [#33](https://github.com/ROYAL777-21/zoot-your-local-helpers/issues/33) | ZD-005 schema source of truth — four written migrations blocked behind it |
| [#34](https://github.com/ROYAL777-21/zoot-your-local-helpers/issues/34) | the `zoot://` deep-link scheme — before first store submission, or never |
| [#38](https://github.com/ROYAL777-21/zoot-your-local-helpers/issues/38) | `--destructive` fails AA contrast, and worse in dark mode |
| [#40](https://github.com/ROYAL777-21/zoot-your-local-helpers/issues/40) | long bookings pay R27.95/h — the ladder is sub-linear in hours |
| [#41](https://github.com/ROYAL777-21/zoot-your-local-helpers/issues/41) | 200 jobs to reach the 20% commission floor is roughly two years |
| [#32](https://github.com/ROYAL777-21/zoot-your-local-helpers/issues/32) | voice: Proxy EOL and whether to keep the PSTN fallback at all |

---

## What is NOT on this list, and why

Things that look outstanding in older documents and are not:

- **The seven `governance-utils` redeploys** — already done. All seven carry a byte-identical deploy
  timestamp of 2026-08-12 17:13:54.778Z, and one deployed body was read to confirm it. This repo has
  now re-discovered this twice; it is written down here so it is not a third time.
- **Issues #29, #30, #31** — closed. `blocker.md`'s table still lists them as open.
- **`SUPABASE_ACCESS_TOKEN`** — present and working as a repository secret.
  `environment-readiness.md` says it is absent; that was true in July.
- **Twilio's production Voice URL** — fixed 2026-08-12 21:40. Gate 0 is green on voice for both
  projects.
- **R39 not shown on the price screen** ([#35](https://github.com/ROYAL777-21/zoot-your-local-helpers/issues/35))
  — it is shown, on both surfaces, with a Care+-waived variant. See the note on that issue; closing
  it is your call because it is a Consumer Protection Act claim.
