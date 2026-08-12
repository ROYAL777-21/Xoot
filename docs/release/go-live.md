# Go-live runbook

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

Then set them all in one command (the block below), and run §2c gate 1 to confirm.

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

**Step 1 — preconditions, all three.** The seven secrets in (§2c gate 1 returns
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

### 2c. The tests that actually prove it

**No call has been placed on any surface, ever.** Four gates, cheapest first.

**Gate 0 — is the Twilio configuration actually right? One click, nobody needs to sign in.**

Run the **Twilio self-test** workflow: Actions → *Twilio self-test* → Run workflow → environment
`both`. It prints a ✅/❌/➖ table per project into the run summary and the log.

> ### ⚠️ BLOCKED as of 2026-08-12 — one line of config away, and it needs your decision
>
> The workflow is built and deployed to both projects, and it does not yet work. The cause is not
> Twilio and not the secrets — it is Supabase's API-key migration. Measured, not guessed:
>
> ```
> api-keys schema: ["api_key","description","hash","id","name","prefix","type"]
> labels: [{"name":"anon","type":"legacy"}, {"name":"service_role","type":"legacy"},
>          {"name":"default","type":"publishable"}, {"name":"default","type":"secret"}]
> every key rejected: [eyJ… -> authentication required] [sb_… -> Invalid API key]
> ```
>
> Both projects have moved to the new `sb_secret_…` keys, so the Edge Function's
> `SUPABASE_SERVICE_ROLE_KEY` env var holds the **secret key**, not the legacy JWT. That produces a
> deadlock:
>
> - The **legacy `service_role` JWT** passes Supabase's gateway but no longer equals the function's
>   env value → the function answers `authentication required`.
> - The **`sb_secret_…` key** would match, but `twilio-selftest` is `verify_jwt = true`, so the
>   gateway rejects a non-JWT credential before the function runs → `Invalid API key`.
>
> **The credential that can reach the function is not the one it holds, and the one it holds cannot
> reach it.**
>
> **The fix, which is yours to approve.** Set `verify_jwt = false` for `twilio-selftest` in
> `supabase/config.toml` and add it to `MUST_STAY_OPEN` in `src/lib/edge-function-config.test.ts`.
> The function then performs its own full-string comparison against the secret key, plus the admin
> check — the same shape the Twilio webhooks already use, where the gateway is open and the function
> is the gate. It is not a weakening: the exact match still stands, and a wrong credential is still
> refused.
>
> It is written down rather than done because that test exists precisely to make opening a function
> a deliberate act, and this one reports account configuration.
>
> Until then, gate 0 runs from an admin browser session using the console snippet below, which is
> unaffected — a signed-in admin never touches the service-role path.

It needs no new secret. The job fetches the project's service-role key with the
`SUPABASE_ACCESS_TOKEN` that already exists as a repository secret, calls `twilio-selftest` with it,
and never echoes the key — it goes into a header, and the response is filtered through an explicit
`jq` allowlist rather than dumped.

*Or, from an admin browser session, the same check by hand:*

```js
const { data } = await window.supabase.functions.invoke("twilio-selftest", { body: {} });
console.table(data.checks); console.log(data.summary, data.accountSid);
```

This asks **Twilio** — not the secret store — whether the account credentials are a valid pair, the
API key belongs to that account, the TwiML App exists **with its Voice Request URL set and pointing
at `twilio-voice-twiml`**, and the Conversations service exists.

**Why it goes before gate 1.** Gate 1 proves the secrets are present and well-formed enough to mint
a token. It cannot detect a TwiML App whose Voice URL was never filled in — that mints a token
happily, shows the call button, and then dies silently at the moment two people are trying to speak.
Gate 0 names it: *"TwiML App exists but its Voice Request URL is EMPTY."*

Reading the output:
- `ok: true` — working. `ok: false` — broken, and the `detail` says how.
- **`ok: null` is not a failure.** It means not applicable: the PSTN path and the SMS/WhatsApp
  webhooks need a phone number Xoot deliberately does not buy. Do not "fix" these.

**Run it on staging too, and compare `accountSid`.** The workflow's `both` option does this for you
and prints the reminder. The same Account SID on both projects means staging and production share
Twilio credentials, which `SECRETS_INVENTORY.md` forbids — a staging test call would then bill and
log against the live account, and a staging leak would reach production.

**Gate 1 — did the secrets land? 30 seconds, no second person.** Sign in, open a booking you are on,
and in the browser console:

```js
const { data } = await window.supabase.functions.invoke("twilio-token",
  { body: { bookingId: "<a booking id you are a participant on>", capability: "voice" } });
console.log(data);
```

- `{ configured: false, missing: ["TWILIO_VOICE_APP_SID", …] }` — the function naming exactly which
  secrets are absent. Set those and run it again.
- `{ configured: true, token: "ey…" }` — all seven are in.

This is the single most useful command in this document: it turns "something is wrong with Twilio"
into a list.

**Gate 2 — does the webhook signature check pass?** This is the one the two-Auth-Token-names bug
broke. In the Twilio Console: Monitor → Logs → **Errors**. A `403` from `twilio-voice-twiml` with no
matching function log means the Auth Token is wrong or absent. Nothing else produces that pattern.

**Gate 3 — a real two-party call.** The only proof that media flows. Everything above proves
configuration; this proves sound comes out. Until it has happened once, voice calling is code that
has never run.

Written out properly below, because "two browsers" is a description, not instructions.

#### 2c-i. The two-party call, step by step

Budget 15 minutes the first time. You need **two devices, or one device and a phone** — see step 4.

1. **Two accounts.** One customer, one Xooter. The Xooter account must be approved and active
   (`zooters.active = true`), which `approve-zooter` sets. If you only have one real Xooter, use
   your own second email.

2. **One booking, with both of them on it.** Create a booking as the customer, then assign the
   Xooter to it. Both parties must be on the *same* booking row — `assertBookingParticipant` checks
   `bookings.user_id` and `bookings.zooter_id`, and an admin account does not substitute for either.

3. **Move the booking to `en_route` or `in_progress`.** This is the gate that catches most first
   attempts. `maskedCallAvailable` returns false at every other status, so the call button simply
   is not rendered on a `confirmed` booking and it looks like the feature is missing. The Xooter
   moves it from their job screen; an admin can also set it from Admin → Ops.

4. **Sign in as each account, in two separate browsers.** Chrome and Firefox, or a laptop and a
   phone. **A private/incognito window is not enough** — it shares the session store with its
   parent window in the way that matters here, so signing in as the second account signs the first
   one out and you end up calling yourself. Two different browsers, or two different devices.

5. **Grant microphone permission in both.** The prompt appears on the first call attempt. If it was
   ever denied for the site, the browser will not ask again: clear it in the padlock menu →
   Site settings → Microphone → Allow, then reload.

6. **Open the booking on both screens** (`/app/bookings/<id>` as the customer, the job detail as the
   Xooter) and **press call on one.** The other should ring within a second or two.

**What success looks like:** the caller's panel goes `connecting → ringing → connected`, the
callee's panel offers accept/decline, and after accepting both hear each other. The Twilio Console
(Monitor → Logs → Calls) shows **two** call legs joining one conference — two, because
`<Dial><Conference>` dials each participant into a room rather than one party to the other.

**When it does not work, what each failure means:**

| symptom | cause |
|---|---|
| No call button at all | Booking is not `en_route`/`in_progress`, or the signed-in account is not a participant. Step 3. |
| "Calling is not configured" | `twilio-token` returned `configured: false`. Gate 1 names the missing secrets. |
| Rings, then drops immediately | The TwiML App's Voice Request URL is empty or wrong. **Gate 0 catches this** — it is the failure the self-test exists for. |
| Connects but silence one way | Microphone permission denied on the silent side, or the OS input device is muted. Step 5. |
| Connects but silence both ways | Media is being blocked — a corporate network or VPN dropping UDP. Retry on a mobile hotspot to confirm. |
| `403` in the Twilio Console with no matching function log | Auth Token wrong or absent. Gate 2. |
| One leg in the conference, not two | The callee never accepted, or their token was minted for a different booking. |

**⚠️ This is the one gate no agent can run.** It needs two humans, or one human with two devices,
in front of two microphones. Everything else in section 2c is now automated; this is not, and no
amount of server-side checking substitutes for it. Do not treat a green gate 0 as a working phone.

**What I cannot do:** gates 1, 2 and 3 from a session. The agent proxy denies `*.supabase.co`, and
`pg_net`/`http` are not installed, so an Edge Function cannot be invoked from a session at all —
which is exactly why gate 0 moved into a workflow, where a runner with network access can make the
call instead. Paste me the output of gate 1 and I will tell you what is missing.

---

## 3. Deploy the function backlog (#30, #31)

After section 0. Actions → **Deploy Edge Functions** → Run workflow.

### 3a. ⚠️ Apply the commission migration FIRST

`supabase/migrations/20260809120000_booking_commission_rate.sql` adds `bookings.commission_rate_bps`,
and `create-booking` and `respond-zooter-job` now write it.

**This ordering is not a preference.** PostgREST rejects an entire statement on the first unknown
column, so deploying those two functions against a table without the column does not degrade
gracefully — every booking insert fails and booking creation is down until the migration lands. The
opposite order is harmless: apply the migration and the column sits null until the functions ship.

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

**Set "Use workflow from" to the release branch, not `main`.** `main` is where GitHub finds the
workflow; the ref decides which branch's code and config get deployed. `main`'s `config.toml`
declares 18 of 46 functions, and a deploy from there would give the ten webhook functions the
default `verify_jwt = true` — a 401 at the gateway on every Twilio, Stitch and Ozow callback, with
nothing in any function's logs. The workflow refuses that rather than trusting the dropdown.

1. **staging**, `functions` = `twilio-token create-masked-call`. Read the drift table in the summary.
2. **staging**, `functions` blank.
3. **production**, `functions` blank, `confirm_project_ref` = `mvlrkelahhsyjrwgsxaf`.

27 functions are stale — 22 only because they bundle their own copy of `_shared/action-utils.ts`,
which moved on 6 August. Three more (`create-concierge-handoff`, `generate-booking-invoice`,
`resend-booking-invoice`) have never been deployed at all, so any UI path calling one gets a 404
today.

This also closes the inconsistency where `create-masked-call` runs the loosened masked-call rate
limit (8 per 10 minutes) and `ops-workflow` still has its own copy at 3.

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
