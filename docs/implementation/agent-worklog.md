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

---

## Open questions between the roles

Neither session should answer these alone. Record the question, let the founder decide.

- **Nothing open.**

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
