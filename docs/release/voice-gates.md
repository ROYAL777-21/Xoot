# Proving Twilio actually works

Split out of `go-live.md` on 2026-08-13. That file had grown to 839 lines and this was 357 of them
— read at a different time, for a different job, than the "set these eight secrets" material around
it. Setting Twilio up and proving it works are separate sittings.

**Come here from `go-live.md` §2c**, once the secrets are set and the two switches are on.

Four gates, cheapest first. Gate 0 costs one click, gate 3 costs two people and two microphones,
and each one only makes sense if the one before it passed.

---

**No call has been placed on any surface, ever.** Four gates, cheapest first.

**Gate 0 — is the Twilio configuration actually right? One click, nobody needs to sign in.**

Run the **Twilio self-test** workflow: Actions → *Twilio self-test* → Run workflow → environment
`both`. It prints a ✅/❌/➖ table per project into the run summary and the log.

> ### ✅ WORKING as of 2026-08-12 19:20 — and it found two real problems on its first pass
>
> It took six runs. What was wrong, in order, because each fix revealed the next and every one of
> them produced a body that looked like "your credential is wrong":
>
> | # | change | result |
> |---|---|---|
> | 1 | `verify_jwt = true` → `false` in `supabase/config.toml` | still `Invalid API key` |
> | 2 | stopped sending the secret key in the `apikey` header | `Conflicting API keys` |
> | 3 | matched the key *schemes* across both headers | still `Conflicting API keys` |
> | 4 | dropped the `apikey` header entirely | still `Invalid API key` |
> | 5 | fetched the keys with **`--reveal`** | ✅ both projects |
>
> Two lessons worth more than the fix:
>
> - **The `apikey` and `Authorization` headers are both read as API keys**, and the gateway refuses
>   two different ones — that is what `Conflicting API keys` means. Matching the schemes does not
>   help. Under the new key scheme you send `Authorization: Bearer sb_secret_…` and **no `apikey`
>   header at all**. The legacy `anon` + `service_role` pair is tolerated only because a JWT in
>   `Authorization` is treated as a user token rather than a second key.
> - **`supabase projects api-keys` masks `sb_secret_…` without `--reveal`**, and does *not* mask the
>   legacy `eyJ…` values. So the modern path failed with "invalid key" while holding a placeholder,
>   and the legacy path reached the function and was refused on merit. The two failures looked
>   identical from outside. The workflow now prints each key's **length** for exactly this reason —
>   a masked secret is short, a real one is not.
>
> `verify_jwt = false` did land and was necessary; it was simply not sufficient, and the identical
> error body afterwards made it look like it had not landed at all.

It needs no new secret. The job fetches the project's service-role key with the
`SUPABASE_ACCESS_TOKEN` that already exists as a repository secret, calls `twilio-selftest` with it,
and never echoes the key — it goes into a header, and the response is filtered through an explicit
`jq` allowlist rather than dumped.

*Or, from an admin browser session, the same check by hand — see the note under gate 1 about why
this is a `fetch` and not `window.supabase`:*

