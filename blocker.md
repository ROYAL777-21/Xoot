# Xoot Production Blockers

Reviewed: 2026-08-02

This file lists unresolved blockers only. Resolved implementation history lives in git
commits, Supabase migration history, and phase reports. Items closed at each review are
listed once under "Closed at review" at the foot of the file, then dropped.

Everything dated 2026-08-02 in this file was re-verified live against both Supabase
projects on that date, not carried forward on trust.

## What is actually left, and who can move it

Added 2026-08-07. The sections below are the detail; this is the triage, because 98 entries
interleaved with closed history make it hard to see what is genuinely outstanding.

**Nothing here is blocked on writing code that nobody has written.** Almost everything left
needs an account, a dashboard, a device, or a decision.

### You, roughly ten minutes each, and everything else waits on the first two
1. `ENCRYPTION_KEY` on both projects, **different values** —
   `npm run ops:supabase:encryption-key -- -ProjectRef <ref>`. Gate codes cannot be stored
   until this exists. Reported done 2026-08-07 but unverifiable from an agent session, because
   Supabase never reads a secret value back.
2. `ALLOWED_ORIGINS = https://xoot.co.za,https://www.xoot.co.za` on both projects. **Verified
   2026-08-07 against deployed source, not inferred:** all 42 production functions have
   `zoothome.co.za` compiled in as their fallback, because the domain change landed four hours
   after the last deployment. Until this secret is set, every browser call from `xoot.co.za`
   is answered `403 origin not allowed`. One `supabase secrets set`, no redeploy needed, and
   it is the *safe* fix — redeploying to solve the same problem drags in a repricing.
3. Dismiss two by-design Supabase advisor findings (`set_safety_pin`, `user_safety_pins`).
4. Leaked-password protection — deliberately deferred, still off.

### Decisions only you can make
- **ZD-005, the schema source of truth.** Four written migrations are unapplied behind it.
- **The `zoot://` deep-link scheme.** Must change before first store submission or not at all;
  it cannot move independently of Google/Apple OAuth config.
- **The R39 one-time service fee.** The server charges it, the price screen does not show it.
  Closing the gap raises every quoted one-time total, which is a commercial call.

### Blocked on an external account, not on us
Twilio (masked voice, WhatsApp sender, the two items at the top of this file), Mapbox,
Cloudflare, Apple/Google/Expo and the stores, WordPress, Hostinger/Netlify, and the payment
provider. Each section below says what specifically is needed.

### Blocked on a physical device
iOS and Android verification of the native launch experience, Live Activities, widgets and
Siri intents. Simulators are not sufficient for any of them.

### Still to build, and not blocked on anything
- **SOS client UI — built 2026-08-07, ships dark on purpose.** `src/lib/sos-session.ts` (the
  lifecycle as a pure state machine) and `src/components/zoot/SosButton.tsx`. It renders
  nothing until `canArmSos()` is true, which needs `SAFETY_READINESS === "live"`, and the
  value is still `schema_pending` — `safety.test.ts:181` pins it deliberately.

  **Advancing it is a founder step, not a code change**, and it is the rule `safety.ts` sets:
  no safety promise may be shown before the thing it promises works. To reach `"live"`:
  redeploy `raise-sos-alert` (it currently carries the PIN hole above), dial 112 from a real
  handset and confirm it connects, and confirm an ops person actually receives the alert.
  Only then change the constant and the test that pins it. Nothing else in the app is
  blocked by leaving it dark.

  Recording UI is still unbuilt. It opens at `server_ready` rather than `live`, but turning
  it on needs the both-party notice wording settled first (RICA s4 / POPIA), which is a
  decision, not a build.
- **Property allocation — step one built 2026-08-07 (`0ce6dbf`), in repo, not deployed.**
  The founder chose "link bookings to a property" out of three readings. `create-booking` now
  accepts `propertyAccountId`, proves the caller owns it (`.eq("user_id", user.id)`, one
  `property account not found` message for both "no such property" and "not yours", checked
  before the insert), and writes `bookings.property_account_id`. `Book.tsx` has the picker;
  `src/lib/server-authority.test.ts` guards the ownership check and fails if the caller scope
  is removed.

  **It changes nothing for customers until `create-booking` is deployed, and that deployment
  is the repricing** — the same function carries the ZD-020 ladder. Until then the column
  still never holds a value in production.

  Not built, and still unspecified: preferred Xooter per property, per-property schedules and
  preferences. The brief covers curated onboarding by customer type (§5.1b) and says nothing
  about either. Do not infer them from the column.
- `create-booking-request` still does not accept a property account id. Left alone
  deliberately — it is the pre-booking enquiry path, and widening it was not asked for.
- ~~Multi-Xooter~~ — **already built, corrected 2026-08-07.** `Book.tsx` has had the whole
  feature all along: a capped "How many Xooters?" stepper, multi-select, the 10% discount at
  3+, and it sends `workerCount` and `zooterIds` to `create-booking`. It was listed here as
  outstanding in error. What this session actually added is the estimate screen's own copy
  plus a guard holding all three implementations of the discount rule together.

---

## Production is charging prices nobody approved

Found 2026-08-07 by reading the deployed function rather than the repository, while checking
whether Edge Functions could be redeployed to fix CORS. **This is the most consequential
finding in this file and it was invisible from the repo.**

`create-booking` in production (v6) and `supabase/functions/create-booking/index.ts` are not
the same program. Live runs the superseded model:

    homeSizes        = { small: R270, medium: R315, large: R390 }
    serviceMultiplier = { residential: 1, express: 0.85, airbnb: 1.15, office: 1.2,
                          deep: 1.35, moving: 1.4, premium: 1.55 }
    basePrice        = size.price x length.priceFactor x serviceMultiplier
    bookingCover     = 21

Those are exactly the values `src/lib/pricing-parity.test.ts` asserts must never reappear
(lines 72-76: `serviceMultiplier`, `priceFactor`, `price: 270|315|390`, cover `21`). The test
passes because it reads the **repo** file, which was correctly migrated to the approved
ZD-020 ladder. Nothing compares the repo against what is deployed, so the guard has been
green while production charged the old numbers.

Consequences worth stating separately:

- **The R39 one-time service fee gap is live.** Live also computes `serviceFee = 39` and adds
  it to the total, so the client under-quote recorded elsewhere in this file is real in
  production today, on top of a base price nobody signed off.
- **"The server is the authority on money" is only true of the deployed server, and the
  deployed server is wrong.** That phrase appears in the header of `xoot-pricing.ts` and was
  used during this session to justify aligning the client to `create-booking`. The
  multi-Xooter alignment itself still holds — `multiWorkerDiscount >= 3 ? 0.1` and
  `* workerCount` are identical live and in repo — but the reasoning was built on an
  unverified premise.
- **Redeploying `create-booking` is a repricing, not an ops task.** It would switch production
  onto the ZD-020 ladder in one step, changing what every customer is charged. It must not be
  done as a side effect of fixing CORS or anything else. Staging first, compare real quotes
  old against new, then production, with the founder signing off the numbers.

**Nothing was deployed.** The founder asked for a redeploy to fix `ALLOWED_ORIGINS`; that was
stopped once the live source was read. Set the `ALLOWED_ORIGINS` secret instead — it fixes
CORS on all 42 functions with no code change and no pricing risk.

