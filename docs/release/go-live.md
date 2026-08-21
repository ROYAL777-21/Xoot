# Go-live runbook

> 🧭 **For "what do I do next?", read [`FOUNDER-GUIDE.md`](FOUNDER-GUIDE.md) instead.**
> It is the canonical ordered list as of 2026-08-21. **This file is still the best source for
> deploy ordering — §3a migrations before functions, §3b web app before the booking writers** — nothing here has been deleted.

Everything left that only the founder can do, in the order it has to happen, with the exact
commands. Written because "set the Twilio secrets" is not an instruction — there are eight of them,
they come from four different pages of the Twilio console, and two of the things that look like
Supabase keys cannot deploy anything.

Nothing here can be done from an agent session. Supabase never reads a secret back, so even
*confirming* one of these is set is impossible from outside the dashboard.

---

## 0. Fix `SUPABASE_ACCESS_TOKEN` — blocks everything in section 3

The secret currently in the repository is a **project key**, not a **personal access token**.

Two runs measured it. The first died inside the CLI after two minutes:

```
Invalid access token format. Must be like `sbp_0102...1920`.
```

The second, with the shape guard in place, failed in six seconds — and narrowed it: the value is
neither `sbp_…` nor a legacy `eyJ…` service-role JWT. That leaves Supabase's newer
**`sb_publishable_…` / `sb_secret_…`** keys, which is an entirely reasonable thing to have reached
for, because they are what **Project Settings → API** shows and that is the page you go to looking
for "the Supabase key".

**No project key of any generation can deploy.** A project key authenticates against *one project's
data*; deploying a function is an *account-level* action. Different page, different credential:

1. **Account → Access Tokens** — https://supabase.com/dashboard/account/tokens →
   **Generate new token**. Name it `github-actions-deploy`. The value starts `sbp_`.
   *Not* Project Settings → API.
2. GitHub → Settings → Secrets and variables → Actions → `SUPABASE_ACCESS_TOKEN` → **Update**.

The workflow checks the shape at step 4 and names the specific mistake — legacy JWT, newer `sb_`
project key, a project ref pasted by accident, or something else entirely — so a wrong value costs
six seconds and tells you where to go.

---

## 1. `ENCRYPTION_KEY` — ten minutes, unblocks gate codes (#28)

Read by `sensitive-access-read` and `sensitive-access-save` via `Deno.env.get`. There is **no
fallback**: both functions throw when it is absent, so a customer cannot store an access code for
their gate, alarm or lockbox. It used to fall back to `SUPABASE_SERVICE_ROLE_KEY`, which meant an
unset key silently encrypted every gate code with a value that also grants full database access.
That fallback is gone, which is why this now fails loudly instead of failing quietly.

**Supabase → Edge Functions → Secrets**, not GitHub. Or from a terminal:

```bash
# Production. Generates and sets in one step so the value never lands in shell history.
supabase secrets set ENCRYPTION_KEY="$(openssl rand -base64 32)" \
  --project-ref mvlrkelahhsyjrwgsxaf

# Staging. A DIFFERENT value — the inventory's rule is that staging and production
# credentials are never shared, and a shared key means a staging leak decrypts production.
supabase secrets set ENCRYPTION_KEY="$(openssl rand -base64 32)" \
  --project-ref fxmxyabdjqviqbcxmvlp
```

**Set it once and do not rotate it casually.** Every gate code already stored is encrypted with the
key that was current when it was saved; changing the key makes those undecryptable, and the symptom
is a Xooter standing at a gate with a blank field. Nothing is encrypted yet — it has never been set —
so this first setting is free.

**How to verify**, since Supabase will not show it back to you: open a booking in the app, save an
access code, reload the page, and confirm it reads back. That is the whole test. If it fails, the
function's log will say `ENCRYPTION_KEY is not configured` — the caller deliberately gets a generic
error instead, because telling an anonymous caller which secrets are configured is a free read of
server state.

---

## 2. Twilio — eight secrets, then two switches, in that order (#32)

### 2a-0. "Do I have to buy phone numbers?" — No.

Answered head-on because it is the question that keeps coming back, and the wrong answer costs money
every month. Read out of the code, not assumed:

