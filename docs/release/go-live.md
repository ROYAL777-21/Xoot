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

### 2a. The secrets

Seven are required by `twilio-token` before it will mint anything; it returns
`{ configured: false, missing: [...] }` rather than a token until all seven exist. The eighth is
only needed for the masked-PSTN fallback.

| Secret | Where it comes from |
| --- | --- |
| `TWILIO_ACCOUNT_SID` | Console home. Starts `AC`. |
| `TWILIO_API_KEY_SID` | Account → API keys & tokens → Create API key. Starts `SK`. |
| `TWILIO_API_KEY_SECRET` | Shown **once**, at creation. Copy it then or make a new key. |
| `TWILIO_CONVERSATIONS_SERVICE_SID` | Conversations → Services. Starts `IS`. |
| `TWILIO_VOICE_APP_SID` | Voice → TwiML Apps → create one, Voice URL → `twilio-voice-twiml`. Starts `AP`. |
| `TWILIO_CALLER_ID` | A verified number on the account, E.164 (`+27…`). |
| `TWILIO_WEBHOOK_AUTH_TOKEN` | Console home, next to the Account SID. This is what every webhook's HMAC-SHA1 check validates against. |
| `TWILIO_PROXY_SERVICE_SID` | Proxy → Services. **Optional** — masked PSTN only. |

```bash
supabase secrets set \
  TWILIO_ACCOUNT_SID=AC... \
  TWILIO_API_KEY_SID=SK... \
  TWILIO_API_KEY_SECRET=... \
  TWILIO_CONVERSATIONS_SERVICE_SID=IS... \
  TWILIO_VOICE_APP_SID=AP... \
  TWILIO_CALLER_ID=+27... \
  TWILIO_WEBHOOK_AUTH_TOKEN=... \
  --project-ref mvlrkelahhsyjrwgsxaf
```

One more, only if a proxy or load balancer rewrites the host: `TWILIO_WEBHOOK_TWIML_URL`. Twilio
signs the URL it *dialled*, not the one the function sees, so a mismatch fails every signature
check silently. Set it to the exact URL configured in the TwiML App.

### 2b. Then, and only then, the two switches

```sql
-- Production. Both are required by the code; enabling one alone changes nothing.
update public.operational_controls
   set enabled = true
 where control_key in ('twilio.operational_messages', 'twilio.masked_voice')
   and environment = 'all';
```

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

### 2c. The test that actually proves it

**No call has been placed on any surface, ever.** Two browsers, two accounts that are both
participants on the same booking, booking status `en_route` or `in_progress`. Both should hear each
other. Until that has happened once, voice calling is code that has never run.

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

Apply it, then regenerate `src/integrations/supabase/types.ts` from the live schema. The column was
added to that file by hand so the schema-contract test could pass ahead of the migration; a real
regeneration replaces the hand edit and confirms the live database agrees.

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

## 4. SOS (#36)

`SAFETY_READINESS` stays false until an actual emergency call has been placed and received.

The test is not a code review. Dial 112 from a real handset, on the network the app will run on, and
have an ops person confirm the alert arrived with the right booking, address and contact. Then flip
the flag.

Shipping the button before that means shipping something that promises help and does not fetch it —
to a person who is, by definition, having the worst moment the product will ever be part of.

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