How many *other* deployed functions differ from their repo source was open when this was
written. It has since been answered in full — see the next section.

---

## Every deployed function is stale. Only four differ in ways that change behaviour

Audited 2026-08-07, all 42 production and 33 staging functions, after the `create-booking`
finding above made "how widespread is this?" the obvious next question.

**Result: 42 of 42 production functions are behind the repository. None is in step.**

That sounds worse than it is, and the distinction matters for deciding what to redeploy.

### The four with real logic drift

| Function | Deployed | What the repo has since | Risk of deploying |
| --- | --- | --- | --- |
| `create-booking` | 2026-06-20 | `eb5401e` ZD-020 ladder, `0ce6dbf` property link | **Repricing.** See above. Founder sign-off. |
| `support-respond` | 2026-06-27 | `e34774f` Concierge governance and knowledge boundaries | Tightens Concierge. Safe, wants a smoke test. |
| `twilio-voice-status` | 2026-08-06 10:48 | `d26d838` callback write fix, committed 10:50 — two minutes later | Safe. Missed the deploy by minutes. |
| `twilio-voice-twiml` | 2026-05-19 | `44c2d0a` credential fixes | Safe. Oldest deployment in the estate. |

### The other 38 are stale for one shared reason

`supabase/functions/_shared/action-utils.ts` is bundled into 33 of them at deploy time, and it
last changed at **2026-08-06 15:13 UTC** (`ed8d9e0`). The newest deployment in either project
is `twilio-voice-status` at **2026-08-06 10:48 UTC** — four and a half hours earlier. No
deployed function can carry that change, and the change is the production domain:

    deployed today:   "https://zoothome.co.za",  "https://www.zoothome.co.za"
    repository:       "https://xoot.co.za",      "https://www.xoot.co.za"

Verified by reading the deployed bundle of `twilio-token` from the live project, not inferred
from dates. Its own handler is byte-identical to the repo; only the vendored `_shared` copy is
old. The remaining 5 (`twilio-*-webhook` family) are stale on `_shared/twilio-webhook.ts` from
`2026-07-29`, same shape of problem.

**This is what makes `ALLOWED_ORIGINS` load-bearing rather than tidy-up.** `getAllowedOrigins()`
reads the env var *first* and only falls back to the compiled list, so setting the secret
corrects all 42 functions at once, with no deploy and no pricing risk. Leaving it unset means
`handlePreflight` answers `403 origin not allowed` to every browser call from `xoot.co.za`.

### Also true, and separate

The Zoot→Xoot rename (`4f9ca8c`, 2026-07-29) never reached production either. Live functions
still send email with `subject: "Confirm your Zoot account"` and similar across the playbook.
Customer-visible, not dangerous, fixed by the same redeploy — which is worth doing for the 37
non-pricing functions once `create-booking` is decided separately.

### Staging cannot validate the repricing as it stands

Staging has **33 functions, newest deployed 2026-06-30**, and is missing nine that production
runs: `raise-sos-alert`, `respond-zooter-job`, `sensitive-access-read`, `sensitive-access-save`,
`training-module`, `twilio-conversation`, `twilio-token`, `twilio-voice-status`,
`twilio-voice-twiml`. It is not a mirror of production and has not been one for over a month.
"Test the new prices on staging first" therefore requires bringing staging up to date as its
own step — do not treat staging agreement as evidence about production until that is done.

### Method, now a script rather than a one-off

`npm run ops:supabase:deployed-drift` (add `-- --staging` for the other project). It compares
deployment timestamps against `git log` per function directory **and against every `_shared/*.ts`
the function imports, followed transitively**. The shared-module step is what turned "5 look
fine" into the correct "0 are in step", and omitting it is how this drift stayed invisible for
six weeks; it is the first thing `src/lib/deployed-drift.test.ts` pins. Exits 1 on drift, so CI
can hold it.

Needs `SUPABASE_ACCESS_TOKEN`. Where `api.supabase.com` is unreachable — as it is from an agent
session, org egress policy blocks it — pass `--from-json <file>` with the same shape the
Management API returns. The comparison is identical; only the source of the list differs. It was
verified that way against the real 42-function production list and reproduces the audit above
exactly.

**A clean run is a weaker claim than it looks, and the script says so in its own output.**
Timestamps prove a deployment *cannot* contain current code; they cannot prove it does. Anything
deployed from another branch or hand-edited in the dashboard reads as current. Only fetching the
live source and diffing settles it — worth doing for anything that touches money or auth, which
is how the `create-booking` repricing was found.

Live source was spot-checked with `get_edge_function` to confirm the dates were telling the
truth. Direct CORS probing was not possible: `*.supabase.co` is blocked too, so a `403` seen
from a session is the proxy, not the function.

## Live security holes — fix before anything else

- **OPEN IN PRODUCTION 2026-08-07 — an SOS alert can be cancelled without the PIN for five
  seconds after it dispatches.** Fixed in repo, **not deployed**.

  `raise-sos-alert` decided whether the cancel PIN was required with
  `needsPin = elapsedSeconds >= 5`, measured from `safety_sos_alerts.triggered_at`. That rule
  was written for a design where the row is created when the countdown *starts*. The function
  does not do that — it inserts only at dispatch, and `triggered_at` defaults to `now()`
  (confirmed in the migration and against the live column). So elapsed was ~0 at dispatch and
  stayed under five seconds for five seconds *afterwards*, leaving a free, PIN-less cancel in
  exactly the window the PIN exists to close. `safety.ts` states the threat model plainly:
  once dispatched, the person most motivated to cancel may be the person the alert is about —
  and they are holding the phone.

  Confirmed `raise-sos-alert` is the only writer and only ever inserts `state: "dispatched"`,
  so no `armed` row is ever created and the window was always open, not an edge case.

  Fixed by `needsPin = alert.state === "dispatched" || elapsedSeconds >= COUNTDOWN_SECONDS`.
  The elapsed branch is kept for a future arm-then-dispatch path. Guarded by
  `safety.test.ts` → "requires the PIN for any dispatched alert, whatever the clock says",
  verified to fail against the old rule.

  **The deployed copy still has the hole.** `raise-sos-alert` is a non-pricing function, so
  redeploying it carries none of the `create-booking` risk — it is the strongest single reason
  to green-light the non-pricing redeploys.

- **CLOSED 2026-08-02 — the client-as-source-of-truth hole.** `FOR ALL USING (user_id =
  auth.uid())` was written across the schema to mean "this row is yours"; Postgres reads it
  as "you may write anything in this row", because RLS is row-level and has no opinion about
  columns. Any signed-in user could self-approve a Xooter application including stamping an
  admin's UUID on `reviewed_by`, mark their own ID documents verified, self-certify safety
  training, mint ZootCred that `redeem-zootcred` spends on real services, approve their own
  Care+ and mark the fee paid, issue a paid gift order without paying, and forge or delete
  the booking audit trail. `anon` also held write grants on ~20 tables.

  Closed by `20260802120000_client_write_surface_lockdown.sql` using **column-level GRANTs** —
  GRANT is column-aware and is checked before any policy runs. Applied to both projects and
  verified against each: decision columns writable `0`, user-authored still writable `4/4`
  sampled, answer key readable `0`, `anon` write grants one table (`analytics_events`, the
  intended exception). `training-module` and `respond-zooter-job` were deployed to production
  **before** the permission change, so neither flow broke. Client call sites audited and
  repointed on the same day: `src/pages/zooter/Training.tsx` now fetches and submits through
  `training-module`, the web jobs page already routed through `ops-workflow` so it was never
  affected, `post_job_reviews` INSERT remains permitted (only DELETE was revoked), the admin
  pages only read, and nothing in `mobile/src` writes a locked table.