```js
const ref = "mvlrkelahhsyjrwgsxaf";                // staging: fxmxyabdjqviqbcxmvlp
const apikey = "<VITE_SUPABASE_PUBLISHABLE_KEY>";  // repo → Settings → Variables; public
const { access_token } = JSON.parse(localStorage.getItem(`sb-${ref}-auth-token`));

const data = await (await fetch(`https://${ref}.supabase.co/functions/v1/twilio-selftest`, {
  method: "POST",
  headers: { apikey, Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
  body: "{}",
})).json();
console.table(data.checks); console.log(data.summary, data.accountSid);
```

The workflow is easier and needs no admin session. This is here for the case where you are already
signed in and looking at something.

This asks **Twilio** — not the secret store — whether the account credentials are a valid pair, the
API key belongs to that account, the TwiML App exists **with its Voice Request URL set to a URL that
actually routes to `twilio-voice-twiml`**, and the Conversations service exists.

**Why it goes before gate 1.** Gate 1 proves the secrets are present and well-formed enough to mint
a token. It cannot detect a TwiML App whose Voice URL was never filled in, or filled in wrongly —
either mints a token happily, shows the call button, and then dies silently at the moment two people
are trying to speak. Gate 0 names both: *"its Voice Request URL is EMPTY"*, and *"is not a routable
Edge Function URL … Twilio will POST it and get a 404"* — the second being the one production was
actually in, see 2c-0 below.

Reading the output:
- `ok: true` — working. `ok: false` — broken, and the `detail` says how.
- **`ok: null` is not a failure.** It means not applicable: the PSTN path and the SMS/WhatsApp
  webhooks need a phone number Xoot deliberately does not buy. Do not "fix" these.

**Run it on staging too, and compare `accountSid`.** The workflow's `both` option does this for you
— it now *compares* the two rather than asking you to, and fails the run when they match. The same
Account SID on both projects means staging and production share Twilio credentials, which
`SECRETS_INVENTORY.md` forbids — a staging test call would then bill and log against the live
account, and a staging leak would reach production.

---

## Gate 0's findings (§2c-0) — one fixed, one still open

Gate 0 went green and immediately reported two real defects. ① is now **resolved**; ② is still open.

**① ✅ RESOLVED 2026-08-12 21:40 — production's Voice Request URL now routes.**

```
✅ voice TwiML app: TwiML App "Xoot TwiML App Production" (APcfd1e30…)
   Voice URL: https://mvlrkelahhsyjrwgsxaf.functions.supabase.co/twilio-voice-twiml (POST)
✅ voice TwiML app method: POST
✅ voice status callback: https://mvlrkelahhsyjrwgsxaf.functions.supabase.co/twilio-voice-status
```

Production's summary now reads *"Voice and chat are configured"*. Staging is green too.

<details>
<summary>What was wrong, and what it cost — kept because the lesson outlived the bug</summary>

The value was `https://mvlrkelahhsyjrwgsxaf.supabase.co/twilio-voice-twiml`. Supabase serves an Edge
Function on two URL shapes and no others:

```
https://<project-ref>.functions.supabase.co/<function-name>
https://<project-ref>.supabase.co/functions/v1/<function-name>
```

That value was neither — the REST host with the function name pasted onto the root, answering 404,
so a production call would connect and then die in silence. Exactly the failure gate 0 exists for,
and **the first version of gate 0 passed it**, because it asked
`voiceUrl.includes("twilio-voice-twiml")`. The check now verifies shape and is unit-tested with the
real broken value as its first case (`src/lib/function-url.test.ts`).

**A wrong guess worth recording.** When the fix appeared not to take, I reasoned that the account
holds two TwiML Apps, so the wrong one was probably being edited. The account *does* hold two — that
part is confirmed below — but that was not the cause: the correct app was edited and the change
landed. The measurement that looked like "still broken" was simply taken before the edit. Worth
remembering that a correct fact and a correct diagnosis are different things.

</details>

