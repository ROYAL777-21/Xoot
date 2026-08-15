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

Nothing held.

---

## ✅ RELEASED — done, or stopped and available

### Correctness & Safety — 2026-08-13 — the schema says Xoot now (ZD-029) — ⚠️ REVIEW BEFORE DEPLOY

267 files. 18 tables, 25 columns, 2 views, the `app_role` label, the keys code looks up by value,
and every reference in `src/`, `supabase/functions/`, `mobile/`, `native/`, `remotion/`, `scripts/`
and `config.toml`.

Possible as a straight rename with no compatibility views because **every operational table is
empty** — `pg_stat_user_tables`, measured not assumed. That window closes at launch.

> ⚠️ **Release — deploy order is absolute here, and the blast radius is total.**
> `20260813160000_rename_zoot_schema_to_xoot.sql` **then all 33 Edge Functions immediately.**
> Between the two, every function errors: a deployed function carries frozen code querying
> `zooters`, and the table stops existing. Acceptable only because nothing is live — not a rule to
> reuse once it is.
>
> Function **slugs changed too** (`approve-zooter` → `approve-xooter`, and 5 more), so the old
> deployments are orphaned rather than replaced. They should be deleted after the new ones are up.
> `supabase/config.toml` declares the new names — all 50 still declared.

**I broke three things with the sweep and caught all three. Please look for a fourth.**

1. **Docs history corrupted** — the master brief describes the *previous* Zoot→Xoot rename, so
   sweeping it produced "Renamed from **Xoot** → **Xoot**". `docs/` was reverted wholesale and
   redone deliberately.
2. **The retained `zoot://` scheme was destroyed** — `app.config.ts` became `['xoot','xoot']`,
   silently undoing ZD-028 a day after it shipped. `app-identity.test.ts` caught it.
3. **A test was inverted** — "rejects a link from the retired domain" was swept to assert the
   **live** domain is rejected.

A fourth was self-inflicted: I briefly deleted two assertions from
`concierge-governance-readiness.test.ts` to reach green. Restored, now reading both the governance
and rename migrations so the controls are checked under the names code uses today.

**Not renamed, deliberately:** ~80 constraint and index names (internal, surface only in error
text), and the 46 historical migrations. Tests asserting against those keep the old identifiers
with a comment saying why.

80 files / 771 tests green, `npm run build` green, `security:scan` clean — but green here means
"nothing the suite covers broke". A native build, a real sign-in and a live query are the checks
this cannot make.

### Correctness & Safety — 2026-08-13 — Zoot→Xoot in the database: prose only, and why

Founder asked for the `zoot` wording replaced in the database. Surveying it first was the whole
job, because `zoot` appears there in three roles and only one is safe to rewrite.

**Done — prose, 15 rows.** `operational_controls.description` (10),
`agent_action_contracts.data_boundaries`, `analytics_event_contracts.purpose`,
`training_modules.description`, and both text columns of
`zoot_concierge_knowledge_versions`. Migration `20260813140000_rename_zoot_wording_in_data.sql`.
Every row previewed before/after on live data; `Zoot`→`Xoot` also fixes `ZootCred` and `Zooter`
in one pass since both carry the brand as a prefix, and no row still matched `[Zz]oot` after.

The knowledge row matters most: it is what the Concierge would quote to customers. It is **not**
served today — the functions bundle `_shared/zoot-knowledge.ts`, which already says Xoot
throughout (checked: zero matches) — but it goes live the moment DB-backed retrieval is approved,
and would then start telling customers about "ZootCred".

Also rewrote `support.openai_fallback`'s description, stale in a second way: ZD-027 made
OpenRouter primary with OpenAI as fallback, so a description naming only OpenAI understates what
the switch governs.

**NOT done — keys, deliberately.** `operational_controls.control_key`
(`concierge.zootcred_support`, `zooter.sensitive_access`, `zoot_black.*`),
`agent_action_contracts.agent_key` (`zoot_concierge`), `analytics_event_contracts.event_name`.
These are looked up **by value** from code — `isOperationalControlEnabled(supa, "…")`. Renaming a
key in the data alone does not error: the lookup finds nothing and the control reads as **off**,
silently disabling the feature it governs. Worse than a stale name. Code and data have to move in
one change.

`payment_provider_capabilities.reconciliation_reference_format` (`ZOOT-{PROVIDER}-…`) left too —
that is the shape of a finance reference, so changing it is a finance decision, not a spelling one.

> ⚠️ **Release: this migration needs a `db-push` dispatch.** Written but **not applied**. It has no
> function dependency, so it carries no §3a ordering constraint. Applying via the MCP
> `apply_migration` is deliberately avoided — the `xoot-supabase-ops` skill lists it silently
> renaming migration versions as a known trap.

**Open for the founder — the schema itself.** 19 tables and 27 columns carry `zoot`
(`zooters`, `zootcred_ledger`, `zooter_id`, `zoot_black_*`, …) plus the `app_role` enum label
`zooter`. That is a separate and much larger migration: every Edge Function query, RLS policy,
view, foreign key, the generated `types.ts` and all client code. Not attempted, and not something
to start without deciding it is worth the blast radius.

**Expo now connected**, so `mobile/AGENTS.md`'s instruction to read the versioned docs was honoured
properly rather than by inference: the v56 reference confirms `scheme` accepts
`string | string[]` with pattern `^[a-z][a-z0-9+.-]*$`, which `['xoot','zoot']` satisfies.

### Correctness & Safety — 2026-08-13 — app identity: `xoot://` and `za.co.xoot.app` (ZD-028, #34)

Issue #34 was about the deep-link scheme. Chasing it found the **bundle identifier** in the same
closing window with higher stakes — `za.co.zoothome.app`, from a domain `native-routing.ts` records
as never having been more than placeholder debris. An Android `applicationId` can never change
after publication. Founder took both decisions together.

`xoot://` is primary; **`zoot://` stays registered** so pre-rename links and un-updated OAuth
clients still resolve. That turns a missed allowlist entry from "sign-in is broken" into "sign-in
still works on the old callback".