- **Correction to an earlier 2026-08-02 entry.** It claimed a customer could PATCH their own
  booking price to zero. Not reachable: `authenticated` holds only SELECT on `public.bookings`.
  The same is true of `zooters` — no UPDATE grant, so a Xooter cannot set their own `verified`
  flag. Both policies are still wrong and should be narrowed, but as latent hazards rather
  than live holes; they become exploitable the moment anyone grants UPDATE.
  `20260730083000_booking_price_author_guard.sql` remains worth applying as the
  defence-in-depth that makes such a grant safe to add later.

- **CLOSED 2026-08-02 — no production Edge Function is unsourced any more.** All six were
  recovered with `get_edge_function` and committed verbatim. The two webhook functions
  (`twilio-voice-status`, `twilio-voice-twiml`) turned out to be sound: `verify_jwt: false` is
  correct because Twilio calls them, and both validate the HMAC-SHA1 signature with a
  timing-safe comparison, failing closed when the auth token is absent.

- **CLOSED 2026-08-06 — the `twilio-token` / `twilio-conversation` chain is fixed and deployed**
  (both at v5 in production, `verify_jwt` true). Neither checked that the caller was a
  participant in the `bookingId` it was given — only that the caller had an account. Together
  that was read access to a stranger's booking chat from an ordinary account, and
  `twilio-token` additionally granted `voice.outgoing.application_sid`, so the same gap would
  have let any account originate calls billed to the Twilio account.

  Both now resolve the booking and call `assertBookingParticipant` from
  `_shared/action-utils.ts` — the helper `create-masked-call` already used, rather than a
  second implementation of the same check. One 404 covers both "no such booking" and "not a
  participant", so neither endpoint can be used to enumerate booking ids. In
  `twilio-conversation` the gate sits *before* the unconfigured branch, which writes a
  `masked_conversation_sessions` row and an approval-gated outbox event keyed to the booking;
  gating only the provider call would still have let an outsider queue support work against
  someone else's booking with Twilio switched off entirely.

  Also fixed in both: wildcard CORS, `String(err)` responses that disclosed which Twilio
  secrets were configured, and service clients that forwarded the caller's Authorization
  header alongside the service key. `twilio-conversation` no longer returns Twilio's raw error
  body. Guarded by `src/lib/twilio-recovered-functions.test.ts`, which asserts against the
  source with comments stripped and was verified to fail against the pre-fix files.

- **CLOSED 2026-08-06 — `twilio-voice-status` callback writes.** The flagged `.or()` defect was
  real, and reading it properly turned up three more bugs in the same UPDATE, all the same
  shape: an unconditioned write driven by whatever an external callback happened to include.
  The interpolated filter produced an equality against the empty string when only one SID was
  present; `provider_conference_sid: conferenceSid || null` let a call-only callback erase a
  conference SID stored earlier; `ended_at` was set to `null` on every non-terminal status, so
  one late `in-progress` un-ended a finished call; and `duration_seconds` read
  `Number(form.get("CallDuration") ?? 0)`, which is a finite `0` when the field is absent, so a
  real duration was overwritten with zero. Terminal states are now terminal, both SIDs are
  shape-checked before reaching a filter, and the write is by primary key rather than by the
  match filter. `String(err)` is gone. Guarded by 8 assertions in
  `src/lib/twilio-recovered-functions.test.ts`, verified to fail against the pre-fix file.

  Wildcard CORS is left in place here on purpose and is not a defect: this is a webhook that
  returns `{ok:true}` to a server which sends no Origin, so there is no browser to protect.

- **Masked-call correlation is not wired, so `twilio-voice-status` matches no row.** Nothing
  populates `provider_call_sid` or `provider_conference_sid` — `create-masked-call` creates a
  Twilio Proxy session and returns `session_sid` but never persists it. The callback handler is
  now correct, but it has nothing to correlate against. Wire this before enabling
  `twilio.masked_voice`, and confirm from the live account which identifier Proxy actually
  sends on the status callback rather than assuming it is `CallSid`.

- **`status_callback_payload` stores Twilio's entire callback verbatim**, which is where caller
  identifiers accumulate. It needs a POPIA retention rule before masked voice is enabled — the
  same treatment `visit_recordings` got with `purge_after` and the nightly pg_cron job.

- **CLOSED 2026-08-06 — every deployed Edge Function now declares `verify_jwt`.** All 42 live
  functions were read off production with `list_edge_functions` and compared against
  `supabase/config.toml`. 21 were already declared and **all 21 matched live** — no drift. The
  remaining 25 were appended from the live values.

  One of them was the real hazard: **`twilio-voice-twiml` is `verify_jwt = false` live and was
  undeclared.** Supabase defaults an undeclared function to `true`, so a repo-driven
  `supabase functions deploy` would have flipped it — and Twilio cannot present a Supabase JWT,
  so the gateway would have rejected every voice webhook before the HMAC signature check ran.
  Silent, and only visible once voice was switched on.

  Four functions are declared but not deployed — `create-concierge-handoff`,
  `generate-booking-invoice`, `report-concierge-answer`, `resend-booking-invoice`. That is the
  safe direction (declared-not-deployed, rather than deployed-undeclared) and is expected while
  those flows are still gated.

- **CLOSED 2026-08-02 — the sensitive-access defects are fixed and deployed** (both functions
  at v5 in production). The `ENCRYPTION_KEY` fallback is gone, CORS resolves against an
  allow-list, the service client no longer forwards the caller's token, and the catch no longer
  echoes whether the key is configured.

  **ACTION REQUIRED: set `ENCRYPTION_KEY` in Edge Function secrets.** Until it is set, saving a
  gate code fails rather than encrypting it under a key derived from the service role key. That
  is the intended behaviour and nothing regressed — `sensitive_booking_access` held 0 rows, so
  no save had ever succeeded — but the feature cannot work until the secret exists.

  **This one cannot be done by an agent.** The Supabase MCP server exposes SQL, migrations and
  function deploys, but no secrets API — so there is no path to it from a Claude Code session.
  It needs the dashboard or the CLI, from a machine holding `SUPABASE_ACCESS_TOKEN`.

  Use `scripts/ops/set-encryption-key.ps1`, which does the whole step in one command:

  ```powershell
  $env:SUPABASE_ACCESS_TOKEN = "<from supabase.com/dashboard/account/tokens>"
  npm run ops:supabase:encryption-key -- -ProjectRef fxmxyabdjqviqbcxmvlp   # staging
  npm run ops:supabase:encryption-key -- -ProjectRef mvlrkelahhsyjrwgsxaf   # production
  ```

  It generates the key, prints it once so it can go into the password manager, refuses to
  continue until that is confirmed, writes it to a temp file outside the repository, sets it,
  then overwrites and deletes the temp file. `-ProjectRef` is mandatory and has no default, so
  the target is always a conscious choice. Run it **twice with different keys** — one per
  project — so a staging leak cannot decrypt production gate codes.

  The script exists because the manual version has four silent failure modes: a non-cryptographic
  random source, the same key on both projects, setting it without saving it, and leaving the
  plaintext in a file or in shell history.

  **Correction to an earlier draft of this entry**, which suggested generating the key with
  `Get-Random`. That is a clock-seeded PRNG and is not suitable for key material — the script
  uses `System.Security.Cryptography.RandomNumberGenerator`. Anyone who generated a key from
  the old snippet should replace it, which is still free while `sensitive_booking_access` is
  empty.

  Treat it as unrecoverable once real gate codes exist: it is the only key that can decrypt
  `sensitive_booking_access`, Supabase will not show it again after saving, and losing it means
  losing the plaintext. Setting it today is free precisely because that table is still empty;
  changing it later is a data migration.

  Still open, deliberately separate because it changes the caller's contract:
  `sensitive-access-save` decides what to encrypt by regex-matching the *field name*, so a field
  a customer calls "how to get in" is silently dropped and reported as `no_sensitive_fields`
  while the same text probably lands somewhere unencrypted.