| What you want | What it uses | Numbers to buy |
| --- | --- | --- |
| **The in-app call** (built, and the primary path) | `twilio-voice-twiml` answers `<Dial><Conference>` — both parties join a named room over data | **none** |
| In-app chat | Twilio Conversations | **none** |
| Masked phone fallback *(optional)* | `create-masked-call` → Twilio Proxy, which masks by allocating from a pool **you own** | one per concurrent session, paid monthly |

`<Conference>` has no PSTN leg — grep the function, there is no `<Number>` anywhere in it. So the
free path is also the private one, and `twilio-secrets-contract.test.ts` asserts both facts so this
answer cannot quietly stop being true.

**On "can we just use their real number instead?"** — that is not a cheaper form of masking, it is
the absence of masking. The Xooter sees the customer's mobile and the customer sees the Xooter's,
permanently, after one job. In a business where a stranger comes to someone's home that is a safety
decision before it is a cost one, and it is the exact thing masking exists to prevent.
**Recommendation: ship the data call, leave Proxy off, buy no numbers.**

> **Fixed 2026-08-10, and it was making this worse.** `TWILIO_CALLER_ID` used to sit in
> `twilio-token`'s blanket required list, so the **in-app data call** refused to mint a token without
> a verified phone number — despite nothing in this codebase reading that secret. The cheap option
> looked unavailable, which is how someone ends up buying numbers they never needed. The gate is now
> scoped per capability.

### 2a. The secrets — how to get each one, in order

Do them in this order; three of them can only be created after another exists.

**Before you start:** decide which Twilio account you are using for staging. The rule in
`SECRETS_INVENTORY.md` is that staging and production never share credentials — so either a second
Twilio account or a **subaccount**. Do production first and repeat.

1. **`TWILIO_ACCOUNT_SID`** — Console home page, top left. Starts `AC`. Copy it.
2. **`TWILIO_WEBHOOK_AUTH_TOKEN`** and **`TWILIO_AUTH_TOKEN`** — the **same value**, the Auth Token
   shown next to the Account SID. Click to reveal. (Two names because two parts of this codebase
   ask for it differently; either alone now works, setting both costs nothing.)
3. **`TWILIO_API_KEY_SID`** and **`TWILIO_API_KEY_SECRET`** — Account → **API keys & tokens** →
   *Create API key*. Name it `xoot-production`. Type: **Standard**.
   ⚠️ **The secret is shown exactly once.** Copy both before closing the dialog. If you miss it,
   delete the key and make another — there is no way to see it again.
4. **`TWILIO_CONVERSATIONS_SERVICE_SID`** — Explore products → **Conversations** → Services →
   *Create a service*, name it `xoot`. Starts `IS`.
5. **`TWILIO_VOICE_APP_SID`** — Voice → **TwiML Apps** → *Create new TwiML App*, name it `xoot-voice`.
   Set its **Voice Request URL** to:
   `https://mvlrkelahhsyjrwgsxaf.functions.supabase.co/twilio-voice-twiml` (POST)
   and **Status Callback** to `.../twilio-voice-status`. Save. The SID starts `AP`.
6. **`TWILIO_CALLER_ID`** *(optional — skip it unless you want the phone fallback)* — a number
   Twilio has verified for the account, in E.164 (`+27…`). Verify one you already own under Verified
   Caller IDs rather than buying one. **Not needed for the in-app call**; see §2a-0.
7. **`TWILIO_PROXY_SERVICE_SID`** *(optional, eighth)* — only if you want the masked-PSTN fallback.
   Explore products → Proxy → Services. Starts `KS`. This is the one that requires a bought number
   pool.

**So the in-app call needs steps 1–5: five secrets, no phone number, nothing to buy.**

Then set them all in one command (the block below), and run gate 1 (`voice-gates.md`) to confirm.

**If a later step fails**, gate 1 names the exact secret that is missing — you never have to guess
which of the eight it was.

### 2a-ii. Reference table and the command

`twilio-token` returns `{ configured: false, missing: [...] }` rather than a token until the secrets
for the **requested capability** are all present — and it asks each capability only for what that
capability uses:

| capability | needs |
| --- | --- |
| `voice` (the in-app call) | account SID, API key SID + secret, `TWILIO_VOICE_APP_SID`, the Auth Token |
| `conversations` (in-app chat) | account SID, API key SID + secret, `TWILIO_CONVERSATIONS_SERVICE_SID`, the Auth Token |

**Neither asks for a phone number.** `TWILIO_CALLER_ID` and `TWILIO_PROXY_SERVICE_SID` belong to the
masked-PSTN fallback alone, and both are optional.