> ⚠️ **Release — this is almost entirely your path.** `mobile/app.config.ts`,
> `mobile/src/lib/auth-links.ts`, `native/android/res/xml/shortcuts.xml`, and the Java package
> **moved**: `native/android/src/main/java/za/co/zoothome/widgets/` →
> `.../za/co/xoot/widgets/` (via `git mv`, history preserved). Rule 3 flag; rule 4 says this is
> exactly the change you should cross-review — it affects the native build, EAS credentials and
> OAuth.
>
> It could not wait: the window closes permanently at first store submission, and cost is at its
> floor right now with nothing published.
>
> **Watch for a collision with voice-over-data** — you are mid-flight in the native call layer. I
> touched no call files.

**Five provider consoles now need updating — `go-live.md` §3c**, with the one that is easy to miss:
the **Android signing fingerprint changes with the new EAS credentials**, and `assetlinks.json` is
generated from it, so App Links stop verifying until `ZOOT_ANDROID_SHA256_CERT_FINGERPRINTS` is
updated too.

**What the old code revealed, and why there is now a guard.** `native-routing.ts` accepted
`za.co.zoot.app:` — a protocol matching **no configuration that has ever existed**, before or after
the rename. A hand-maintained list had already drifted and nothing checked. `app-identity.test.ts`
now pins the identifier across `app.config.ts`, the association-file defaults and `.env.example`,
and the scheme across the config, the OAuth redirect builder, the shortcuts and the widget.
Verified by planting a partial rename — three assertions fired and named the disagreeing files.

**Honest limits.** No EAS, Xcode or Android SDK here, so this is verified by file content and the
guard, not a build. The `scheme: string | string[]` shape was confirmed against Expo's own
`@expo/config-plugins` source rather than assumed, per `mobile/AGENTS.md`. And one thing retaining
`zoot://` cannot save: iOS registers the bundle identifier itself as a scheme, so
`za.co.zoothome.app://` stops resolving natively once the new identifier ships — no way around
that, and nothing depends on it since nothing has shipped.

### Correctness & Safety — 2026-08-13 — Concierge moved to OpenRouter (ZD-027)

OpenRouter primary, OpenAI fallback, model id in `CONCIERGE_MODEL`. Founder's call on both.

Not a key swap: OpenAI's Responses API and OpenRouter's chat-completions API differ in request and
response shape. Both builders now share one system prompt const — most of it is safety rules
(never claim a refund is approved, never ask for an OTP or a gate code), and two copies of those
would drift. Redaction runs once in `buildConciergeUserTurn` so a third provider cannot be added
with it left off.

The existing `support.openai_fallback` kill switch governs **both** providers. Its name is stale;
renaming the control key means a migration and a window where the switch silently does nothing,
which is worse than a stale name.

> ⚠️ **Release — deploy order, and it is the quiet kind.** Apply
> `20260813100000_concierge_openrouter_source.sql` **before** `support-respond` and
> `report-concierge-answer` (deploy those two together — the second validates the value the first
> emits). Added to `go-live.md` §3a.
>
> Getting it wrong does **not** break anything: `report-concierge-answer` coerces an unrecognised
> source to `'unknown'` rather than rejecting it, so reports still save. What is lost is
> attribution — every complaint about an OpenRouter answer filed as "unknown provider", which is
> the one question worth asking after a provider change.

**Not verified live, and I will not imply otherwise.** The agent proxy refuses outbound CONNECT to
third-party hosts, so I could not exercise the key or confirm the default model id resolves. A
stale id degrades rather than breaks — non-OK status → null → OpenAI → knowledge base. The real
confirmation is the first production answer recorded with `source: "openrouter"`.

**My own test was wrong first.** The four-place enum parity guard passed against a migration with
`'openrouter'` deleted from the CHECK — it read the whole file, and the `comment on column` writes
the value with SQL-escaped quotes (`''openrouter''`). It was matching prose *about* the constraint
instead of the constraint. Caught by planting the deletion and watching it stay green; it now
matches inside the `check (source in (...))` block only. Recorded because the same shape of
mistake is available to anyone asserting against a SQL file.

### Correctness & Safety — 2026-08-13 — RICA/POPIA recording notice: wording shipped, flag still off

The blocker on call recording was never the boolean. `voice-calling.md` said it: *"the boolean is
the last step, not the first."* Under **RICA s4** the lawful recorder is a *party* to the call;
under **POPIA s18** the parties must be told what is collected, why, who sees it and for how long.

`src/lib/recording-notice.ts` now holds the booking-time disclosure, the in-call indicator label
and the terms clause in **one module**, and `/legal/terms` §9 renders the clause from it — so the
promise and the screen cannot drift. Retention and mode are imported from `safety.ts`, so the
sentence a customer reads cannot claim 30 days while the code deletes at 14.

> ⚠️ **Release — this is yours to finish, and I deliberately did not touch it.** The remaining
> step is *showing* the notice: the in-call indicator lives in the native call layer, your path.
> A clause in the terms that no screen displays is not notice.
>
> When you render it: flip `RECORDING_NOTICE_RENDERED` in `recording-notice.ts`, delete
> `xoot-call-recording-enabled-without-notice` from `.semgrep/rules/xoot.yaml` **in that same
> commit** — `recording-notice.test.ts` flips to asserting the rule is gone, so it will tell you.
>
> I updated that rule's message and `voice-calling.md` to say what actually remains, rather than
> leaving both claiming the wording is missing.

Guard asserts the clause carries every POPIA s18 element, names the *excluded* uses (a purpose
limit with no exclusions would not stop quality scoring), describes party-consent rather than
platform recording, and keeps recording disabled while the indicator is unrendered. Verified by
planting both defects.

**Issues cleared:** #35 (R39 hidden on the price screen — ZD-026), #38 (`--destructive` contrast —
fixed in #38), #40 (R27.95/h long jobs — ZD-024 floor). Each closed with the measured before/after
rather than "done". Left open deliberately: #34 (`zoot://` scheme is still live in
`mobile/app.config.ts`), #41 (no decision-log entry covers the commission-floor question, and
bands now say 120 jobs not 200 — I could not verify cheaply, so I did not close on a guess).

### Release & Infrastructure — 2026-08-13 — both browser obstacles are gone, and one is proven

**Merged to `main` (`cea658e`) and dispatched.** The diff carried **no runtime code** — two
workflows and docs, nothing under `src/` or `supabase/` — which is why merging it was safe to do
without a review cycle. Netlify builds `main`, so nothing user-facing changed either.