- Staging and production Supabase security advisors both report leaked password protection
  disabled. It is one Auth-settings toggle per project. Enable it, or record an explicit
  launch risk acceptance before public launch.

  Re-verified 2026-08-06: both projects still return exactly three findings, identical to each
  other, and the other two are intentional — `set_safety_pin` callable by `authenticated` (the
  account holder setting their own PIN is the point) and `user_safety_pins` with RLS and no
  policy (deny-all by design, nobody reads a PIN hash). So this toggle is the only advisor
  finding that represents real work.

  `set_safety_pin` was re-read from the live catalogue rather than trusted from memory: it
  derives the caller from `auth.uid()`, raises if that is null, rejects anything but 4–8
  digits, and upserts only the caller's own row. Revoking EXECUTE, which is what the advisor
  suggests, would break the feature and fix nothing. Both findings should be dismissed in the
  dashboard rather than re-investigated each time the advisor runs.

## Supabase

- Live Supabase Auth redirect allowlists still need API/dashboard configuration and
  verification for local web, staging, production, Expo dev client, `zoot://auth/callback`,
  Google OAuth, and Apple Sign in callbacks. Local `supabase/config.toml` contains the
  intended redirects, and `scripts/ops/set-supabase-auth-config.ps1` dry-runs passed on
  2026-07-01 for production project `mvlrkelahhsyjrwgsxaf` with `https://xoot.co.za`
  and staging project `fxmxyabdjqviqbcxmvlp` with `https://staging.xoot.co.za`. Live
  apply still requires a rotated local `SUPABASE_ACCESS_TOKEN`, target project ref, and
  explicit `-SiteUrl` so localhost is not applied to staging/production accidentally.
- **CLOSED 2026-08-07 — `src/integrations/supabase/types.ts` regenerated from production.**
  It was far more stale than the original entry suggested: **28 tables typed against 78 live**,
  so 50 tables had no types at all — including every table from the 2026-08-02 safety work
  (`safety_sos_alerts`, `visit_recordings`, `user_safety_pins`). 1,208 lines to 5,199.

  The enums were not merely incomplete but *wrong*, which is worse: `subscription_status` was
  missing `pending_payment` and `past_due`, and the booking status enum was missing
  `replacement_offered`. Code narrowing on those unions would have compiled while being unable
  to represent states the database can actually hold.

  Verified after regenerating: web typecheck, mobile typecheck, and the full `verify` chain all
  pass, so nothing depended on the stale shape. `booking_tips` and `support_handoff_contexts`
  are absent from the output, and that is correct — they are exactly the two migrations known
  to be unapplied, so the generated types agree with live reality rather than with the repo.

  **Nothing forces this to stay in step.** It drifted this far unnoticed because regeneration is
  manual and no check compares the two. Worth a CI step that regenerates and fails on a diff,
  before it silently rots again.
- **CLOSED 2026-08-07 — "My Xooters" was broken in production, found by the regenerated types.**
  Removing the `(supabase as any)` casts made TypeScript compare queries to the schema for the
  first time, and it immediately failed on `favorites`. `src/pages/app/Favorites.tsx` and
  `src/hooks/useHouseholdOperatingLayer.ts` selected `favorite_kind`, `repeat_bookings_count`
  and `last_booked_at`. **None of those three columns exist.** They come from
  `20260508225000_trust_safety_retention.sql`, which was never applied; the live table has
  `favorite_type` and `repeat_count`, and no equivalent of `last_booked_at` at all. Confirmed
  directly against production, not inferred from the types file.

  PostgREST rejects the whole select on the first unknown column, so of the four columns
  requested only `zooter_id` existed and every query failed. `/app/favorites` is a live routed
  page behind auth: it showed **"No favorites yet" to every user, including ones with saved
  Xooters**, and both "Preferred Team" and "Recurring Favourite" errored. The household
  operating layer set an error banner on every load and reported an empty circle.

  It stayed invisible because `load()` destructured `data` and dropped `error` — a failed query
  and an empty list render identically. The error is checked now.

  Fixed to the live column names. Safe to do: `favorites` holds 0 rows, `favorite_type` is free
  text with no check constraint, and `authenticated` already holds column-level UPDATE on
  `favorite_type` and `repeat_count`. `favorites_update_own` carries a WITH CHECK on `user_id`,
  so the UPDATE grant on `user_id`/`zooter_id` is not a cross-user write path and was left alone.

  Also fixed, same root cause: mobile's push-token upsert never set `last_seen_at`, whose
  default only applies on INSERT and whose table trigger touches `updated_at` only — so on
  every conflicting upsert the column recorded *first* seen. There is an index on
  `(user_id, last_seen_at desc)` for picking a user's most recent device, and the web path
  already set it.

  Guarded by `src/lib/supabase-schema-contract.test.ts`: every table reached via `.from()` in
  `src/` must be in the generated types, and a typed table may not be cast away with `as any`.
  Both assertions were verified to fail against the reintroduced bugs before being kept.
  44 of the 45 casts are gone; the one on `booking_tips` is legitimate and carries its reason.
  This narrows the blast radius — it still **cannot** tell whether the types match live.
- **CLOSED 2026-08-07 — Edge Functions swept for the same defect; they are clean.**
  The web app had no compile-time check on its queries, so the obvious question was whether the
  Deno functions — which have no generated types at all and run with the service role on the
  booking and payment paths — carried the same bug. Every `.from()` chain in
  `supabase/functions` was checked against the **live** production schema: 47 tables
  referenced, 46 exist, and all select columns, filter/order columns and insert/update/upsert
  payload keys match. `favorites` was the only instance of this class, not the tip of an
  iceberg.

  Two false-positive rounds preceded that result and are worth recording, because both would
  have been reported as bugs by a less sceptical pass: a fixed-size scan window attributed one
  statement's write columns to the previous statement's table (286 phantom findings), and a
  key-matching rule that read the middle branch of a ternary — `status: x >= 4 ? "escalated" :
  "open"` — as a column named `escalated` (11 more). The checker was only trusted after it was
  shown to catch a deliberately planted bad column.

  The 47th table, `support_handoff_contexts`, does not exist in production. It is **not** a
  live fault: `create-concierge-handoff` is undeployed in both projects, re-verified against
  live on 2026-08-07. It is a **deployment-ordering hazard** — that function inserts the
  `support_tickets` row and only then inserts the handoff context, throwing if it fails. Deploy
  it before applying `20260703153056_concierge_structured_handoff.sql` and every handoff
  commits a support ticket, then aborts before the follow-up and review-queue rows, orphaning a
  ticket nobody is routed. **Apply the migration first.**

  The guard now covers Edge Functions too, checking them against the generated types rather
  than live, since CI has no database credentials. That substitution was justified before it
  was relied on: the types matched live exactly, table for table, for all 46 tables involved.
