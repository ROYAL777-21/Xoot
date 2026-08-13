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

*Or, from an admin browser session, the same check by hand:*

```js
const { data } = await window.supabase.functions.invoke("twilio-selftest", { body: {} });
console.table(data.checks); console.log(data.summary, data.accountSid);
```

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

### Fixing it — ten minutes, one script and one command

There is a script, because doing this by hand is four Console screens in the right order and one of
them shows you a secret exactly once.

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

**4. Set the seven staging secrets.** The script prints the whole command filled in. Paste and run
it.

> ⚠️ **`TWILIO_API_KEY_SECRET` is shown once and never again.** Twilio does not store it in
> retrievable form. Copy it into the command, run it, then clear your scrollback. If you lose it,
> delete the key in the Console and make a new one — there is no recovery.
>
> ⚠️ **Run this in your own terminal, never in a workflow.** A workflow's output is a retained log,
> and that secret would be in it. No workflow in this repo calls this script, deliberately.
>
> ⚠️ Both Auth Token names get the same value. Twilio issues one Auth Token per account; this repo
> reads it under `TWILIO_AUTH_TOKEN` and `TWILIO_WEBHOOK_AUTH_TOKEN`, and setting only one leaves
> five webhooks rejecting every inbound request with a silent 403.

**5. No redeploy.** Edge Functions read secrets at runtime.

**6. Prove it.** Re-run gate 0 with `environment: both`. The shared-Account-SID error should be
gone, the two SIDs should differ, and staging's voice rows should be green because the TwiML App was
born correct.

**What this does and does not separate.** It separates identity, credentials and call logs — which
is what `SECRETS_INVENTORY.md:56` asks for and what stops a staging call from looking like a
customer's. It does **not** separate the invoice: a subaccount still bills to the parent. If you
want separate billing, that is a second Twilio account rather than a subaccount, and a bigger
decision than this script makes.

If a subaccount named `Xoot Staging` already exists, the script refuses rather than making a second
one — Twilio subaccounts cannot be deleted, only closed. Take the existing one's SID and Auth Token
from the Console and go straight to step 4.

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

### Then: arm staging with one command — it does steps 1 to 3 for you

```bash
ZOOT_STAGING_SUPABASE_URL=... ZOOT_STAGING_SERVICE_ROLE_KEY=... \
  node scripts/ops/arm-call-test.mjs
```

It puts the smoke booking into the callable window, prints both sign-in addresses and the booking
URL, and **verifies all four gate conditions before saying it worked**. Then **skip to step 4**.

⚠️ The window is only about four and a half hours wide. If the call button has vanished since you
last looked, re-run this rather than concluding the feature is broken — that is the single most
likely reason, and it is invisible on screen.

Steps 1 to 3 below are what the script does for you. Read them only if you are doing this on
production, or if the script refuses.

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

**What I cannot do:** gates 1, 2 and 3 from a session. The agent proxy denies `*.supabase.co`, and
`pg_net`/`http` are not installed, so an Edge Function cannot be invoked from a session at all —
which is exactly why gate 0 moved into a workflow, where a runner with network access can make the
call instead. Paste me the output of gate 1 and I will tell you what is missing.