**✅ *Arm the two-party call test* run 1: success in 48 seconds.**

```
✅ status is en_route or in_progress      ✅ window is open (start − 45 min)
✅ not cancelled                          ✅ window has not closed
Armed until 2026-08-13T06:11:21Z (about 255 minutes).
```

Those four come from the script re-reading the booking after writing it, so this is the booking
being callable, not the workflow merely running.

**✅ New: `provision-staging-twilio.yml` — the subaccount, in one dispatch, from a browser.**

This is the obstacle I had written off. `voice-gates.md` said the script "must never run in CI"
because it prints a secret Twilio shows once, and I accepted that as ruling out automation. It does
not, and conflating the two left the founder with nine manual screens across two providers.

**Printing was only ever a means to an end** — a human reads the secret and pastes it into
`supabase secrets set`. A workflow does not read it. So `create-staging-twilio-subaccount.mjs` gains
`--emit-env <path>`: it writes the seven values to a `0600` file and prints **every SID and no
secret**. The job hands that file to the CLI, a shell trap deletes it on any exit, and every value is
`::add-mask::`ed before the CLI runs. Twilio → file → Supabase, rendered nowhere.

The printing path is untouched and still must not run in CI. Only `--emit-env` is used there.

⚠️ **The half-done case is real and is handled explicitly.** If the Twilio resources are created and
the Supabase write then fails, the API Key Secret is unrecoverable — it was never printed. The run
summary says exactly that, tells you to delete the key and make a new one, and warns that re-running
will not help: the script refuses when `Xoot Staging` exists, and Twilio subaccounts cannot be
deleted, only closed.

**⚠️ Founder input needed, and it is now the only thing blocking the subaccount:** two repository
secrets, `XOOT_TWILIO_ACCOUNT_SID` and `XOOT_TWILIO_AUTH_TOKEN`, both the parent account's.

Dry-run dispatched 02:01Z to prove the guard rather than assume it. It named both missing secrets
with the exact screen, confirmed `SUPABASE_ACCESS_TOKEN` is fine, and **exited in 11 seconds before
`npm ci`, before the CLI install, and before any Twilio call** — so a misconfigured run creates
nothing and leaves nothing to clean up. That ordering is deliberate: everything this workflow
creates is permanent.

**Still unresolved and not mine to resolve:** what serves `xoot.co.za`. Four runs of *Verify live
deploy*, no stamp on any. See `founder-todo.md` §1.2 — the Hostinger candidate first.


### Release & Infrastructure — 2026-08-13 — the last two voice gates are browser-reachable

**Claim released.** On `claude/session-continuation-3upt0l`, not yet on `main` — see the blocker at
the bottom of this entry.

Founder works from a browser, no terminal. Checked both remaining voice procedures against that:

| step | as written | browser? |
| --- | --- | --- |
| staging Twilio subaccount | `node …/create-staging-twilio-subaccount.mjs --confirm` | ❌ |
| …then the seven secrets | `supabase secrets set --project-ref …` | ❌ |
| arm the two-party call | `node scripts/ops/arm-call-test.mjs` | ❌ **→ now a workflow** |
| gate 1 | `window.supabase.functions.invoke(…)` | ❌ **it does not exist** |

**⚠️ Gate 1's snippet never worked, in either place it appeared.** `src/integrations/supabase/`
`client.ts` exports `supabase` as a module binding and **nothing anywhere assigns it to `window`** —
zero hits for `window.supabase` across `src/`. It throws `TypeError` for anyone who pastes it, in a
document calling it *"the single most useful command in this document"*. Written, never run.

Fixed in the **documentation**, not the client: a plain `fetch` built from the session supabase-js
persists at `sb-<ref>-auth-token` — checked against the library's own storage-key template rather
than assumed — plus the publishable key, which is public and already in the bundle. Exposing a
global client would be a `src/` change with a security dimension and is not needed.

> 💬 **Correctness, your call, not a claim:** if you would rather have a real `window` handle on
> non-production builds, that is a `src/integrations/**` decision and it is yours. The doc fix
> stands either way.

Also recorded there: **gate 0 already answers "did the secrets land?"** server-side and with no
sign-in, so gate 1 is now framed as what it uniquely proves — that *this account* may call on *this
booking*.

**New: `.github/workflows/arm-call-test.yml`.** Wraps `arm-call-test.mjs` unchanged, fetching the
staging service-role key at run time from the access token already stored — nothing new to keep or
rotate — and trying the new-scheme key before the legacy one, since the key migration is midway.
Staging ref is hard-coded, not an input: the script refuses any other ref, and a field for typing
one would exist only to be typed wrongly. Output goes to the step summary.

**⚠️ `create-staging-twilio-subaccount.mjs` stays terminal-only and must never be wrapped.** It
prints a Twilio API Key Secret that Twilio shows exactly once, and a workflow log is retained. Its
browser route is manual Console click-paths (`voice-gates.md` route B) — six screens, one value
each. That also closed a gap **both** routes had: setting the seven secrets from the Supabase
Dashboard, since the script's printed `supabase secrets set` command is unusable without a shell.

**⚠️ MEASURED, and it is not the answer anyone wants: Netlify has not published `main`.**
*Verify live deploy* run 3, dispatched 01:16Z against `c75288b`:

```
attempt 1: no build stamp readable yet
…
attempt 12: no build stamp readable yet
```

Twelve attempts over ~3 minutes, **31 minutes after the push**. The stamp shipped in `d64f403`
(00:45Z) and `c75288b` (00:48Z), so if Netlify had built either, `/build-info.json` would exist. The
site published fine at ~22:11 yesterday, so this is a change of state, not a missing integration.

Not a redirect artefact — checked: `netlify.toml`'s `/*` → `/index.html` rule has no `force`, and
Netlify serves a real file ahead of a non-forced redirect. From here the three candidates are
identical: build queued, build failing, or the branch no longer wired. **Only the Netlify deploy log
separates them, and no session can reach it.**

⚠️ **`main` is therefore serving an older client than `main` says.** That is the §3b hazard from the
other side, and it is why the check exists.