- Supabase MCP is configured for read-only inspection. Supabase CLI `2.108.0` is installed,
  but separate CLI auth still requires a local `SUPABASE_ACCESS_TOKEN` or secure login flow
  before live Auth config can run. Rechecked 2026-08-02: no `SUPABASE_ACCESS_TOKEN`,
  `ZOOT_PRODUCTION_SUPABASE_DB_URL`, `ZOOT_STAGING_SUPABASE_DB_URL`, or `SUPABASE_DB_URL`
  is available in the working shell. Migration repair can instead use the guarded
  `-PromptDatabasePassword` mode after the matching rotated database password is entered
  locally.
- **CLOSED 2026-08-07 — `BookingConfirm` no longer claims to book anything.** Its button read
  "Confirm booking" and called `navigate("/app")`, so anyone completing the onboarding flow
  believed they had booked and had not.

  Investigated before fixing, and the finding changed the fix: **the screen cannot create a
  booking and never could.** The onboarding draft holds `suburb`, `cadence` and home size;
  `create-booking` requires a `date`, a `time` and a full `address` it validates against launch
  coverage. None of the three exist at that point in the flow. So this was never a missing
  wire-up — it is an estimate screen whose label promised something the data cannot support.

  Navigating on is the correct behaviour, because `Book.tsx` is where the date, time and
  address are collected. Only the claims changed: the button now reads "Pick a date and time",
  the page title is "Your estimate", and a line under the total says nothing is booked until a
  date and time are chosen. Behaviour untouched.

- **Client and server pricing can still diverge on any dimension the parity test does not
  model.** `pricing-parity.test.ts` compares ladder rungs by reading the server file as text,
  which is good, but it only knows about rungs. On 2026-08-07 the client shipped a multi-Xooter
  model that contradicted `create-booking` outright — split the hours rather than multiply the
  price — and parity passed the whole time because multi-Xooter is not a rung.
  `multi-xooter.test.ts` now reads the threshold, rate, cap and service set out of the server
  the same way, so that dimension is covered.

  Correcting an overstatement in the first version of this entry: add-ons, Booking Cover and
  the linen option **are** asserted by the parity test. What is genuinely uncovered is the
  high-demand premium and the Care+ discount rate.

  And one real divergence found while checking: **`create-booking` charges
  `ONE_TIME_SERVICE_FEE_CENTS` (R39) on one-time bookings and `quote()` does not model it at
  all**, so the client under-quotes a one-time booking by R39. The module header does warn the
  server wins on money, but a total shown to a customer and then exceeded at charge time is a
  different matter from an internal disagreement — and one-time is the likely default for a
  first booking. Deliberately not "fixed" by adding R39 to the displayed price: that raises
  every quoted one-time total and is a commercial call. `pricing-parity.test.ts` now asserts
  the divergence so it is visible rather than surprising.
- **Schema source of truth is undecided (ZD-005).** Production and staging migration
  histories still diverge: re-listed 2026-08-02, production starts from the 2026-05-19
  launch squash (33 recorded migrations) while staging follows the local chain from
  2026-04-21 (49 recorded migrations). Runtime app-schema drift for
  `booking_zooter_profiles`, saved-address fields, Care+ application fields, Zooter
  application fields, booking event metadata, and the Zooter application `user_id`
  uniqueness constraint was fixed and verified on 2026-07-01 through
  `live_schema_convergence_app_runtime`; see
  `docs/implementation/live-schema-convergence-20260701.md`. Four local migrations are
  written and unapplied behind this decision — the two Concierge migrations below and the
  two from 2026-07-30 above. Future deploys must use the controlled migration scripts
  rather than assuming a clean `supabase db push`.
- The production `main` branch still reports `MIGRATIONS_FAILED` through Supabase branch
  metadata; re-confirmed 2026-08-02. Read-only migration inspection on 2026-07-09 confirmed
  that both projects contain the equivalent booking action, Concierge, payment/payout, and
  Twilio migrations under Supabase-generated timestamps. The guarded repair allowlist is
  therefore still valid for local versions `20260629113000`, `20260629200351`,
  `20260630005420`, and `20260630102715`, while known split migrations remain blocked. Both
  environment planners passed again on 2026-07-09. A repo-level drift manifest and
  non-destructive checker exist at `supabase/migration-drift-allowlist.json` and
  `scripts/ops/check-supabase-metadata-drift.ps1`; run
  `npm run ops:supabase:drift-check -- -Environment production` and
  `npm run ops:supabase:drift-check -- -Environment staging` before any future repair. Live
  dry-run and repair remain blocked only by the absence of locally loaded rotated database
  access. Do not repair-mark split storage-owner migrations.
- A working PostgreSQL client is available at the local Scoop extraction path used by the
  provider-auth diagnostic. Docker is still unavailable on the founder's Windows host, so a
  full local Supabase database reset still requires Docker or a separate ops shell.
- Supabase performance advisors still report workload-dependent unused-index candidates in
  staging and production. Direct catalog checks show no missing public FK-covering indexes,
  no targeted legacy policy residues, no missing expected advisor-cleanup policies, no raw
  `auth.uid()` predicates in public policies, no duplicate-permissive groups for the
  targeted tables, and no duplicate public index groups.
- Phase 2 booking chat blocker is role-based smoke testing with real staging/production
  booking participants: direct `messages` inserts revoked, participant sends through the
  Edge Function, read receipts written, and reports queued for admin review. The functions
  themselves are deployed and active in both environments with JWT verification enabled.
- Phase 4 completed-booking invoicing: `generate-booking-invoice` and
  `resend-booking-invoice` exist in the repo and are **not deployed to either project**
  (verified 2026-08-02). The private PDF read policy on `storage.objects` also still
  requires Supabase CLI/dashboard access with the correct storage policy owner role.
- Completed-booking invoice generation requires final reviewed legal/VAT values in Supabase
  Edge Function secrets: `ZOOT_INVOICE_LEGAL_ENTITY`,
  `ZOOT_INVOICE_LEGAL_ENTITY_REGISTRATION`, `ZOOT_INVOICE_VAT_RATE`, and
  `ZOOT_INVOICE_VAT_NUMBER` when VAT applies. The same VAT answer decides how tips are
  treated on an invoice — see the tipping item below.
- Concierge governance (`20260703150828_concierge_governance_controls.sql`) and structured
  human handoff (`20260703153056_concierge_structured_handoff.sql`) are implemented locally
  and **verified unapplied in both projects on 2026-08-02**. `report-concierge-answer` and
  `create-concierge-handoff` are also undeployed in both. `support-respond` is deployed and
  active, but at a version that predates the governance work, so the grounded metadata,
  client-redacted reporting, and safer Care+ fallback wording are not live. Handoff controls
  additionally need support-owner approval, enablement in staging only, and smoke tests
  proving redaction, booking ownership checks, urgent routing, and no external provider
  messages.