| Secret | Where it comes from |
| --- | --- |
| `TWILIO_ACCOUNT_SID` | Console home. Starts `AC`. |
| `TWILIO_API_KEY_SID` | Account → API keys & tokens → Create API key. Starts `SK`. |
| `TWILIO_API_KEY_SECRET` | Shown **once**, at creation. Copy it then or make a new key. |
| `TWILIO_CONVERSATIONS_SERVICE_SID` | Conversations → Services. Starts `IS`. |
| `TWILIO_VOICE_APP_SID` | Voice → TwiML Apps → create one, Voice URL → `twilio-voice-twiml`. Starts `AP`. |
| `TWILIO_CALLER_ID` | A verified number on the account, E.164 (`+27…`). |
| `TWILIO_WEBHOOK_AUTH_TOKEN` | Console home, next to the Account SID. The account Auth Token. |
| `TWILIO_PROXY_SERVICE_SID` | Proxy → Services. **Optional** — masked PSTN only. |

> **Corrected 2026-08-09.** This table used to say of `TWILIO_WEBHOOK_AUTH_TOKEN`: *"This is what
> every webhook's HMAC-SHA1 check validates against."* That was false. Five of the seven webhooks
> — message, WhatsApp, status-callback, verify and voice — validate through
> `_shared/twilio-webhook.ts`, which read `TWILIO_AUTH_TOKEN`, a name this page never mentioned.
> Following the old instructions set one name and left those five rejecting every inbound Twilio
> request, silently: signature validation fails closed and the 403 carries no log line saying a
> secret is absent.
>
> Both names are now accepted everywhere, so **either one alone works**. Setting both, as below, is
> belt and braces and costs nothing. `twilio-secrets-contract.test.ts` fails if this table and the
> code ever disagree again.

```bash
supabase secrets set \
  TWILIO_ACCOUNT_SID=AC... \
  TWILIO_API_KEY_SID=SK... \
  TWILIO_API_KEY_SECRET=... \
  TWILIO_CONVERSATIONS_SERVICE_SID=IS... \
  TWILIO_VOICE_APP_SID=AP... \
  TWILIO_CALLER_ID=+27... \
  TWILIO_WEBHOOK_AUTH_TOKEN=<account auth token> \
  TWILIO_AUTH_TOKEN=<the same value> \
  --project-ref mvlrkelahhsyjrwgsxaf
```

One more, only if a proxy or load balancer rewrites the host: `TWILIO_WEBHOOK_TWIML_URL`. Twilio
signs the URL it *dialled*, not the one the function sees, so a mismatch fails every signature
check silently. Set it to the exact URL configured in the TwiML App.

### 2b. Then, and only then, the two switches

**What they actually gate, corrected 2026-08-09.** `providerAllowed = twilioAccountReady &&
maskedVoiceReady` is read in **`create-masked-call`** and **`ops-workflow`** only — the **masked
PSTN** path. `twilio-token`, which mints the WebRTC token for the in-app data call, never reads
them; it gates on the seven secrets alone.

So the in-app call needs the secrets. **These two switches turn on the phone-number fallback.**
Separate gates, and worth knowing which one you are opening.

**Step 1 — preconditions, all three.** The seven secrets in (gate 1 in `voice-gates.md` returns
`configured: true`); `TWILIO_PROXY_SERVICE_SID` set, or the masked call cannot dial whatever these
say; and a data call already connected once.

**Step 2 — read the current state.** Supabase Dashboard → **production** project → SQL Editor:

```sql
select control_key, environment, enabled, description
  from public.operational_controls
 where control_key like 'twilio.%'
 order by control_key;
```

Expect both `false`, `environment = 'all'`. A **missing row** means the control seed never ran, and
`isOperationalControlEnabled` catches to `false` — the feature stays dark whatever you set. Stop and
fix the seed first.

**Step 3 — flip both in one statement.** Not two:

```sql
update public.operational_controls
   set enabled = true
 where control_key in ('twilio.operational_messages', 'twilio.masked_voice')
   and environment = 'all';
```

The code requires **both**. Enabling one alone changes nothing and leaves you debugging a feature
that is, correctly, still off. One statement makes a half-flip impossible.

**Step 4 — confirm.** Re-run Step 2; two rows, both `true`. `UPDATE 0` means `environment` is not
`'all'` — check rather than assume.