> ##### ⚠️ Still true, and worth knowing: there are two TwiML Apps in one account
>
> ```
> APcfd1e30…  "Xoot TwiML App Production"  → production
> AP2afeeb7…  "Xoot TwiML App Staging "    → staging
> ```
>
> They live in one Console list with no environment column, no reliable ordering, and names that
> differ only by a suffix (staging's has a trailing space). **Identify by SID, never by name or
> position.** Gate 0 prints the SID it read and lists every app on the account, marking the one each
> project uses.
>
> This is defect ② showing through as a usability problem. Once staging has its own subaccount, each
> account holds one app and the ambiguity disappears.

### If either URL ever goes wrong again

The values, for both environments. Twilio Console → **Voice** → **Manage** → **TwiML Apps** → the
app matching the SID gate 0 prints. Both fields are **POST**, not GET.

| | production `APcfd1e30…` | staging `AP2afeeb7…` |
|---|---|---|
| Voice Request URL | `https://mvlrkelahhsyjrwgsxaf.functions.supabase.co/twilio-voice-twiml` | `https://fxmxyabdjqviqbcxmvlp.functions.supabase.co/twilio-voice-twiml` |
| Status Callback | `https://mvlrkelahhsyjrwgsxaf.functions.supabase.co/twilio-voice-status` | `https://fxmxyabdjqviqbcxmvlp.functions.supabase.co/twilio-voice-status` |

The two columns differ only by project ref, `mvlrk…` vs `fxmxy…`. **Pasting the wrong one is a
mistake gate 0 will not catch**, because the ref is deliberately not pinned — a custom domain in
front of the functions would otherwise read as broken. Match the ref to the environment by eye.

Save, then re-run gate 0 (`environment: both`). If a row still fails, compare the SID it prints
against the app you edited before touching the URL again.

> **No secret needed changing, and that was checked rather than assumed.** Both voice functions
> validate Twilio's HMAC against an override secret when one is set, so a stale override would have
> turned the 404 into a **403** — the call still dead, different error, no log line. Measured on
> production:
>
> ```
> ➖ voice TwiML signature URL:  TWILIO_WEBHOOK_TWIML_URL is not set
> ➖ voice status signature URL: TWILIO_WEBHOOK_STATUS_URL is not set
> ✅ webhook base URL:          https://mvlrkelahhsyjrwgsxaf.functions.supabase.co
> ```
>
> Both overrides unset means validation falls back to the request URL, which by definition matches
> whatever Twilio called. The third line also explains the original defect: `TWILIO_WEBHOOK_BASE_URL`
> held the *correct* origin, so the secret was set properly and only the Console field was typed
> wrongly — which is why the five non-voice webhooks were never affected.

**② Staging and production share one Twilio account.** Both report Account SID `AC93de1e…` and the
same API key, "ZOOT API KEY". `SECRETS_INVENTORY.md` forbids this, and gate 0 now fails the run on
it rather than printing a note.

It matters most for gate 3: every staging test call **bills the live account and appears in its
call logs**, indistinguishable from a customer's, and a staging credential leak is a production
credential leak. Until this is done, treat staging voice as production voice.

### Fixing it — ten minutes, either route

Two ways, same result. **Route A needs a terminal; route B needs only a browser.** Both end at the
same place — seven values pasted into staging's Edge Function secrets — so read
[*Setting the seven staging secrets*](#setting-the-seven-staging-secrets) whichever you pick.

> ⚠️ **The subaccount script is deliberately not a workflow, and must not become one.** It prints
> `TWILIO_API_KEY_SECRET`, which Twilio shows exactly once, and a workflow log is retained for
> anyone with repository access. `arm-call-test.mjs` *is* wrapped in a workflow precisely because it
> prints nothing secret — that difference is the whole rule.

## Route A — the script (needs a terminal)

Four Console screens in the right order, done for you, with the TwiML App born pointing at
staging's routable URLs so it cannot repeat ①.

**1. Get the parent account's credentials.** Twilio Console dashboard → Account Info →
**Account SID** and **Auth Token**. These are the *production* account's, which is correct: a
subaccount is created by its parent.

**2. Dry run.** Changes nothing, prints exactly what it would create:

```bash
XOOT_TWILIO_ACCOUNT_SID=AC... XOOT_TWILIO_AUTH_TOKEN=... \
  node scripts/ops/create-staging-twilio-subaccount.mjs
```

**3. Run it for real:**

```bash
XOOT_TWILIO_ACCOUNT_SID=AC... XOOT_TWILIO_AUTH_TOKEN=... \
  node scripts/ops/create-staging-twilio-subaccount.mjs --confirm
```

It creates a subaccount named `Xoot Staging`, an API key on it, a TwiML App **already pointing at
staging's routable URLs** — so it cannot repeat ① — and a Conversations service. Then it re-reads
the TwiML App and refuses to claim success unless the Voice URL stuck.

It also prints the seven values, filled into a ready-to-paste `supabase secrets set` command. Go to
[*Setting the seven staging secrets*](#setting-the-seven-staging-secrets).

If a subaccount named `Xoot Staging` already exists, the script refuses rather than making a second
one — Twilio subaccounts cannot be deleted, only closed. Take the existing one's SID and Auth Token
from the Console and skip to the secrets step.

## Route B — the Twilio Console (browser only)

Six screens, each producing exactly one value. Write each one down as you go; three of them are
awkward or impossible to find again.

**1. Create the subaccount.** Console → the **account picker** (top left, showing your account
name) → **Manage account** / **Subaccounts** → **Create new subaccount**. Friendly name exactly:

```
Xoot Staging
```

The list then shows its **Account SID**, starting `AC…`. → `TWILIO_ACCOUNT_SID`

**2. Switch into it, and take its Auth Token.** Account picker → **Xoot Staging**. Everything from
here happens *inside the subaccount* — this is the step people miss, and creating the API key on the
parent instead is silent and wrong. Its dashboard shows an **Auth Token** behind a "show" toggle.
→ `TWILIO_AUTH_TOKEN` **and** `TWILIO_WEBHOOK_AUTH_TOKEN`, both, same value.

> ⚠️ **Both names, or five webhooks break silently.** Twilio issues one Auth Token per account; this
> repo reads it under two names, and setting only one leaves the message, WhatsApp, verify,
> status-callback and voice webhooks rejecting every inbound request with a 403 and no log line.
> This has already happened here once.

**3. Create an API key.** Still inside `Xoot Staging`: **Account → API keys & tokens → Create API
key**. Friendly name `Xoot Staging API Key`, type **Standard** (not Main). It shows an **SID**
(`SK…`) and a **Secret**.

> ⚠️ **The secret is shown on this screen and never again.** Twilio does not store it in retrievable
> form. Paste it straight into step 6 before you navigate away. If you lose it, delete the key and
> make a new one — there is no recovery, only replacement.

→ `TWILIO_API_KEY_SID` and `TWILIO_API_KEY_SECRET`

**4. Create the TwiML App.** **Voice → Manage → TwiML Apps → Create new TwiML App**. Friendly name
`Xoot TwiML App Staging`. Fill in, and **set both methods to POST** — GET is the default on one of
them and is the exact failure ① was:

| field | value | method |
|---|---|---|
| Voice **Request URL** | `https://fxmxyabdjqviqbcxmvlp.functions.supabase.co/twilio-voice-twiml` | POST |
| Voice **Status Callback URL** | `https://fxmxyabdjqviqbcxmvlp.functions.supabase.co/twilio-voice-status` | POST |

Those are **staging's** URLs — ref `fxmxy…`, not `mvlrk…`. Save; the app SID starts `AP…`.
→ `TWILIO_VOICE_APP_SID`

**5. Create a Conversations service.** **Conversations → Manage → Services → Create new service**,
name `Xoot Staging Conversations`. Its SID starts `IS…`. → `TWILIO_CONVERSATIONS_SERVICE_SID`

**6.** Continue to [*Setting the seven staging secrets*](#setting-the-seven-staging-secrets).

## Setting the seven staging secrets

Seven names, from either route. **Nothing needs redeploying afterwards** — Edge Functions read
secrets at runtime.

| secret | where it came from |
|---|---|
| `TWILIO_ACCOUNT_SID` | the subaccount, `AC…` |
| `TWILIO_AUTH_TOKEN` | the subaccount's Auth Token |
| `TWILIO_WEBHOOK_AUTH_TOKEN` | **the same Auth Token again** |
| `TWILIO_API_KEY_SID` | `SK…` |
| `TWILIO_API_KEY_SECRET` | shown once, on the API key screen |
| `TWILIO_VOICE_APP_SID` | `AP…` |
| `TWILIO_CONVERSATIONS_SERVICE_SID` | `IS…` |

**In a terminal:** the script prints the `supabase secrets set --project-ref fxmxyabdjqviqbcxmvlp`
command with every value already in it. Paste, run, then clear your scrollback.

**In a browser:** Supabase Dashboard → project **`fxmxyabdjqviqbcxmvlp`** → **Project Settings →
Edge Functions → Secrets** → *Add new secret*, once per row above. Same effect as the CLI command;
this is the only route if you do not have a terminal, and the script's printed command is unusable
without one.

**Then prove it.** Re-run gate 0 with `environment: both`. The shared-Account-SID error should be
gone, the two Account SIDs should differ, and staging's voice rows should be green because the TwiML
App was born correct.

**What this does and does not separate.** It separates identity, credentials and call logs — which
is what `SECRETS_INVENTORY.md:56` asks for and what stops a staging call from looking like a
customer's. It does **not** separate the invoice: a subaccount still bills to the parent. If you
want separate billing, that is a second Twilio account rather than a subaccount, and a bigger
decision than either route above makes.

**Gate 1 — the per-booking check. Gate 0 already answers most of it.**

For *"did the seven secrets land?"*, **gate 0 is the better tool and needs no sign-in**: the
self-test reads all seven `TWILIO_*` variables server-side and names the missing ones
(`twilio-selftest/index.ts`). One click, either environment.

Gate 1 is worth running for the thing gate 0 cannot see: whether `twilio-token` will actually mint a
token **for a given booking and a given signed-in account** — the participation check and the
per-capability secret scoping. Sign in, open a booking you are on, and paste this into the browser
console:

```js
// Staging; for production use mvlrkelahhsyjrwgsxaf and that project's publishable key.
const ref = "fxmxyabdjqviqbcxmvlp";
const apikey = "<VITE_SUPABASE_PUBLISHABLE_KEY>";  // repo → Settings → Variables; public, not a secret
const { access_token } = JSON.parse(localStorage.getItem(`sb-${ref}-auth-token`));

console.log(await (await fetch(`https://${ref}.supabase.co/functions/v1/twilio-token`, {
  method: "POST",
  headers: { apikey, Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ bookingId: "<a booking id you are a participant on>", capability: "voice" }),
})).json());
```

- `{ configured: false, missing: ["TWILIO_VOICE_APP_SID", …] }` — the function naming exactly which
  secrets are absent. Set those and run it again.
- `{ configured: true, token: "ey…" }` — all seven are in, **and** this account may call on this
  booking.
- `401` / `403` — the secrets may be fine; you are not a participant on that booking, or the session
  in `localStorage` has expired. Reload and sign in again.

> ⚠️ **CORRECTED 2026-08-13.** This block previously read
> `await window.supabase.functions.invoke("twilio-token", …)`. **`window.supabase` does not exist** —
> `src/integrations/supabase/client.ts` exports `supabase` as a module binding and nothing assigns it
> to `window`, so that snippet threw `TypeError` for everyone who pasted it, in a document that
> called it "the single most useful command" here. Written and never once run. The form above uses
> only what a browser already has: the session the client persists to `localStorage`, and the
> publishable key, which is public and already shipped inside the bundle.

**Gate 2 — does the webhook signature check pass?** This is the one the two-Auth-Token-names bug
broke. In the Twilio Console: Monitor → Logs → **Errors**. A `403` from `twilio-voice-twiml` with no
matching function log means the Auth Token is wrong or absent. Nothing else produces that pattern.

**Gate 3 — a real two-party call.** The only proof that media flows. Everything above proves
configuration; this proves sound comes out. Until it has happened once, voice calling is code that
has never run.

Written out properly below, because "two browsers" is a description, not instructions.

## The two-party call, step by step (§2c-i)

Budget 15 minutes the first time. You need **two devices, or one device and a phone** — see step 4.

### First: which environment, and is it worth starting?

Two questions, in this order. Both have measured answers as of 2026-08-12.

**Where?** → **Staging.** Both environments' Twilio configuration is now correct — 2c-0 ① was fixed
at 21:40 and gate 0 is green on voice for both. So this is no longer "production cannot connect";
it is that a production call is a customer-facing surface and staging is where the smoke booking
and the arming script live.

**What does it cost?** → **A staging call is a live-account call.** Both projects use Twilio account
`AC93de1e…`, so it bills production and appears in production's call logs (2c-0 ②). Cents, and fine
for a handful of tests. It is the reason to do the subaccount before anyone but you tests voice.

**Then run gate 0 and read it before going further.** Actions → *Twilio self-test* → `environment:
both`. Every step below assumes Twilio's side is right; if gate 0 is red for the environment you
picked, the steps will still "work" and the call will still fail, and you will be debugging your
browser instead of your configuration.

### Then: arm staging with one click — it does steps 1 to 3 for you

**Actions → *Arm the two-party call test* → Run workflow.** Nothing to fill in.

The run summary comes back with both sign-in addresses, the booking URL, when the window shuts, and
four ✅/❌ checks. Those checks are made by **re-reading the booking after writing it**, so a green
summary means the booking is genuinely callable — not merely that the workflow ran. Then
**skip to step 4**.

<details>
<summary>The same thing from a terminal, if you have one</summary>

```bash
ZOOT_STAGING_SUPABASE_URL=... ZOOT_STAGING_SERVICE_ROLE_KEY=... \
  node scripts/ops/arm-call-test.mjs