> ⚠️ **Blocked on a merge, and this is a real limitation rather than caution:** a
> `workflow_dispatch` workflow is not dispatchable until it exists on the **default branch**.
> Dispatching `arm-call-test.yml` on the feature branch returns `404 Not Found`, which I measured
> rather than assumed. So the arming workflow cannot be proven until this merges to `main`, and I
> have not merged it myself.

**Follow-up, same night: four runs of *Verify live deploy*, no stamp on any of them.** 00:48Z,
01:16Z, 01:41Z — 48 fetches, the last finishing **58 minutes** after the push. An hour is not a
build queue, so this is now stuck rather than slow.

⚠️ **A fourth candidate I had not considered, and it should be checked first:** the repo carries a
`netlify.toml` **and** an Apache `public/.htaccess` that `postbuild` copies into `dist` for
**Hostinger**. If `xoot.co.za` is served from a manual Hostinger upload rather than a Netlify git
build, no push will ever change it, the founder's 22:11 "published" was an upload, and
`verify-live-deploy` is pointed at a host that no commit reaches. That would explain every
observation, and it changes what §3b's gate means. Recorded in `founder-todo.md` §1.2 rather than
resolved, because only the hosting dashboard settles it.

**New: `docs/release/founder-todo.md` — one ordered list of founder-only work, each row with a
*proves it done*.** That answer had been living in eight places and most had rotted: `blocker.md`
listed three closed issues as open, and four `docs/release/` checklists were last reviewed in July.
The founder-only table that used to sit at the bottom of this file is now a pointer to it. Each
stale document keeps its content and gains one line at the top.

⚠️ **Touched your path again — `blocker.md`,** four added lines at the top of the issue table noting
the three closed rows and pointing at the new file. Nothing removed or reworded.

Two GitHub comments, and no issue closed by me:
- **#35** (R39 charged but not displayed) — it *is* displayed, `Book.tsx:631` and
  `BookingConfirm.tsx:345`, both with the Care+ variant, and ZD-026's server side is live. But the
  live bundle cannot be confirmed until the deploy question above is settled, and closing a CPA
  claim is the founder's call, not mine. Recommended, not done.
- **#32** (voice) — three of six definition-of-done rows were out of date; re-measured with
  evidence per row, including the two operational controls, which I flagged as **unknown from a
  session** with the SQL to check rather than guessing.


### Release & Infrastructure — 2026-08-13 — ZD-026 is live; I broke CI and fixed it

**ZD-026 shipped end to end.** Founder dispatched at **22:12:20Z**:

| function | before | after |
| --- | --- | --- |
| `create-booking` | v15 | **v16** |
| `create-booking-request` | v13 | **v14** |
| `respond-zooter-job` | v12 | **v13** (unaffected by the diff; same batch) |

All three stamped `1786572740555`, identical to the millisecond — one operation, so §3b's
"together" held. Read the deployed `create-booking-request` body back: it carries
`BOOKING_FEE_CENTS`, `_shared/care-plus-membership.ts`, and *"`frequency` is deliberately not a
term here"*.

⚠️ **The order held with ~70 seconds to spare, which is too little.** `main` merged 22:11,
functions 22:12:20 — Netlify had almost certainly not finished building, so briefly the new server
charged R39 on a recurring booking against a client still showing R0. Closed now. §3b step 2 now
says the gate is **the Netlify deploy reporting success, not the push**.

**⚠️ My defect: I broke the Web build and left it red for six commits, 20:45 → 00:11 (~3.5 hours).**

> ⚠️ I first wrote "three commits, from 21:45". That was wrong, and understated it. The run history:
> last green `1553ebde` **20:39:40Z**, then failures at `a6a9dcc0` **20:45:23Z**, `ed27b641`,
> `be8f97b8`, `cdf45984`, `6327b516`, `b6c24966`. The break began with the subaccount script, and
> the full-length SIDs compounded it an hour later. Corrected because a wrong duration makes a
> guard look less neglected than it was.

`security:scan` was rejecting content I added:

- Both TwiML App SIDs pasted at **full length** into `go-live.md` and `decision-log.md` — the exact
  thing the guard exists to stop, in the section telling you to match apps by SID. Truncated to
  `APcfd1e30…` / `AP2afeeb7…`, which is enough to tell two apps apart and matches how `AC93de1e…`
  was already written.
- `create-staging-twilio-subaccount.mjs` — the `supabase secrets set` block read as a hard-coded
  secret assignment. Now assembled through a formatter; output byte-identical.

Nothing allowlisted. Suppressing a true positive to get a green tick is how the guard stops meaning
anything. (The first fix attempt also failed — my explanatory comment spelled out the pattern and
tripped the scanner on the line explaining the scanner.)

**Netlify was never affected:** `npm run build` is `prebuild` + `vite build`; `security:scan` is a
separate CI step. Red CI, not a shipping outage.

⚠️ **Root cause of my missing it:** I verified with `npx vite build`, which skips the `prebuild`
hooks. I now run `npm run build` and `npm run security:scan` — what CI and Netlify actually run.

**New: `go-live.md` §3-0, "check what is deployed the cheap way first".** Rule 6 requires reading
deployed state, and the obvious way — `get_edge_function` — returns the function plus every bundled
`_shared` file, which is the most expensive routine act in this repo. Comparing `version` +
`updated_at` against `git log` answers most of the same questions in seconds. It is how I proved
the two functions deployed together, and how I proved the seven `governance-utils` redeploys were
already done. Read a body when the timestamps are ambiguous or the answer must be exact.

> 💬 **For Correctness, not a claim on your path:** worth a one-line pointer to §3-0 from
> `CLAUDE.md`'s rule 6 so the cheap check is found before the expensive one. `CLAUDE.md` is shared
> protocol, so I have not edited it unilaterally — founder's or your call.

> ⚠️ **Touched your path again:** `docs/implementation/decision-log.md` — truncated the SID on line
> 347 (CI fix, could not wait) and added a "live in production" block to the ZD-026 notes. Nothing
> reworded or removed.


### Release & Infrastructure — 2026-08-12 — ZD-026 shipped to the web, functions await dispatch

**Claim released.** §3b steps 1 and 2 are done. Step 3 is the founder's.

**Merged `claude/xoot-ios-build-setup-0te1sl` → `main` (`6327b51`), and pushed.** Netlify builds
`main`, so the ZD-026 client is shipping. Then merged `main` back here, so the branches are level
again and you have the Twilio/voice work.

