# What only you can do

Last measured **2026-08-13 11:00 SAST**, against the live databases and the Netlify API — not
carried forward on trust.

> ⚠️ **There are two founder registers, and this is only one of them.**
> `NEEDS-FOUNDER.md` at the repo root was created the same day as this file, by the other session,
> and carries founder items this one has never listed — **PayFast merchant credentials**, the **two
> Netlify production environment variables**, and the **invoice legal entity**. All three block
> revenue or a feature outright.
>
> Read both until one is retired. Which one survives is a founder call, recorded under *Open
> questions between the roles* in `docs/implementation/agent-worklog.md` — deliberately **not**
> resolved by either session unilaterally, and deliberately not fixed by copying the missing items
> here, because a fourth copy is how the previous seven registers rotted.
>
> *(Flag added by Correctness & Safety, 2026-08-14. `docs/release/**` is Release's path; only this
> block and the #34 row below were touched.)*

---

## Where production actually stands

**The backend is finished. The product has never been live.** Those are both true, and holding them
together is the whole picture.

| layer | state | evidence |
|---|---|---|
| Production schema | ✅ ZD-029 applied | `xooters` exists, `zooters` gone, `bookings.xooter_id` present |
| Production Edge Functions | ✅ all redeployed **with** it | stamped `1786613782233` = 09:36:22Z, one operation |
| Production data at risk | **none** | **0 bookings, 1 user** |
| Staging | ✅ same, plus its own Twilio subaccount | *db-push* run 10, *deploy* run 27, *self-test* run 16 |
| **The web app** | ❌ **never deployed** | Netlify serves a hand-uploaded `index.html` from **28 May** |
| **Payments** | ❌ **switched off** | `payments.provider_checkout` = false, both hosted-checkout controls false |
| **Voice in production** | ❌ off | `twilio.masked_voice` = false, `twilio.operational_messages` = false |
| A real call | ❌ never placed | on any surface, ever |

> The migration/function ordering hazard did **not** bite: both halves went together at 09:36:22Z.
> Production's schema and its functions match.

### The three things between here and a customer booking and paying

1. **Ship the front end** — `domain-setup.md`. Nothing merged since 28 May is live. This is the
   single biggest gap and everything user-facing is behind it.
2. **Turn on payments** — needs Stitch/Ozow credentials and a signed smoke test, then three controls
   flipped. Today the app cannot take money.
3. **`ENCRYPTION_KEY`** ([#28](https://github.com/ROYAL777-21/zoot-your-local-helpers/issues/28)) —
   without it a customer cannot save a gate or alarm code, and the function fails loudly.

Everything else is smaller: the two-party call, the production voice controls, store submission, and
five decisions in the tracker.

> ⚠️ **Orphaned deployed functions.** Production still carries `approve-zooter`,
> `admin-reject-zooter`, `submit-zooter-application`, `get-zooter-job-cards`, `redeem-zootcred` and
> `respond-zooter-job` from before the rename. Their source no longer exists in the repo and nothing
> calls them, but they are live endpoints querying tables that are gone. Harmless today; worth
> deleting so nothing rediscovers them.

---

## 1. Blocking other work

### 1.1 ✅ DONE — merged to `main`, and the arming workflow is proven

Merged 2026-08-13 and dispatched. **Run 1 succeeded in 48 seconds** with all four checks green:

```
✅ status is en_route or in_progress
✅ not cancelled
✅ window is open (start − 45 min)
✅ window has not closed (start + duration + 30 min)

Armed until 2026-08-13T06:11:21Z (about 255 minutes).
```

The merge was safe to make without asking because the diff contained **no runtime code** — two
workflows and documentation, nothing under `src/` or `supabase/`.

Recorded because it cost a round trip: a `workflow_dispatch` workflow is not dispatchable until it
exists on the **default branch**. On a feature branch the API answers `404 Not Found`, which reads
like a missing file rather than a policy.

### 1.2 ⚠️ ANSWERED — the Netlify site was never connected to the repo

Read from the Netlify API 2026-08-13, so this is no longer four candidates:

```
published_at  2026-05-28T19:47:45Z     ← nearly three months old
title         "Deploy triggered by upload"
deploy_source "api"        commit_ref  null
summary       "1 new file uploaded"    "No header rules processed"
```

**`xoot.co.za` serves a hand-uploaded `index.html` from 28 May.** The project `xoot-home-care` exists
and the domain and certificate are correctly attached — but nothing ever linked it to the repository.
No push has changed the live site, and none will until it is linked.

DNS is fine. **Do not touch GoDaddy.** The fix is four screens in Netlify:
**→ [`domain-setup.md`](./domain-setup.md)**

Three consequences worth stating plainly:

1. **The live site is not the app.** Nothing merged since 28 May is on it — the R39 fee, Care+, the
   rename, voice.
2. **The security headers are not live either** — *"No header rules processed"* means `_headers` has
   never been applied.
3. **"Netlify published at ~22:11" was this same file being served.** Nothing published then. A site
   that returns 200 looks identical either way, which is exactly why the build stamp exists.

> **Proves it done:** *Verify live deploy* reports ✅. That also opens the §3b pricing gate — they
> read the same stamp — which unblocks the production rename.

## 2. The two guides you asked for — both now followable from a browser

### 2.1 Give staging its own Twilio subaccount

Today staging and production share Twilio account `AC93de1e…`. **Every staging test call bills the
live account and appears in its call log**, indistinguishable from a customer's, and a staging
credential leak is a production credential leak. `SECRETS_INVENTORY.md:56` forbids it and gate 0
fails the run on it.

**→ Actions → *Provision the staging Twilio subaccount* → Run workflow.** Leave `confirm` blank for
a dry run; type `CREATE` to do it for real. It creates all four Twilio resources **and sets the seven
secrets on staging itself** — nothing to paste, and no secret is ever printed.

✅ **DONE 2026-08-13 09:42Z — the subaccount exists and staging's seven secrets are set.**
*Provision the staging Twilio subaccount* run 3, success, and **no secret value appears in the log**:
the API Key Secret went Twilio → 0600 file → Supabase, and a shell trap deleted the file.

The dry run before it (run 2) reached Twilio with your credentials and confirmed the ground was
clear: *"checking the parent account for an existing Xoot Staging subaccount… none found — good."*

Created on the new subaccount: an API key, a TwiML App named `Xoot Staging Voice` **already pointing
at staging's routable URLs over POST**, and a Conversations service. Born correct, so it cannot
repeat the 404 production shipped with.

`voice-gates.md` also keeps the by-hand Console walkthrough (route B) and the terminal script
(route A), for seeing what is created or for finishing up if the workflow fails partway.

Two traps the workflow handles for you, worth knowing because the manual routes do not:
- Both **Auth Token** names get the same value. Setting only `TWILIO_AUTH_TOKEN` and not
  `TWILIO_WEBHOOK_AUTH_TOKEN` leaves five webhooks rejecting every inbound request with a silent 403.
- Both TwiML App URL fields are **POST**. GET is the default on one of them, and a GET Voice URL is
  a call that connects and then dies in silence.

No redeploy afterwards — Edge Functions read secrets at runtime.

> ### ✅ PROVEN — *Twilio self-test* run 16, `environment: both`, 09:44Z, success
>
> The self-test **fails the run** when staging and production report the same Account SID. It passed,
> so they differ. Staging's own rows:
>
> ```
> OK  voice TwiML app       "Xoot Staging Voice" (AP8ff23ac…)
>                            https://fxmxyabdjqviqbcxmvlp.functions.supabase.co/twilio-voice-twiml (POST)
> OK  voice status callback  …/twilio-voice-status
> OK  conversations service "Xoot Home Services Conversation Staging" is reachable
> n/a TwiML apps on this account: One TwiML App on this account ← THIS PROJECT USES THIS ONE
> ```
>
> **One** app on the staging account — the two-apps-in-one-list ambiguity that made this dangerous to
> edit by hand is gone on that side.
>
> ⚠️ **Leftover worth knowing:** the production account still carries the *old* staging app,
> `AP2afeeb7… "Xoot TwiML App Staging "` (note the trailing space), which nothing now uses. Harmless,
> but it is the one that made "edit by SID, not by name" necessary. Delete it in the Console when
> convenient — the self-test still prints the warning while two apps are on the account.

### 2.2 Place the first real two-party call

**No call has been placed on any surface, ever.** Everything else about voice proves configuration;
this proves sound comes out.

1. Actions → **Arm the two-party call test** → Run workflow. Nothing to fill in. **Proven working —
   run 1 armed the booking in 48 seconds with four green checks.**
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
| **`XOOT_TWILIO_ACCOUNT_SID` + `XOOT_TWILIO_AUTH_TOKEN`** — unblocks §2.1 entirely | repo → Settings → Secrets and variables → Actions | *Provision the staging Twilio subaccount* passes its credential check |
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
| ~~[#34](https://github.com/ROYAL777-21/zoot-your-local-helpers/issues/34)~~ | ~~the `zoot://` deep-link scheme~~ — **decided and closed 2026-08-13** (ZD-028). `xoot://` primary, `zoot://` retained. What remains is provider-console work, not a decision: `NEEDS-FOUNDER.md` item 7 |
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

---

## 5. What the rename broke, and what fixing it cost

The other session's Xoot rename (ZD-029, 285 files, three migrations) is **good work** — I could not
fault the migration's core. Verified rather than assumed: zero residual `zoot` in any Edge Function,
`types.ts` fully regenerated (284 `xooter`, zero `zooter`), column renames correctly ordered after
table renames, and the `app_role` value renamed in place so every RLS policy follows without a data
migration.

**Four defects, all of one shape: things that name the brand but are not prose.**

### ① Five private routes lost their security headers

`npm run security:scan` failed with 13 findings on the merge result. The rename moved the app to
`/xooter/*` and updated the *asserter's* expectations, but not the files that set the headers —
`public/_headers` and `public/.htaccess` still said `/zooter/*`.

So `/xooter/jobs`, `/earnings`, `/kyc`, `/profile` and `/training` would have shipped with **no
`X-Robots-Tag: noindex` and no `Cache-Control: no-store`**. `/xooter/kyc` holds identity documents
and `/xooter/earnings` holds money; indexable and cacheable is not a cosmetic state for either.

The guard did its job — it failed against the real defect, which is the only evidence a guard is
worth having. It simply was not run.

### ②③④ Three check constraints whose *body* names the brand

The migration reasons carefully about constraint **names**: internal identifiers, never referenced by
application code, not worth the DDL. That is right. It was then silently extended to constraints as a
whole — and a constraint's **body** is not an internal identifier.

| constraint | effect |
|---|---|
| `payment_provider_reference_format_safe` — `like 'ZOOT-%'` | **failed the staging apply**, SQLSTATE 23514, statement 55 |
| `messages.sender_type` — `in ('user','zooter')` | every message a Xooter sends would be rejected |
| `xoot_concierge_feedback.role` — `in ('user','zooter')` | same shape |

Only the first failed loudly. The other two would have deployed clean and broken on first use —
`send-booking-message/index.ts:57` now writes `"xooter"`, and nothing that runs before a real user
would have caught it.

Fixed by finding the constraints **by definition** rather than by name: an inline `check (…)` gets an
auto-generated name, and a wrong guess in `drop constraint if exists` silently does nothing while the
`add` succeeds — leaving both constraints in place, the old one still rejecting `xooter`, and the
migration reporting success. A `DO` block over `pg_constraint` cannot fail that way.

---

## 6. Production is deliberately NOT carrying the rename

Staging has it; production does not. That is a decision, not an omission.

The §3b pricing gate in `deploy-edge-functions` reads `xoot.co.za/build-info.json` and refuses a
production deploy when it cannot. A **blank function list** — which is what the rename needs, because
all 33 functions must be redeployed the moment the migration lands — sets `writers=1`, so the gate
applies.

**A production dispatch today would apply the migration and then be refused the redeploys it depends
on**, leaving every function querying tables that no longer exist, with no forward fix.

So the order is fixed, and step 1 is yours:

1. **[`domain-setup.md`](./domain-setup.md)** — point `xoot.co.za` at Netlify from GoDaddy
2. *Verify live deploy* goes ✅ — which opens the pricing gate too; they read the same stamp
3. Tell me, and I run `db-push` → production, then `deploy-edge-functions` → production with a blank
   list, immediately after

Production's schema and its functions are consistent with each other right now. They stay that way
until all three steps can happen in sequence.