**Step 5 — test.** A masked call also needs **both parties to have phone numbers on file**
(`clientPhone && zooterPhone`). Missing either, the function still records a session but returns
`configured: false` and the outbox row carries `missing_phone: true`.

**Step 6 — rollback is the same statement with `false`.** No deploy, no restart. That is the point
of a kill switch, and why these stay off until the moment you need them on.

**The order is the point.** These are kill switches, and a kill switch flipped before the thing
behind it works is not a feature flag, it is a promise the product cannot keep. With the secrets
absent, `twilio-token` already returns `configured: false` and `VoiceCallPanel` renders "not
switched on yet" rather than a broken button — that graceful path only exists because the switches
are off. Turn them on first and you get a call button that fails at the moment someone is standing
at a door.

Confirm afterwards:

```sql
select control_key, enabled from public.operational_controls
 where control_key like 'twilio.%' order by control_key;
```

### 2c. The tests that actually prove it — see `voice-gates.md`

**No call has been placed on any surface, ever.** Four gates, cheapest first, written out in full
in **[`docs/release/voice-gates.md`](./voice-gates.md)**:

| gate | what it proves | cost |
| --- | --- | --- |
| **0** | Twilio's own configuration is right — credentials, API key, TwiML App URLs, Conversations | one click, nobody signs in |
| **1** | the eight secrets actually landed | 30 seconds, one person |
| **2** | the webhook signature check passes | a look at the Twilio error log |
| **3** | **a real two-party call** — the only proof media flows | two devices, two microphones, a human |

Gate 0 runs from Actions → **Twilio self-test** → `environment: both`. It is green on both projects
as of 2026-08-12, and finding it green is not the same as a working phone — see gate 3.

Gate 3's setup runs from Actions → **Arm the two-party call test**, which puts staging's smoke
booking into the window where the call button renders. The call itself still needs two people.

`voice-gates.md` also carries what gate 0 found on its first real pass, the step-by-step for the
two-party call, and Twilio Console click-paths for the staging subaccount for anyone without a
terminal.

---

## 3. Deploy the function backlog (#30, #31)

After section 0. Actions → **Deploy Edge Functions** → Run workflow.

### 3-0. Check what is deployed the cheap way first

CLAUDE.md rule 6 says to read the deployed copy rather than assume the repo reflects it. True, and
**the obvious way to obey it is the most expensive routine act in this repo** — `get_edge_function`
returns the function *plus every `_shared` file bundled into it*, tens of thousands of characters,
for what is usually a yes/no question. An agent session that does this a few times a turn burns
through a budget fast, and so does a human waiting on it.

**Compare timestamps before reading bodies.** `list_edge_functions` returns `version` and
`updated_at` for every function. Set that against `git log -1 --format=%ci -- <path>`:

| question | cheap answer |
| --- | --- |
| Is the deployed copy older than my change? | `updated_at` **earlier** than the commit time ⇒ it cannot contain it. Done. |
| Did these two functions deploy together? | identical `updated_at` **to the millisecond** ⇒ one operation. |
| Is this `_shared` fix already live everywhere? | every consumer's `updated_at` **after** the shared file's last commit. |

Measured 2026-08-12, all three were decided this way in seconds:

- `create-booking` last deployed 19:13:19Z vs the ZD-026 commit authored 21:07:47Z — deployed copy
  provably predates the change, no body read needed.
- `create-booking` and `create-booking-request` both `1786572740555` — one dispatch, §3b satisfied.
- The seven `governance-utils` redeploys, listed as pending, were **already done**: the shared file
  last changed 2026-08-08, every consumer deployed 2026-08-12.

**Read a body when the timestamps are ambiguous or the answer must be exact** — a value inside the
code, or a shared module that changed and redeployed in the same window. That last check above was
still confirmed against one deployed body, because "already done" is the kind of claim that costs a
production deploy if it is wrong. Cheap first, exact when it matters.