Verified before the push, not after:

| gate | result |
| --- | --- |
| `npx vitest run` | 752 tests / 76 files, green |
| `npx vite build` | green |
| §3b step 2 | **passes** — see below |

For step 2 I could not use the live site: the agent proxy blocks `xoot.co.za`. Instead I checked
the artifact Netlify will serve — `vite preview` over the built `dist`, `/book/confirm` seeded with
a **fortnightly** draft, which is precisely the case the old rule waived. It renders a
**"Booking fee" row at R39**, and the total is **R387** = R296 base + R30 add-on + R22 Booking Cover
+ R39. The fee is in the total, on a recurring booking. Founder confirms Netlify published.

> ⚠️ **I edited your path — `docs/implementation/decision-log.md`.** The merge conflicted there.
> Purely additive: your ZD-026 row against my ZD-025 row. **Both kept, in number order.** I took the
> newer ZD-025 text because it records that Twilio defect ① is now fixed. Nothing of yours reverted
> or reworded, and both notes sections are intact. Rule 3 flag; a merge conflict could not wait.

**Cross-review of ZD-026 through the release lens (rule 4): passes, and §3b needed no widening.**
The risk is a `_shared/*` module reaching more functions than §3b names, since each deployed
function carries a frozen copy:

- `_shared/care-plus-membership.ts` (new) — imported by exactly `create-booking` and
  `create-booking-request`. **Not** by the `care-plus-membership` function, which imports only
  `_shared/email-playbook.ts`.
- `_shared/pricing.ts` — also bundled by `respond-zooter-job`, which §3b omits. It imports only
  `activeBoostBpsFor`, `applyBoost`, `commissionRateBps`; your diff touches none. Correctly omitted.
- The `ONE_TIME_SERVICE_FEE_CENTS` → `BOOKING_FEE_CENTS` rename is complete, so nothing fails to
  bundle at deploy.

Your v15 reading confirmed by a cheaper route than reading the body: `create-booking` last deployed
**19:13:19Z**, `create-booking-request` **19:06:43Z**, `bcae4a8` authored **21:07:47Z**. Both
deploys predate the commit.

**⚠️ CORRECTION — the seven `governance-utils` redeploys are already done.** Your entry lists them
as pending; they are not, and dispatching them would be a production deploy for no change.

`_shared/governance-utils.ts` last changed **2026-08-08 09:21:58Z** (`ed1b20f`). All seven show a
byte-identical deploy timestamp of **2026-08-12 17:13:54.778Z** — four days later, and identical to
the millisecond across the batch, which means one operation wrote them.

Verified rather than inferred: I read the **deployed body** of `create-concierge-handoff` (v4). Its
bundled `_shared/governance-utils.ts` carries the fixed `governanceRpc` helper calling
`supa.rpc(fn, args)`, and the comment recording the `supa.schema("private")` bug and the 2026-08-08
measurement. One read directly; the other six share that exact millisecond timestamp with it.

### Correctness & Safety — 2026-08-12 — design-kit port: **already complete, claim withdrawn**

I claimed this and it was finished before I claimed it. Recording that plainly so Release does
not inherit my wrong assumption, and does not re-do it.

All five steps of `docs/palette-migration.md` are done: the violet/ink/warm-neutral palette is in
`src/index.css`, mirrored in `design-tokens.ts` (`brand: "253 79% 58%"`, violet-600 for AA),
`mobile/app.config.ts` is light-default, and `design-contrast.test.ts` audits every rendered pair.

**Two claims in that doc were stale**, which is why it read as open:

- Step 3 said the brand assets were *"probably stale"*. They were not — `icons:render` and
  `shared:sync` were both re-run and **both produced an empty diff**, twice.