- Concierge production readiness still requires approval of draft commercial/high-risk
  knowledge files, especially `docs/agents/source-of-truth/care-plus-policy.md`,
  `care-plus-guide.md`, `booking-cover-guide.md`, and `zoot-black-guide.md`. Until those are
  approved, Concierge must route rather than promise pricing, benefits, Booking Cover
  outcomes, or Zoot Black availability.
- Concierge safe account-support tools remain intentionally disabled. Before enabling
  `concierge.authenticated_account_support`, `concierge.booking_status`,
  `concierge.support_case_creation`, `concierge.human_handoff`, or
  `concierge.model_answers`, Xoot still needs RLS/role smoke tests, support owner approval,
  human handoff testing, PostHog/Sentry privacy verification, and staging evidence that the
  bot cannot perform booking, payment, refund, Care+, ZootCred, Booking Cover, payout,
  admin, or sensitive-access actions.
- Anonymous Concierge Turnstile enforcement must stay disabled until a production domain and
  restricted Cloudflare Turnstile widget exist. When available, set
  `support.turnstile_required` or `ZOOT_REQUIRE_CONCIERGE_TURNSTILE=true` only after the
  rotated Turnstile secret is stored in Supabase Edge Function secrets.
- Zoot Black remaining database blocker is the private certificate PDF read policy on
  `storage.objects`, which requires Supabase CLI/dashboard access with the correct storage
  policy owner role.
- Zoot Black activation remains blocked by founder, operations, supplier, and legal
  approvals. Do not enable `zoot_black.enabled`, `zoot_black.area_pilot`, or
  `zoot_black.certificates`, expose a customer purchase path, or publish availability claims
  until approvals, pilot areas, equipment evidence rules, line-item amount, certificate
  wording, and smoke tests are complete.
- Phase 7 live payment/payout activation remains blocked by Stitch/Ozow production
  credentials, provider callback configuration, signed webhook smoke tests, finance
  approval, legal approval, payout account verification workflow, payout hold policy, and
  production reconciliation runbook. Do not enable `payments.provider_checkout`,
  `payments.hosted_checkout.stitch`, `payments.hosted_checkout.ozow`, or `payouts.enabled`
  until all approvals and tests are complete.
- Phase 9 Twilio live function deployment/smoke execution still requires Supabase
  CLI/session access or dashboard function deployment for `create-masked-call` and the
  relevant `ops-workflow` paths.
- Phase 10 Siri/App Intents and Android assistant shortcut foundation is implemented locally
  through `mobile/plugins/withXootAssistantIntents.cjs`. EAS development builds and physical
  iOS/Android assistant tests are still required before native release use.

## Tipping

- `supabase/migrations/20260730090000_booking_tips.sql` is written and **unapplied in both
  projects** (verified 2026-08-02). It creates `public.booking_tips` with `settled_at` as
  the visibility gate, five policies, the `enforce_tip_settlement_author()` trigger, and
  adds `'tip'` to `payment_records_payment_kind_check`. Tips live on their own table
  because RLS cannot hide a column (ZD-023).
- **No tip payout path exists.** ZD-023 records the founder decision that Xoot takes no cut
  of tips and that a Xooter cannot see a tip before rating the customer, but the money still
  has to reach the Xooter. That depends on the payment provider decision below, and on
  whether a tip is a payment to Xoot that is passed on, or a payment collected on the
  Xooter's behalf. Those two have different VAT and disclosure consequences.
- Tipping is claim-gated in code and cannot render a promise the system cannot honour:
  `TIP_READINESS` in `src/lib/tipping.ts` is `"schema_pending"`, `canOfferTip()` returns
  false, and `tip-policy.test.ts` fails the build if the UI offers a tip while it is unset.
  Advance it to `"capture_only"` only after the migration is applied, and to `"settled"`
  only after payout works end to end.

## Design and mobile app

- **The design source of truth changed on 2026-08-02** to `design/Xoot_App.html` — the
  Claude Design UI kit, 197 components across 35 screens, unpacked per `design/README.md`.
  Adopting it changes three things at once, and **the founder needs to say yes or no to all
  three** because together they supersede the recorded red/white direction:
  1. **Brand colour becomes violet** (`--xoot-violet-500` `#7C5CFC`) for emphasis,
     selection and progress, with **ink** `#151515` as the primary commit button.
  2. **Red is scoped, not dropped.** The kit reserves its red family for Care+ alone —
     "Xoot's UI is violet; Care+ is red, always. Use only for subscription surfaces: badge,
     paywall, the '+' mark, plan savings." `--xoot-careplus-500` `#E63329` is within a hair
     of the shipped `#e42a21`, so the company red becomes the membership colour rather than
     the colour of every button. `--zoey-fill` stays separate, so the mascot is unaffected
     either way.
  3. **Default scheme flips to light.** The kit is light-default with a
     `[data-theme="dark"]` opt-in; the native app is pinned dark. Changing it touches
     `app.config.ts`, the splash background, and the generated launch screen together —
     `ios-build-setup.test.ts` fails if one moves without the others.

  Colour is the only part of the port blocked by this. It is one file to change either way
  (`src/index.css`), because `design-tokens.test.ts` forces every other copy to follow.
- The deferred design queue in `docs/xoot-master-brief.md` §3.7 is still open by founder
  instruction ("deal with this at a later stage"): Zoey approaching and filling the screen
  red on first onboarding; a distinct company-red splash with "Xoot" written in cursive as
  handwriting; de-glossing the mascot; keeping the mascot in a dedicated company red via the
  existing `--zoey-fill` token; and an overall UI direction the founder said they would
  decide and communicate. The cursive splash no longer needs a typeface sourced — the kit
  embeds **Caveat Regular** as `--xoot-font-script` — only the letterforms converted to a
  stroke path so they can be drawn on.
- The display typeface needs a founder confirmation. The brief records **Georgia** on the
  founder's instruction; Georgia is a system font that cannot be licensed into an app
  bundle. The kit ships **Newsreader** as `--xoot-font-display` with Georgia as the CSS
  fallback only, which is the same register and is embeddable. Confirm Newsreader is an
  acceptable stand-in before the port hardcodes it.
- The Android preview APK (`114d0c10-c754-4426-9a90-9fdfeadb8a06`, versionCode 5) and the
  iOS simulator archive (`d4de44a1-d827-4045-b1a6-e427066fcd64`) were both built on
  2026-07-01 and **predate every change to `mobile/` since**: the native splash animation,
  the design-token rewrite, the Apple Sign-In module, and the two iOS build fixes. They no
  longer verify the current app. Rebuild before any device testing and do not cite the old
  artifacts as evidence.
- Device testing is still outstanding on both platforms. A real Android-device install and
  smoke test needs only an authorised handset with USB debugging enabled — `adb` is installed
  and the artifact check passes. A physical iOS install is blocked further back: EAS has no
  internal-distribution iOS credentials suitable for non-interactive preview builds. Either
  way, device verification is still required for normal launch, reduced-motion static launch,
  urgent route bypass, and safe Siri/Gemini deep links.
- No Mac is available in any current working environment, so nothing here can run an iOS
  simulator. `expo prebuild --platform ios` and `expo export --platform ios` verify
  configuration and bundling only — they do not verify that the app looks or performs
  correctly on device. Frame rate during app start and Dynamic Type at the largest settings
  will first be observable on real hardware.

## Provider secrets and external dashboards