> ##### ⚠️ An agent session cannot check the live website. Do not expect it to.
>
> Outbound `CONNECT` to `xoot.co.za:443` is refused by the organisation's egress policy. The proxy
> records it plainly — `connect_rejected`, *"gateway answered 403 to CONNECT (policy denial)"* — and
> `/root/.ccr/README.md` says to report policy denials rather than route around them. The same
> denial covers `api.twilio.com` and `*.supabase.co`, which is why the staging-subaccount script
> cannot be run from a session either.
>
> This is not a gap to work around; it is why **Verify live deploy**, **Twilio self-test** and
> **Arm the two-party call test** are workflows. A GitHub runner has no such restriction. If a
> session tells you it "cannot reach the site", the correct next step is to dispatch the workflow,
> not to accept the answer.
>
> The one thing that stays out of a workflow on purpose:
> `scripts/ops/create-staging-twilio-subaccount.mjs`, which prints a Twilio API Key Secret that
> Twilio shows exactly once. A workflow log is retained. Its browser route is the Console
> click-paths in `voice-gates.md`, not automation.

### 3a. ⚠️ Apply the commission migration FIRST

`supabase/migrations/20260809120000_booking_commission_rate.sql` adds `bookings.commission_rate_bps`,
and `create-booking` and `respond-zooter-job` now write it.

**This ordering is not a preference.** PostgREST rejects an entire statement on the first unknown
column, so deploying those two functions against a table without the column does not degrade
gracefully — every booking insert fails and booking creation is down until the migration lands. The
opposite order is harmless: apply the migration and the column sits null until the functions ship.

**A third, added 2026-08-13 — `20260813100000_concierge_openrouter_source.sql`.** It extends the
`source` CHECK on `zoot_concierge_feedback` so Concierge answers can be attributed to OpenRouter
(ZD-027). Its failure mode is the *quiet* one, unlike the two below: `report-concierge-answer`
coerces an unrecognised source to `'unknown'` rather than rejecting it, so deploying the functions
first breaks nothing and blocks nobody — it just files every complaint about an OpenRouter answer
under "no idea which model", which is precisely the attribution you want after changing providers.
Apply it first anyway; there is no reason not to.

**Two migrations now, same rule for both:**

| migration | adds | written by |
|---|---|---|
| `20260809120000_booking_commission_rate.sql` | `bookings.commission_rate_bps` | `create-booking`, `respond-zooter-job` |
| `20260809210000_xooter_commission_boosts.sql` | `xooter_commission_boosts` table | read by both, via `activeBoostBpsFor` |

The boost table is the more dangerous of the two to get out of order, because a **missing table**
makes the whole PostgREST request fail rather than one column: deploy the functions first and every
booking insert fails, at both the create and accept paths.

Apply both, then regenerate `src/integrations/supabase/types.ts` from the live schema. The column and
the table were added to that file by hand so the schema-contract test could pass ahead of the
migrations; a real regeneration replaces the hand edits and confirms the live database agrees.

**Set "Use workflow from" to `main`.** ✅ Corrected 2026-08-12. This step used to say *"the release
branch, not `main`"*, which was true when written — `main`'s `config.toml` then declared 18 of 46
functions, and deploying from it would have given the ten webhook functions the default
`verify_jwt = true`, a 401 at the gateway on every Twilio, Stitch and Ozow callback with nothing in
any function's logs. The release stack has since merged: `main` declares **50 of 50**, and the
release branch it pointed at no longer exists. The workflow's own header carries the same
correction, and its guard refuses on the real count rather than trusting the dropdown either way.

1. **staging**, `functions` = `twilio-token create-masked-call`. Read the drift table in the summary.
2. **staging**, `functions` blank.
3. **production**, `functions` blank, `confirm_project_ref` = `mvlrkelahhsyjrwgsxaf`.

27 functions are stale — 22 only because they bundle their own copy of `_shared/action-utils.ts`,
which moved on 6 August. Three more (`create-concierge-handoff`, `generate-booking-invoice`,
`resend-booking-invoice`) have never been deployed at all, so any UI path calling one gets a 404
today.

This also closes the inconsistency where `create-masked-call` runs the loosened masked-call rate
limit (8 per 10 minutes) and `ops-workflow` still has its own copy at 3.

### 3b. ⚠️ The R39 booking fee — the web app must ship BEFORE these two functions

Same class of rule as 3a, opposite direction: here the *client* has to move first.

✅ **This one is now enforced, not just written down.** The workflow step *"The web app must
already carry this pricing rule"* fetches **`https://xoot.co.za/build-info.json`** and refuses the
deploy unless the live site reports the same rule the repo is about to make live. You can still
read the rest of this section for the reasoning, but you cannot get it wrong by forgetting it.