```

The workflow is a wrapper around exactly this, fetching the staging service-role key at run time
with the account access token rather than storing one. The script's staging-ref refusal
(`arm-call-test.mjs:71`) is unchanged and is what makes running it from CI safe: it rewrites a
booking's schedule and status, which is harmless on smoke data and data loss on real data.

</details>

**Forgotten the two smoke passwords?** Run the workflow with **`set_passwords` ticked**. It needs a
repository secret named `XOOT_CALL_TEST_PASSWORD` (Settings → Secrets and variables → Actions → New
repository secret, at least 12 characters, something you can type on a phone); the workflow refuses
up front with that path if it is missing, rather than failing four minutes in.

⚠️ The window is only about four and a half hours wide. If the call button has vanished since you
last looked, re-run this rather than concluding the feature is broken — that is the single most
likely reason, and it is invisible on screen.

Steps 1 to 3 below are what the script does for you. Read them only if you are doing this on
production, or if it refuses.

1. **Two accounts.** One customer, one Xooter. The Xooter account must be approved and active
   (`zooters.active = true`), which `approve-zooter` sets. If you only have one real Xooter, use
   your own second email.

2. **One booking, with both of them on it.** Create a booking as the customer, then assign the
   Xooter to it. Both parties must be on the *same* booking row — `assertBookingParticipant` checks
   `bookings.user_id` and `bookings.zooter_id`, and an admin account does not substitute for either.

3. **Move the booking to `en_route` or `in_progress` — AND put it inside the access window.**
   This is the step that has silently defeated every previous attempt, because it is really two
   conditions and the runbook used to name only the first:

   ```
   maskedCallAvailable = status ∈ {en_route, in_progress}
                         AND canAccessSensitiveBookingData(...)
   ```

   `canAccessSensitiveBookingData` (`src/lib/operations.ts:275`) is a **time window**, open from
   **`scheduled_at − 45 minutes`** to **`scheduled_at + duration_hours + 30 minutes`**. A booking
   dated last month at `en_route` shows **no call button at all**, and nothing on screen says why —
   which is exactly the state staging's smoke booking sat in until 2026-08-12.

   So the booking's `scheduled_at` must be roughly *now*. Set it to fifteen minutes ago and give it
   a `duration_hours` of 4, which leaves the window open for about four and a half hours. The
   Xooter moves the status from their job screen; an admin can also set it from Admin → Ops.

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
| No call button at all | **Check the window first** — `scheduled_at` more than 45 min in the future, or past `scheduled_at + duration + 30 min`, hides the button with no message. Then check status is `en_route`/`in_progress`, then that the signed-in account is a participant. Step 3. |
| "Calling is not configured" | `twilio-token` returned `configured: false`. Gate 1 names the missing secrets. |
| Rings, then drops immediately | The TwiML App's Voice Request URL is empty, or set to something that does not route, or set to GET instead of POST. **Gate 0 catches all three** — it is the failure the self-test exists for. This was production's state until 2026-08-12 21:40; see 2c-0 ① for the values. |
| Connects but silence one way | Microphone permission denied on the silent side, or the OS input device is muted. Step 5. |
| Connects but silence both ways | Media is being blocked — a corporate network or VPN dropping UDP. Retry on a mobile hotspot to confirm. |
| `403` in the Twilio Console with no matching function log | Auth Token wrong or absent. Gate 2. |
| One leg in the conference, not two | The callee never accepted, or their token was minted for a different booking. |

**⚠️ This is the one gate no agent can run.** It needs two humans, or one human with two devices,
in front of two microphones. Everything else in section 2c is now automated; this is not, and no
amount of server-side checking substitutes for it. Do not treat a green gate 0 as a working phone.

**What I cannot do:** gates 1, 2 and 3 from a session. The agent proxy denies `*.supabase.co`,
`xoot.co.za` and `api.twilio.com` — organisation egress policy, logged as `connect_rejected` — and
`pg_net`/`http` are not installed, so an Edge Function cannot be invoked from a session at all. That
is why gate 0 and the arming step both live in workflows: a runner has the network access a session
does not. Paste me the output of gate 1 and I will tell you what is missing.