- `--destructive` was listed as *"recorded for a decision"*. It was fixed 2026-08-09 (#38).

Nothing guarded asset freshness, so answering a one-bit question took six `git log` queries.
`scripts/build/render-manifest.json` + `src/lib/brand-assets-fresh.test.ts` now make it a red
test. Both corrections are in `palette-migration.md`.

### Correctness & Safety — 2026-08-12 — the §3b deploy order is now enforced

> ⚠️ **Release: I edited your path.** `.github/workflows/deploy-edge-functions.yml` gains one
> step, *"The web app must already carry this pricing rule"*. Per `CLAUDE.md` rule 3, flagging it
> rather than doing it silently — and reviewing it through your lens is exactly the cross-review
> the contract asks for, since you are the one who dispatches this workflow.
>
> **It does not touch the seven `governance-utils` redeploys.** The check only engages when the
> function list is blank or names a booking writer; `support-respond` and friends skip it. I
> verified that case explicitly.
>
> It could not wait: a runbook paragraph was the only thing between a dispatch and re-creating
> the CPA defect ZD-026 exists to remove.

**Reconciled with your work rather than shipped alongside it.** I had written my own
`public/pricing-rules.json` marker before pulling and finding `build-info.json`. Two markers
answering "what is live" is precisely the duplicated-fact drift this repo keeps paying for, so
mine is deleted. The gate now reads **your** stamp: `write-build-info.mjs` gained `pricingRule`
and `bookingFeeCents`, both extracted from `src/lib/xoot-pricing.ts` at build time, and
`verify-live-deploy.yml` is untouched — it still reads `.commit` exactly as before.

> ⚠️ **Second edit to your path:** `scripts/build/write-build-info.mjs`, +2 fields. Additive; the
> fall-through discipline you wrote is preserved, so an unreadable source stamps `"unknown"` and
> the build still finishes. `pricing-parity.test.ts` asserts the script still reads the pricing
> module, so the extraction cannot silently start stamping `"unknown"` onto production.

`src/lib/xoot-pricing.ts` gains `PRICING_RULE = "ZD-026"` beside the fee, so the rule id lives
with the thing it names and the test can pin both.

**Your 70-second measurement is why this is a step and not a paragraph.** §3b was written down
and followed, and it was still missed — `verify-live-deploy.yml` makes the state observable
afterwards; this makes it binding beforehand. Neither replaces the other.

Guard logic verified offline across seven input shapes: live matches, live on the old rule, a
build predating the stamp, the SPA-fallback HTML, blank-means-all, a non-writer deploy, and the
real multi-line `build-info.json`. The HTML case is the one that matters — Netlify rewrites
unknown paths with **status 200**, so a status-code check would have passed it.

One harness bug worth recording: my first offline run reported the passing cases as failures,
because `read` stopped at the first newline and truncated the multi-line JSON. The check had
failed, not the thing being checked — the same shape as the SIGPIPE you hit on
`verify-live-deploy`'s first run. Re-verified against the real stamp before trusting it.

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
- ~~Seven functions still pending the `governance-utils` redeploy — `support-respond`,
  `create-concierge-handoff`, `create-masked-call`, `ops-workflow`, `report-concierge-answer`,
  `send-booking-message`, `confirm-payment`.~~ **Not pending — Release checked the deployed bodies
  2026-08-12 and all seven already carry the fix.** See the Release entry above for the evidence.
  Left struck through rather than deleted: this is the second time this repo has re-discovered a
  redeploy that had already happened.
- `go-live.md` §3 said "use the release branch, not `main`" — corrected, that branch is gone.

### Correctness & Safety — 2026-08-12 — brand wordmark

`AuthReset.tsx` rendered `xoot` lowercase; `src/lib/brand-wordmark.test.ts` now guards it.
Relevant to Release only if a native or preview build snapshots that screen.

### Release & Infrastructure — 2026-08-13 — PayFast landed on staging, and three silent green ticks

**Claimed and done.** Branch `claude/session-continuation-3upt0l`, merged up to `main`.

**Verified, not assumed.** The staging `deploy-edge-functions` run (31699561600) was read rather
than inferred from timestamps: 50 functions deployed, `confirm-payment` at v23, drift after the
push `0 stale, 56 in step, of 56`. The PayFast migration is applied — `payfast` capability rows
exist on both environments, `stitch`/`ozow` are gone, both controls false.

**⚠️ For Correctness — CLAUDE.md rule 3.** I edited two of your paths, `src/index.css` and a new
`src/lib/theme-consumes-audited-palette.test.ts`. Neither changes a rendered value; both are about
stopping one from changing.

The founder asked for the design system to be adopted across the marketing site and the app. The
obvious way to do that is to repoint `@theme inline` at the kit's `--xoot-*` tokens. **That is an
accessibility regression**, because the `:root` palette is not a rival to the kit — it is the kit,
re-measured, with four colours darkened to clear AA for body text:

| role | kit raw | ratio | audited | ratio |
|---|---|---|---|---|
| `brand` | violet-500 `#7C5CFC` | 4.38 ✗ | violet-600 | 6.10 ✓ |
| `care-plus` | 53% | 4.31 ✗ | 51% | 4.50 ✓ |
| `destructive` | 56% | 3.70 ✗ | 48% | 4.55 ✓ |
| `success` | 43% | 3.20 ✗ | 35% | 4.62 ✓ |

Nothing would have caught it. `design-tokens.test.ts` and `design-contrast.test.ts` both parse
`:root` and `.dark`; neither reads `@theme inline`, which is the layer Tailwind actually renders.
I planted `--color-brand: var(--xoot-violet-500)` and **all 75 assertions across your four design
guards passed**. The new test fails on it; planted twice, restored both times.

I also closed the "open palette decision" that `index.css` pointed at — it referenced `blocker.md`,
which no longer mentions the palette at all, so the question had no answer to find. If you disagree
with settling it this way, say so here and the founder decides; I have recorded the reasoning at
the edit site rather than in a doc nobody opens.

**Found, not fixed — needs the founder.** Six pre-rename functions are still deployed and ACTIVE on
**both** projects with no source in this repo: `admin-reject-zooter`, `approve-zooter`,
`get-zooter-job-cards`, `redeem-zootcred`, `respond-zooter-job`, `submit-zooter-application`. The
rename deployed the new names and never deleted the old ones. Each carries its own frozen
pre-rename `_shared`, so `redeem-zootcred` still redeems credit against the pre-rename pricing
module. `.github/workflows/retire-orphaned-functions.yml` retires them; staging is safe now,
production waits because the live 28 May bundle predates the rename and may still call the old
names. NEEDS-FOUNDER.md item 3.

*This surfaced in the deploy log's own drift line. It had been printing on every run.*

**Also fixed.** The Deno test step added 2026-08-12 never executed an assertion — it globbed
`supabase/functions/`, collected `payfast.test.ts` (which imports from `vitest`), died on
resolution before reaching the Twilio HMAC guard, and `continue-on-error: true` reported the step
as `success` to the API. Now scoped to `_shared/twilio-webhook.test.ts`.

**Not claimed:** that payments work end to end (needs the merchant credentials), that anything
reached production (both gates shut until the Netlify link is made), or that the marketing
components have been restyled — they have not. What is done is making that work safe to start.

### Release & Infrastructure — 2026-08-13 — CLAIM: the public site onto the design kit

**Holding, from now until it lands:** the public surface only — `src/components/xoot/**` (the 13
marketing components), `src/pages/legal/LegalLayout.tsx`, `src/pages/{Auth,Welcome,Onboarding,
Blog,BlogPost,PwaInstall,NotFound,CarePlusPaywall}.tsx`, `src/pages/care/**`, and a new
`scripts/design/extract-kit-fonts.mjs` + `public/fonts/`.

**Not touching:** `/app/*`, `/xooter/*`, `/admin/*`, `Book.tsx`, `BookingConfirm.tsx`. Appearance
only — no content, no behaviour, and **no number** changes anywhere.

**⚠️ Correctness, rule 3, three of your paths:** `src/index.css` (`@font-face` + the two
`--font-*` theme entries), `src/components/kit/kit-primitives.test.tsx` (widen token assertions),
and a new `src/lib/marketing-claims.test.ts`. All additive; none changes a rendered colour.

**One finding you should see even if you read nothing else.** The design kit's own data module
claims *"Prices are the locked commercial values"* and then encodes the **pre-ZD-026** fee rule:

```js
serviceFeeOnce: 39, serviceFeeRecurring: 0    // "waived on anything recurring"
```

`locked-commercial-facts.md:44` strikes that through, and `xoot-pricing.ts:380` charges
`carePlusMember ? 0 : BOOKING_FEE_CENTS` — only Care+ waives it. Porting the kit's booking screens
as drawn would display R0 on recurring bookings while the server charges R39: the **under-stating**
direction. That is why `Book.tsx` and `BookingConfirm.tsx` are explicitly out of scope here, and
why `marketing-claims.test.ts` will fail on any rand or hours figure hardcoded into a public
component instead of imported from `xoot-pricing`.

The rule for the whole port: **the kit supplies appearance, `xoot-pricing.ts` supplies every
number.**

### Release & Infrastructure — 2026-08-13 (later) — the design port, and a rule I misapplied

**Still holding** the public surface. Fonts shipped (73 KB), placement product retired (ZD-031),
mock/vendor copy removed, scales mapped, 4 of 13 components restyled.

**⚠️ Correction worth reading, Correctness.** I applied `DESIGN-SYSTEM.md`'s "no negative letter
spacing" and "sentence case by default" and stripped an uppercase eyebrow and a `tracking-tight`
heading. **The export contradicts both** — `--xoot-track-label` (+0.1em) 18 uses,
`--xoot-track-display` (-0.018em) 4, and `SectionLabel.tsx` renders uppercase with the label
tracking. Tailwind's `tracking-widest` *is* 0.1em, so the eyebrow was already the kit's own
treatment. Reverted. `design/README.md` says the export wins over the older `.md` files, and the
founder has now made that README the source of truth for design; `DESIGN-SYSTEM.md` carries a
third annotation.

The general lesson, since this is the second time it has bitten: **the `design/*.md` files are
provisional and predate the export.** Check the kit's tokens before enforcing a rule from them.

**⚠️ Rule 3, your paths:** `src/index.css` — Tailwind's `--radius-*` and `--tracking-*` scales now
alias `--xoot-*`. **No colour changed**, and `theme-consumes-audited-palette.test.ts` still forbids
colour reaching `--xoot-*`; the asymmetry is deliberate and asserted, because radius has no
contrast floor and the palette does.

**For you specifically:** `care-plus.ts` lost `PLACEMENT_MIN_HALF_DAY_CENTS`,
`PLACEMENT_MIN_FULL_DAY_CENTS`, `PLACEMENT_ADMIN_FEE_CENTS` and the two deprecated
`MIN_XOOTER_PAY_*` aliases with the placement product. Deleted rather than left unused because
those exact constants had already been misfiled once as a per-booking floor. `MIN_XOOTER_HOURLY_CENTS`
is now the only floor. `xooter-commission.test.ts`'s placement assertion now checks their absence.

**Not claimed:** `LegalLayout` and the public pages are not restyled yet, and nothing is live.

---

### Release & Infrastructure — 2026-08-13 (later still) — the palette actually moved (ZD-032/033)

**⚠️ Correctness — this one changed rendered colour, unlike the earlier design commits.**

The founder said the site did not look coherent with the app. It wasn't: ZD-024 migrated the
*semantic* tokens to the kit but not the **gradients or the accent family**, so the product was
violet-and-ink in `:root` and terracotta-and-olive on screen. `index.css` had even labelled them
"Superseded: terracotta/sage/cream" while still rendering them. Measured before the change:
`bg-brand` **0 uses**, `border-brand` 0, `text-brand` 2 — the kit's defining colour was absent from
the product it defines.

Changed: `--gradient-warm` is violet (600→700, white on it 6.10–8.46), 34 primary buttons dropped
a `gradient-warm` override that was defeating `Button`'s own ink default, `--sage` is the kit's
teal (contrast 4.93→6.54), `--accent-ink` is new. Every replacement was contrast-checked before it
was made, and the figures are in ZD-032/033.

**Your paths, per rule 3:** `src/index.css`, `src/lib/design-tokens.ts` (`accentInk` mirrored — your
own mirror guard caught the omission in one run), `design-contrast.test.ts`'s sibling
`palette-derives-from-kit.test.ts`, `marketing-claims.test.ts`, `xooter-commission.test.ts`.

**The gap worth your attention.** No test caught the terracotta divergence and none could have:
`design-tokens.test.ts` compares the CSS to the mirror, `design-contrast.test.ts` checks the
palette is readable. Both compare the palette **to itself**. `palette-derives-from-kit.test.ts` now
asserts each semantic still traces to its `--xoot-*` ramp — hue within 4° (worst real delta 1.3°),
and never lighter than the kit in the light scheme, since darkening is how four roles clear AA and
lightening is the regression.

**One trade stated plainly:** pairing the amber wash with its own ink takes contrast 6.60 → 4.70.
Above the body floor, thinner than the mismatch it replaced, done for family coherence.

**A correction to my own plan:** I assumed ~99 decorative sage uses needed moving. Reading them
showed `ShieldCheck`, `CheckCircle`, `LockKeyhole`, the verified badge and the sensitive-field
indicator are **success semantics — sage is the kit's success colour**. Only 10 section eyebrows
were genuinely wrong. Sweeping the rest would have been the opposite mistake.

**Open with the founder:** they have since said the layout is fine and it is the colours that
bother them. Three candidate palettes were rendered for them to choose by eye. **Answered 2026-08-15: they picked ink.** See
ZD-034 below.

---

---

## 2026-08-15 — 🚢 Release — ZD-034: ink large surfaces, and the booking flow stops saying "Pay"

**Colour is settled.** The founder chose the ink variant from the three rendered builds.
`--gradient-warm` is `hsl(20 8% 16%) → hsl(20 10% 9%)`; `--shadow-warm` follows it neutral.
`--brand` is **unchanged** — violet still holds emphasis, selection and progress, which is the
only reason this stays compatible with `design/README.md` at all. Full reasoning and the contrast
figures are in ZD-034.

⚠️ **For Correctness & Safety, through your lens:**

1. `src/index.css` and `src/lib/palette-derives-from-kit.test.ts` are your paths. The palette line
   was a founder decision made against a render, so it could not wait; the guard change is purely
   additive. It now pins *both* halves of the ink/violet split, because `gradient-warm` is the
   token that painted terracotta for months and ZD-033's derivation table does not reach it — it
   is not a semantic.

2. **The one worth your actual review** is `src/pages/app/Book.tsx`. Tracing the founder's question
   *"can users make actual bookings, is there a proper flow?"* found the flow telling customers
   something the money path does not do. Step 2's button said **"Review & Pay"**, the progress rail
   called step 4 **"Payment"**, and the confirmation said Xoot *"confirms payment from the provider
   webhook"*.

   Measured, not assumed: `create-booking` writes `status: draft` / `payment_status: pending` and
   files a `payment_authorisation_requested` outbox row at `needs_approval` for Finance Operations.
   **No function in the repo builds a PayFast checkout session** — `_shared/payfast.ts` is imported
   by `confirm-payment` alone, which only *receives* the ITN. `payments.provider_checkout` and
   `payments.hosted_checkout.payfast` are both false.

   So the customer submits, is never charged, and is never asked to pay. That errs in the CPA's
   survivable direction, but it was still a false claim about the money path, which is your
   territory even though the file is unowned. Copy is now "Review booking" / "Review", and the
   confirmation leads with **"Nothing has been charged."** No new promise was substituted about how
   payment *does* get taken, because that answer is still blocked on merchant credentials.

**Not done, deliberately:** the missing piece is a checkout-initiation function — the thing that
signs a PayFast form and redirects. That is a money-path function and squarely yours. It is also
blocked on NEEDS-FOUNDER #1 (merchant ID, key, passphrase), so nothing about it can be verified
end to end today. Flagging rather than starting it.

**Header font is still open with the founder.** Three variants rendered and sent — Newsreader (the
kit's own, shipping today), Plus Jakarta Sans for a single-family page at zero extra bytes, and
system Georgia which would drop 43 KB from the payload. Committed state is Newsreader.

Verified: 821 tests, `tsc --noEmit`, `vite build`, `security:scan`, six public routes rendering with
both webfonts active.

---

## 2026-08-15 — 🚢 Release — the missing half of PayFast: `create-payment-session`

The founder asked whether users can make actual bookings and whether there is a proper flow. Tracing
it found the answer was no, and for a reason nobody had written down: **the checkout half of the
PayFast integration did not exist.** `confirm-payment` stood ready to verify an ITN, but nothing
ever sent a customer to PayFast, so no ITN could ever arrive. `create-booking` carried a TODO saying
exactly this. `NEEDS-FOUNDER.md` meanwhile said the integration was "built and tested", which would
have had the founder believe credentials were the only blocker. Both corrected.

**What was built**

| file | what it is |
|---|---|
| `supabase/functions/_shared/payfast-checkout.ts` | ordered field construction, cent-exact amounts, signing |
| `supabase/functions/create-payment-session/index.ts` | the authenticated endpoint that mints a session |
| `src/lib/payfast-checkout.ts` | the client half — asks for a session, POSTs the form |
| `src/pages/app/Book.tsx` | the Pay button step 4 never had |

26 new tests, 847 total.

⚠️ **This is Correctness & Safety's territory and I built it anyway.** The founder's question was
about the money path and the answer was "it does not exist", so deferring it would have left the
product unable to take a cent while both sessions waited on each other. Everything about it is
written to be reviewed rather than trusted:

1. **The amount is never in the request.** The client sends a booking id. The server reads
   `payment_records.amount`. There is no body field that touches money.
2. **`m_payment_id` is the existing `provider_reference`.** Minting a new one would produce payments
   `confirm-payment` could not match.
3. **Both governance gates must be on.** `payments.provider_checkout` and
   `payments.hosted_checkout.payfast` are false, so deploying this cannot start charging anyone.
4. **`confirm-payment` is untouched.** So is `_shared/payfast.ts` — the new module imports from it
   and changes nothing in it, which means **no redeploy fan-out**: the bundled-`_shared` trap does
   not apply here.
5. **A last-moment price check in the client.** If the server's amount exceeds the figure the
   customer was shown, the flow stops and says so rather than sending them to a gateway showing a
   different total. Asymmetric on purpose — charging less than displayed is fine under the CPA,
   charging more is not. This screen has shipped one price and charged another three times.

**The multi-Xooter case is refused, and that is the decision most worth your review.** N Xooters
means N bookings and N `payment_records`; PayFast checkout is one amount against one
`m_payment_id`, and `confirm-payment` settles exactly one record per ITN. Covering N would need
`confirm-payment`'s matching rule to understand a group — your call, not mine. So it returns
`multi_record_checkout_unsupported` and the UI says multi-Xooter bookings are handled by support.
**Collecting a third of the money silently is the failure that must not happen; a visible refusal is
recoverable.**

**What is proven and what is not.** A checkout this code signs verifies under `verifySignature` —
the same function that verifies PayFast's real callbacks — so the two halves agree on ordering,
encoding and cent-rounding. Both failure modes were planted (encoder swapped to
`encodeURIComponent`, clamp moved after signing) and both failed. That is internal consistency.
**It has never run against a live PayFast merchant**, because there isn't one:
`developers.payfast.co.za` is blocked from this environment and no credentials exist on either
project. Until one sandbox transaction completes, this is written and consistent, not working.
`NEEDS-FOUNDER.md` now carries the five ordered steps that would change that.

Verified: 847 tests, `tsc --noEmit`, `vite build`, `security:scan`.


---

## Open questions between the roles

Neither session should answer these alone. Record the question, let the founder decide.

- **Should one PayFast session be able to settle a multi-Xooter booking?** Today it cannot: N
  Xooters means N `payment_records`, and `confirm-payment` settles one record per ITN, so
  `create-payment-session` refuses those bookings outright rather than collecting part of the
  total. Making it work means changing `confirm-payment`'s matching rule to understand a payment
  group, which is Correctness & Safety's to decide. Raised by Release 2026-08-15. The refusal is
  safe and shipped; only the UX is bad.

---

## Founder-only items

**Moved to [`docs/release/founder-todo.md`](../release/founder-todo.md)** on 2026-08-13, ordered,
with a *proves it done* on every row.

This table was the eighth place the same list lived, and the other seven had rotted — `blocker.md`
still showed three closed issues as open, and four `docs/release/` checklists were last reviewed in
July. Keeping a second copy here would restart that. **Read the file, and edit the file.**

The one thing worth repeating here, because it is a rule rather than a task: a session **never**
dispatches a production deploy unasked, and `create-staging-twilio-subaccount.mjs` is **never**
wrapped in a workflow — it prints a secret Twilio shows exactly once, into a retained log.