> ⚠️ **Corrected 2026-08-13.** This paragraph said `pricing-rules.json`. That was a second marker,
> written and then correctly abandoned in favour of the existing `build-info.json` stamp — the
> worklog records the decision, but this sentence was not updated with it. It named a file that
> exists nowhere in the repository, which reads as "the gate is not implemented". **It is
> implemented**, at `deploy-edge-functions.yml`, and it reads `.pricingRule` and `.bookingFeeCents`
> from the stamp `write-build-info.mjs` emits.

It compares live-against-repo rather than against a hardcoded `ZD-026`, so it needs no editing
when the rule changes again, and a hotfix that does not touch pricing carries the same id and
passes — which is why it needs no override. It parses the response body rather than trusting the
status code, because `netlify.toml` rewrites unknown paths to `index.html` with **status 200**:
a missing marker returns cheerful HTML, and a status-code check would wave it through.

> ##### ⚠️ THIS GATE IS CURRENTLY CLOSED, AND IT BLOCKS EVERY PRODUCTION FUNCTION DEPLOY
>
> A **blank** function list sets `writers=1`, so the gate applies to "deploy everything" — which is
> exactly what the ZD-029 schema rename requires. And `https://xoot.co.za/build-info.json` has been
> unreadable on **seven** consecutive *Verify live deploy* runs.
>
> So a production dispatch today applies the migration and is then **refused the 33 redeploys the
> migration depends on**, leaving every function querying tables that no longer exist, with no way
> to fix it forward. The gate is behaving correctly; the live site is the problem.
>
> **Fix the hosting first — [`domain-setup.md`](./domain-setup.md).** When *Verify live deploy*
> goes green this gate opens with it: they read the same stamp.

ZD-026 made R39 a fee on every booking, waived only for Care+. Production `create-booking` is at
**v15 and still runs the old rule** (`isCarePlusMember || frequency !== "one_time"`), verified
2026-08-12 by reading the deployed source.

**Deploy `create-booking` or `create-booking-request` while the live web app still predates ZD-026
and recurring bookings are under-quoted by R39.** `Book.tsx` on the old build computes
`serviceFee = frequency === "one_time" ? 39 : 0`, so a customer choosing a repeat booking sees R0
for the fee and the new server charges R39. A total shown and then exceeded at charge time is the
exact Consumer Protection Act problem ZD-026 exists to remove — deploying out of order would
recreate it rather than fix it.

> ### ✅ Done 2026-08-12 22:12:20Z
>
> `create-booking` v15→**v16** and `create-booking-request` v13→**v14**, both stamped
> `1786572740555` — identical to the millisecond, so they went together as required. `main` merged
> at 22:11, functions at 22:12:20.
>
> ⚠️ **That margin was ~70 seconds, and it should have been longer** — see step 2 below. Netlify
> had almost certainly not finished building, so briefly the new server charged R39 on a recurring
> booking while the old client showed R0. The window is closed; the lesson is kept.

The safe order:

1. Land the ZD-026 branch on `main`. Netlify builds the client from `main`
   (`npm ci && npm run build`), so this is what ships the new rule to customers.
2. **Wait for the *Verify live deploy* workflow to go green.** It runs automatically on every push
   to `main`, fetches `https://xoot.co.za/build-info.json`, and compares the commit the live site is
   serving against the one you just merged. Green means Netlify has genuinely published your build.
   ⚠️ The gate is that check, **not the push**. A merge takes a second; a Netlify build takes
   minutes, and every minute between them is a window where the server charges more than the client
   displays — the exact CPA direction this section exists to prevent. Measured 2026-08-12: the
   functions went out **70 seconds** after the merge, which was far too fast. The check exists
   because that gate was previously a person remembering to look.
   Then, optionally but usefully, open the site and confirm a **recurring** booking shows the R39
   line — the check proves *which build* is live, not that the build is correct.
3. Only then dispatch the workflow for `create-booking create-booking-request` — **together**.
   `_shared/pricing.ts` is bundled per function, so shipping one leaves two live pricing rules.

The reverse order is harmless, unlike 3a: a client that shows R39 against a server that still
waives it on recurring over-states the price, and the customer is charged less than they agreed to.
Wrong, but wrong in the direction that does not breach the CPA.