- Real production secrets for Stitch, Ozow, Twilio, Brevo, KIE, OpenAI, Airtable, Hostinger,
  Cloudflare, Sentry, Expo/EAS, Apple, Google, Mapbox, and WordPress still need to be set in
  their correct secret stores.
- Private secrets must not be committed or placed in frontend/mobile env files. Store them
  only in Supabase Edge Function secrets, EAS secrets, GitHub/environment secrets, provider
  dashboards, or the approved password manager.
- Secrets pasted into chat, including Supabase, Cloudflare, Expo, PostHog private API,
  Mapbox token values, and CodeRabbit API values, must be rotated before production launch or
  long-lived production use. A Supabase CLI access token was also pasted into chat on
  2026-06-30 and must be rotated before it is used for production operations. The Twilio
  secret values previously pasted in chat were reported rotated on 2026-06-28; keep using
  only rotated values in approved secret stores.
- Provider secret verification and signed smoke tests still require an authenticated Supabase
  CLI/session, dashboard secret setter, or real provider dashboard access.
- Brevo invoice templates and delivery worker wiring still need live provider setup for
  outbox events `booking_invoice_created` and `booking_invoice_resend`.

## Domain registration

- **The production domain is `xoot.co.za`**, confirmed by the founder on 2026-08-06. The repo
  previously carried `zoothome.co.za` as a placeholder in 39 files; all were rewritten the same
  day.

  No production domain is registered *and configured* as far as this repo can verify — the
  founder confirmed the name, not the registrar state, and nothing here can check DNS. So the
  domain-dependent setup in the next bullet is all still open. This entry now blocks on
  *configuration*, not on a decision. Confirm registrar and DNS control before treating any of
  it as done.

- Still pending, now that the name is settled: Cloudflare zone/DNS/TLS/WAF/Turnstile
  restrictions, production Supabase Auth redirect allowlists, Google/Apple OAuth origins and
  callbacks, Brevo sender-domain DNS, Hostinger custom-domain SSL, WordPress
  production/canonical URLs, Mapbox URL-restricted browser tokens, Apple AASA, Android
  assetlinks, privacy/support/account-deletion URLs, and store listing URLs.

- **The deep-link scheme is still `zoot://`, not `xoot://`.** Left unchanged deliberately on
  2026-08-06 rather than swept up with the domain. A URL scheme is not a string like a domain
  is: changing it breaks every already-installed build, and it has to be changed in lockstep
  with the Google and Apple OAuth redirect configurations, the Supabase Auth allowlist, and
  `mobile/app.config.ts`. Decide it as its own change, before the first store submission —
  after that it is effectively permanent. `scripts/ops/check-blocker-ledger.ps1` pins the
  literal `zoot://auth/callback`, so that pattern has to move at the same time.

- **Every deployed Edge Function still has the old origin allow-list baked in.**
  `defaultAllowedOrigins` in `_shared/action-utils.ts` is compiled into each function at deploy
  time, and every function currently live in production was deployed before the domain change —
  including `twilio-token`, `twilio-conversation` and the two `sensitive-access-*` functions
  deployed on 2026-08-06. Until this is dealt with, a browser on `https://xoot.co.za` will be
  refused by CORS on every Edge Function.

  Two ways to fix it, and the first is better: set `ALLOWED_ORIGINS` in Edge Function secrets
  to `https://xoot.co.za,https://www.xoot.co.za` — `getAllowedOrigins()` reads that first and
  only falls back to the compiled default. That fixes every function at once, with no deploy,
  and means the next domain change is a secret edit rather than a redeploy of everything.
  Otherwise, redeploy all functions after this branch merges. Do it in the same sitting as
  `ENCRYPTION_KEY`; it is the same secrets screen.

- Use localhost, staging project URLs, and Expo development URLs for preview only. Do not
  mark production launch ready until `xoot.co.za` is registered, configured, and verified.

## Legal and POPIA

- **No legal entity is named and no POPIA Information Officer is registered.** This blocks a
  truthful privacy policy, truthful App Store privacy nutrition labels, invoice legal
  entity fields, and store submission. It is not a documentation task — the Information
  Officer must be a registered person at the Information Regulator.
- A POPIA section 72 assessment is required for any personal information leaving South
  Africa. Supabase project regions, Sentry, PostHog, Brevo, Twilio, and Mapbox all need to
  be checked against it and the answer written into the privacy policy.
- Consent recording is not implemented. ZD-021 accepts terms implicitly at sign-up behind a
  visible linked notice, which requires storing which version of the terms was accepted and
  when, per user. Without it there is no defensible record of consent.
- Breach notification obligations under POPIA have no generous risk exemption. A documented
  detection, assessment, and notification runbook is required before launch, not after a
  breach.

## Twilio

- Phase 9 local controls exist for `twilio.verify_otp`, `twilio.masked_voice`, and
  `twilio.whatsapp_urgent`, with Verify attempt redaction, masked-call eligibility, direct
  client write revocation for `masked_call_sessions`, and no-recording/no-transcription
  metadata. These controls remain disabled until provider setup and signed staging smoke
  tests pass.
- The Twilio account still needs production readiness work: trial status removal, approved or
  ported phone number, WhatsApp sender approval, Messaging Service classification corrected
  to transactional/operational use, sender verification, webhook assignments, regulatory
  registrations, and approved message templates (ZD-009).
- Twilio SMS, WhatsApp, voice, phone, Verify OTP, and email-adjacent flows must remain
  disabled through `twilio.operational_messages` until dashboard channel setup, rotated
  secret verification, and signed webhook smoke tests are complete.
- The Twilio tooling exposed in the current session is documentation search only, not account
  management, so dashboard configuration still cannot be completed from the repo alone.

## Mapbox

- Restricted Mapbox tokens are not configured.
- A Mapbox secret token was supplied in chat. It must not be used as a public `VITE_` or
  `EXPO_PUBLIC_` token, and it must be rotated before production use because chat exposure
  makes it unsuitable as a long-lived production secret.
- Required tokens remain:
  - browser token restricted to approved Xoot HTTPS origins;
  - native Expo token for iOS and Android builds;
  - secret downloads token stored only in EAS or CI for native SDK build access;
  - optional server-side `MAPBOX_SECRET_TOKEN` stored only in Supabase Edge Function secrets
    or CI/server secret storage if backend geocoding/routing is implemented.

## Cloudflare

- The connected Cloudflare account still has no `xoot.co.za` zone. On 2026-06-29, listing
  zones returned zero matches and the create-zone attempt failed because the connected token
  lacks `com.cloudflare.api.account.zone.create`.
- WAF, bot/rate-limit rules, Turnstile, DNS, TLS, and origin protection cannot be activated
  until the zone exists and the connected token has the required scoped permissions.
- Cloudflare Turnstile widgets are not verified. Create restricted web/mobile widgets in the
  dashboard or with a rotated token that has the required Turnstile permissions.

## Apple, Google, Expo, and stores

- Apple Team ID, App Store Connect app record, Google Play app record, Android signing
  fingerprints, store privacy declarations, and final legal/business metadata remain
  unavailable. `npm run verify` confirms the effect on every run: "Skipped
  apple-app-site-association: set ZOOT_APPLE_TEAM_ID or ZOOT_IOS_APP_ID" and "Skipped
  assetlinks.json: set ZOOT_ANDROID_SHA256_CERT_FINGERPRINTS".