The other seven functions pending redeploy for the `governance-utils` fix — `support-respond`,
`create-concierge-handoff`, `create-masked-call`, `ops-workflow`, `report-concierge-answer`,
`send-booking-message`, `confirm-payment` — import no pricing module and carry no part of this
constraint. They can go at any time.

---

### 3d. ⚠️ The PayFast deploy — migrations first, and NAME the new function

**Added 2026-08-15 from the Release cross-review of PR #42.** Applies once that PR merges.

**Ordering is forced, and the first step is not optional.**
`20260813200000_payment_records_provider_lifecycle.sql` widens `payment_records_provider_check` from
`check (provider = 'payfast')` to `check (provider in ('manual_pending','payfast','manual_eft'))`.
Until it lands:

- `create-payment-session` cannot write `provider: 'payfast'`, and
- **`create-booking` cannot insert a payment record at all** — the column default is
  `manual_pending`, which the live constraint rejects. Booking creation is broken on both projects
  until this migration applies.

**The order:**

1. `db-push` → the four PR #42 migrations.
2. `deploy-edge-functions` with **exactly this list**:

   ```
   confirm-payment admin-confirm-payment create-payment-session
   ```

   Those are the only three that bundle the new `_shared` modules (`payment-confirmation.ts`,
   `payment-provider-gate.ts`, `payfast-checkout.ts`). Verified by import rather than assumed; no
   existing `_shared` module is modified, so nothing else carries a stale copy.
3. Web app, **after** `20260814103000_rename_zooter_avatars_bucket.sql` — `src/pages/xooter/Profile.tsx`
   references `xooter-avatars` and the live bucket is still `zooter-avatars`. Web-first breaks
   avatar upload. Same shape as §3b.

⚠️ **`create-payment-session` is a NEW function and appears in no deploy list anywhere.**
`deploy-edge-functions` deploys everything on disk only when `functions` is blank; when it is not, it
deploys **only what is named**. Every recent production deploy used an explicit list. Omit it and the
Pay button returns 404 with nothing in any log.

⚠️ **Set `XOOT_APP_ENV=staging` on the staging project before testing checkout there.**
`getEdgeEnvironment()` falls back to `"production"` when `XOOT_APP_ENV`, `APP_ENV` and `ENVIRONMENT`
are all unset, and `payment_provider_capabilities` has one row per environment — so an unlabelled
staging deployment reads **production's** readiness row. Every flag on both rows is false today so it
is not currently exploitable, but it is a money gate returning an answer about the wrong environment.

---

## 3c. ⚠️ The app identity changed — five provider consoles need updating (#34)

On 2026-08-13 the deep-link scheme became `xoot://` and the app identifier became
`za.co.xoot.app`. Both were the last moment they could change: an Android `applicationId` can
never change after publication, and an iOS bundle identifier is fixed at submission.

**`zoot://` is still registered**, deliberately. That is the safety net for everything below —
until you have done these, native sign-in still works on the old callback rather than dead-ending.

| what to change | where |
| --- | --- |
| Add `xoot://auth/callback` to the redirect allowlist | Supabase → Authentication → URL Configuration |
| Update the redirect URI, and add the new reversed-client id | Google Cloud → the OAuth client(s) |
| Register the new bundle id; update Sign in with Apple if enabled | Apple Developer → Identifiers |
| **New identifier means new credentials** — the old ones are bound to the old id | EAS |
| Update the project's bundle-id mapping | Sentry |

⚠️ **The Android signing fingerprint changes with the credentials.** `assetlinks.json` is generated
from `ZOOT_ANDROID_SHA256_CERT_FINGERPRINTS`, so after EAS issues a new key that variable must be
updated or Android App Links stop verifying. Same for `ZOOT_APPLE_TEAM_ID` / `ZOOT_IOS_APP_ID`.

**Ordering — the §3b pattern again.** The website must serve the new `apple-app-site-association`
and `assetlinks.json` **before or with** the app that claims them, or universal links break in the
gap. The web deploy is the cheap side, so move it first. Neither file is generated at all until the
team id and fingerprints above are set — the build logs `Skipped …: set ZOOT_APPLE_TEAM_ID`, which
is why they are absent today rather than wrong.

⚠️ **One thing the retained `zoot://` cannot save.** iOS automatically registers the bundle
identifier itself as a URL scheme, so `za.co.zoothome.app://` stops resolving on iOS the moment the
app ships with the new identifier — there is no way to keep a scheme for an identifier the app no
longer has. `native-routing.ts` still accepts it, which covers anything that reaches the web
router, but a native link built on the old bundle id will not open the app. Nothing has shipped, so
nothing is currently relying on it.