- EAS Android internal preview credentials exist on Expo's remote credential store. EAS iOS
  internal-distribution credentials are still missing for non-interactive preview builds.
  Private `SENTRY_ORG` and `SENTRY_AUTH_TOKEN` are required only for native source-map
  upload, not for installing preview builds. Final iOS credentials, Play/App Store submit
  credentials, store records, and privacy/legal metadata still need provider-backed setup.
- Latest pasted Expo public Supabase values mix a staging project reference with a production
  Supabase URL. Keep the currently configured production GitHub variables as-is, and define
  separate EAS/GitHub environment profiles before adding staging mobile values.
- Store submission cannot proceed until developer-console access, signing credentials,
  privacy/data-safety answers, account deletion URLs, support URLs, and legal review are
  complete.

## Admin Access

- There are no shared admin sign-in credentials in the repo, app, or env templates. Admin
  access is granted by a Supabase Auth account plus an `admin` role in `public.user_roles`.
- Staging admin smoke credentials must be supplied only through local env vars before running
  `npm run ops:smoke:staging -- --all`; see `docs/ADMIN_ACCESS.md`.
- Production founder/admin accounts still need secure creation, MFA enrollment, and audited
  role assignment before production operations.

## WordPress SEO stack

- WordPress has been added as a target SEO/content stack, but the production WordPress host,
  domain/subdomain, security hardening, editorial roles, backup policy, API access model, and
  publish/sync workflow are not provisioned yet.
- WordPress must not become a path for unaudited plugins, fake testimonials, weak content, or
  leaked credentials. Any headless integration must use read-only public APIs for published
  content and server-side secrets for protected actions.

## Netlify, Hostinger, and hosting

- Netlify project `zoot-home-care` exists, but dashboard/build readback is still required
  before treating Netlify environment configuration as production-verified.
- Hostinger production deployment credentials and final domain wiring still need
  dashboard verification.

## Verification still needed

- Level 3 company-wide user-data hardening is defined in
  `docs/security/level-3-company-wide-security-hardening.md`, but it cannot be marked passed
  until live Supabase, provider, domain, mobile-device, load, monitoring, privacy,
  incident-recovery, and approval evidence is attached or explicitly risk-accepted.
- Configure Supabase Auth redirects in both environments and verify web, mobile, and OAuth
  callbacks.
- Run signed Twilio webhook smoke tests after Twilio dashboard channels and Edge secrets are
  verified with the rotated values.
- Smoke-test the Phase 2 booking chat action layer in staging/production with real booking
  participants.
- Deploy the Phase 4 invoice storage-object policy and both invoice Edge Functions with
  storage-owner/CLI credentials, then smoke-test: a completed paid booking generates exactly
  one immutable invoice, uploads a private PDF, queues Brevo delivery, owner/admin can read
  it, and resend queues the original PDF path without regenerating.
- Smoke-test the Phase 9 Twilio layer after Edge Functions and Twilio account resources
  exist: Verify rate-limit/redaction tests, unsigned webhook denial, signed webhook
  acceptance, masked-call denial outside the window, non-participant denial, terminal-booking
  denial, no-recording/no-transcription metadata, and provider-gated queue creation.
- Run Phase 10 assistant-device tests after EAS development builds exist: Siri and Android
  assistant shortcuts open booking, Concierge, Care+, booking status, and Xooter jobs; unsafe
  params are ignored; no booking or payment is completed from speech or deep-link input
  alone.
- Run authenticated booking-chat public-key lookup smoke tests against
  `get-booking-public-keys` with real staging client/Xooter booking participants.
- k6 `2.1.0` is installed locally. The staging-only 10,000-request harness exists at
  `scripts/load/zoot-staging-10k-readiness.js` and is wired to `npm run load:test:10k:staging`;
  fail-closed behaviour was verified on 2026-07-03 when the command refused to run without
  `BASE_URL`. Run it against a confirmed staging/preview target with `LOAD_TEST_ENV=staging`,
  `BASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and
  `LOAD_TEST_SUMMARY_PATH=outputs/k6-staging-10k-summary.json` before claiming 10,000-request
  readiness.
- Run `npm run ops:provider-auth:setup`, `npm run ops:supabase:auth-config`,
  `npm run ops:github-vars`, `npm run ops:supabase:repair-migrations`,
  `npm run ops:supabase:deploy:staging`, `npm run ops:supabase:deploy:production`,
  `npm run ops:supabase:secrets:staging`, and `npm run ops:supabase:secrets:production` from
  a local shell that has approved provider credentials.
- Run `scripts/ops/verify-production-readiness.ps1 -IncludeExternal -RequireLive` after
  provider access is configured. It must pass before the production-readiness blockers can be
  closed.
- Confirm Cloudflare WAF/rate-limit/Turnstile rules after the zone is added.

## Safety features — SOS and recording

- Schema, the cancel PIN, and `raise-sos-alert` exist and are applied to both projects.
  `SAFETY_READINESS` in `src/lib/safety.ts` is `schema_pending`, so nothing is offered to a
  user yet. Remaining before it can advance:
  - `raise-sos-alert` is deployed to **production only**. Deploy to staging before testing.
  - No client UI: the countdown, haptics, microphone permission, the recording indicator,
    and the PIN-set flow are all unbuilt.
  - `private.purge_expired_recordings()` has no scheduler attached, so unattached recordings
    will not actually be deleted at 30 days until a cron calls it.
  - No encrypted-upload path or storage bucket for recordings.
  - Advance to `server_ready` only when the functions are deployed, and to `live` only when
    dialling 112 and the ops alert have both been tested end to end on a real handset.
- Ops has no paging route. `raise-sos-alert` writes the alert and notifies the raiser; nobody
  at Xoot is woken. Decide the channel before the feature goes live, or an alert lands in a
  table nobody is watching.

## Closed at review — 2026-08-02

Removed from the ledger above because they are no longer unresolved. Listed once here, then
dropped at the next review.

- **Supabase function search-path and public SECURITY DEFINER RPC advisor warnings.** Closed
  by `security_advisor_rpc_hardening`, which is recorded in both projects. Live security
  advisors on 2026-08-02 return exactly one finding per project — leaked password protection
  — so nothing else in that category is open.
- **Phase 2 booking chat migration and Edge Functions.** `send-booking-message`,
  `report-booking-message`, and `mark-booking-message-read` are deployed and ACTIVE in both
  projects with JWT verification enabled. Only the role-based smoke test remains, and it is
  kept above.
- **Phase 4, 5, 6, 7, 9, 10 migration application.** All are recorded in both projects under
  Supabase-generated timestamps. What remains is function deployment, storage policies, and
  approvals, all of which are kept above as their own items rather than as "migration"
  items.
- **`support-respond` deployment.** Deployed and ACTIVE in both projects. The governance
  version is not live, which is kept above as a distinct item rather than implying the
  function is missing entirely.
- **The live Edge Function inventory check.** Superseded by the diff at the top of this file,
  which is more specific: it names which functions are missing source and which sources are
  undeployed.
- **`mobile/plugins/withZootAssistantIntents.cjs`.** Renamed to `withXootAssistantIntents.cjs`
  in the company-wide rename; the path in the old entry no longer existed.
- **Android Platform Tools availability and the preview-artifact smoke check.** `adb` is
  installed and the artifact check passed on 2026-07-09. That is no longer what blocks
  Android device testing — the blocker is that the artifact itself is stale, which is kept
  above under "Design and mobile app".