---

## 4. SOS (#36) — step by step

`SAFETY_READINESS` is a **three-state gate in code**, not a database flag: `schema_pending` →
`server_ready` → `live`, in `src/lib/safety.ts`. It sits at `schema_pending` today, so
`canArmSos()` is false and no SOS button is offered anywhere.

Each step is a real-world proof, not a code review. Shipping the button early means shipping
something that promises help and does not fetch it, to a person having the worst moment the product
will ever be part of.

### 4a. Move to `server_ready` — 10 minutes, no emergency services involved

This only claims "the functions are live and the app may arm SOS and record". It is now true: the
safety functions deployed with the rest in section 3.

1. Confirm the SOS tables exist on production:
   ```sql
   select to_regclass('public.sos_alerts') is not null as alerts,
          to_regclass('public.user_safety_pins') is not null as pins;
   ```
2. Change one line in `src/lib/safety.ts`:
   ```ts
   export const SAFETY_READINESS: SafetyReadiness = "server_ready";
   ```
3. `bun run test` — `safety.test.ts` exercises every state, so it will tell you if anything else
   assumed `schema_pending`.

At `server_ready`, visit recording becomes available and SOS still does not. That is deliberate:
`canArmSos` requires `live`.

### 4b. Move to `live` — the part only you can do

**What you need:** a real handset, on the mobile network the app will actually run on (not wifi,
not a simulator), a test booking in `en_route` or `in_progress`, and a second person at a computer
watching the ops queue.

**Do not dial 112 to test the alert.** Dialling emergency services for a test is a real call to a
real dispatcher. Split the test in two:

**Step 1 — prove the alert path, without calling anyone.** Trigger SOS from the handset. The
person watching runs:
```sql
select id, booking_id, created_at, status, payload
  from public.sos_alerts order by created_at desc limit 5;
```
Confirm the newest row carries **the right booking, the right address, and a contact number that
is correct and reachable**. That is the whole test — an alert with a wrong address is worse than no
alert, because someone will act on it.

**Step 2 — prove the dialler, once.** From the same handset, confirm the SOS action actually opens
the native dialler pre-filled with **112**, and then *cancel before it connects*. You are testing
that the intent fires and the number is right, not that South Africa's emergency service answers.

**Step 3 — flip it.**
```ts
export const SAFETY_READINESS: SafetyReadiness = "live";
```
Commit that with the alert id from step 1 in the message, so the evidence and the flag ship
together and anyone can find what proved it.

**If step 1 shows a wrong address or an unreachable number, stop.** That is a bug, not a
configuration problem, and it is the exact bug that makes an SOS feature dangerous rather than
merely broken.

### 4c. What I cannot do here, and why

I cannot invoke an Edge Function from a session — the agent proxy denies `*.supabase.co`, and
`pg_net`/`http` are not installed so it cannot be called from SQL either. I can read `sos_alerts`
afterwards and tell you whether the row looks right, which is worth doing: send me the alert id.

---

## 5. Mobile voice (#37 and the dev build)

The native build is *capable* of calling — `withXootVoiceCalling.cjs` declares the microphone
string, both VoIP background modes and the seven Android permissions. It does not make calling work.

1. `eas build --profile development`. Expo Go cannot load `@twilio/voice-react-native-sdk`.
2. Register CallKit (iOS) and ConnectionService (Android) through the SDK's `Voice` singleton. The
   failure mode is an incoming call that never rings, which no simulator reproduces.
3. Create a Twilio Push Credential from an APNs key (iOS) and an FCM service account (Android).
   Without it an incoming call does not arrive at all when the app is backgrounded: it rings for the
   caller and nothing happens for the callee.
4. Device verification for the rest of #37 — Live Activities, widgets, Siri, App Links. All four
   need hardware.

---

## What stays off, deliberately

`recording_enabled` and `transcription_enabled` are `false` everywhere, and
`.semgrep/rules/xoot.yaml` fails the build on setting either to `true`. Under **RICA s4** a call may
only be recorded with the consent of a party to it, and **POPIA** requires the parties to be told
what is collected and why. That is notice wording in the UI and in the terms, first. The boolean is
the last step, and when it ships, delete the Semgrep rule in the same commit as the wording.
