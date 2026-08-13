# Three walkthroughs: the call, SOS, and device verification

Written for a browser and a phone. Each one says what to do, what success looks like, and what each
failure means — because "it didn't work" is not debuggable and every one of these has a failure mode
that looks like nothing happening.

- [A. The two-party call](#a-the-two-party-call) — 15 minutes, two devices
- [B. Taking SOS live (#36)](#b-taking-sos-live-36) — do not just flip the constant
- [C. Device verification (#37)](#c-device-verification-37) — a real phone, once per surface

---

## A. The two-party call

**This is the only gate that proves sound comes out.** Everything else about voice proves
configuration. Until this has happened once, voice calling is code that has never run.

**You need two devices** — a laptop and a phone is ideal. Two browsers on one laptop also works
(Chrome and Firefox). **A private/incognito window does not**, and this is the single most common
way this test fails: it shares the session store with its parent, so signing in as the second
account signs the first one out and you end up calling yourself.

### Step 1 — arm the booking

GitHub → **Actions** → **Arm the two-party call test** → **Run workflow** → green button. Nothing to
fill in. It takes about 50 seconds.

**Why this step exists at all**, because it is invisible and it has defeated every previous attempt:
the call button only renders when

```
status ∈ {en_route, in_progress}  AND  now is inside the booking's time window
```

and the window runs from `scheduled_at − 45 minutes` to `scheduled_at + duration + 30 minutes`
(`src/lib/operations.ts:275`). Staging's smoke booking was dated 28 June, so the button simply was
not there, and nothing on screen said why. The workflow moves the booking to *now*.

### Step 2 — read the run summary

Open the run. The summary gives you four green checks and then:

```
customer  phase1-smoke-client@staging.zoothome.local
Xooter    phase1-smoke-zooter@staging.zoothome.local

https://staging.xoot.co.za/app/bookings/10000000-0000-4000-8000-000000000401

Armed until <timestamp> (about 255 minutes).
```

Those four checks come from re-reading the booking after writing it, so green means the booking is
genuinely callable — not merely that the workflow ran.

⚠️ **Note the "armed until" time.** The window is about four and a half hours. If the call button has
vanished when you come back, re-run step 1 rather than concluding the feature is broken — that is by
far the most likely reason, and it is silent.

**Passwords:** if you do not have them, run the workflow again with **`set_passwords` ticked**. That
needs a repository secret `XOOT_CALL_TEST_PASSWORD` first — Settings → Secrets and variables →
Actions → New repository secret, at least 12 characters, something you can type on a phone.

### Step 3 — sign in on both devices

> ### ⚠️ "This reset link has expired or cannot be used" — diagnosed 2026-08-13
>
> If you tried **Forgot password** on these accounts, that message is not a bug and retrying will
> never fix it. Read from `auth.users` on staging:
>
> | account | confirmed | has password | last sign-in |
> |---|---|---|---|
> | `phase1-smoke-client@…` | ✅ | ✅ | **never** |
> | `phase1-smoke-zooter@…` | ✅ | ✅ | **never** |
>
> Both accounts are ready and **already have passwords** — set by a seed script, so nobody knows
> what they are. The reset flow cannot help, because the addresses end in **`.local`**, which is
> reserved by RFC 6762 and **cannot receive mail from the internet**. The email is never delivered,
> so any link is stale by definition. That is deliberate: these accounts exist only for this test
> and must not be able to receive real mail.
>
> **The fix is to set the password directly, with no email involved:**
>
> 1. GitHub → Settings → Secrets and variables → Actions → **New repository secret**
> 2. Name `XOOT_CALL_TEST_PASSWORD`, value: anything **12+ characters you can type on a phone**
> 3. Actions → *Arm the two-party call test* → Run workflow → tick **`set_passwords`**
>
> It sets both accounts to that password through the Supabase admin API. Then sign in with
> email + password — **not** a magic link, **not** Forgot password.



- **Device 1 (the customer):** open the booking URL, sign in as `phase1-smoke-client@…`
- **Device 2 (the Xooter):** same URL, sign in as `phase1-smoke-zooter@…`

Both accounts are `.local` addresses that cannot receive mail and exist only for this.

### Step 4 — allow the microphone

The prompt appears on the **first call attempt**, not on page load. Allow it on both.

If it was ever denied for this site the browser will not ask again: click the padlock in the address
bar → **Site settings → Microphone → Allow**, then reload.

### Step 5 — press call

On **one** device only. The other should ring within a second or two.

**What success looks like:**
- the caller's panel goes `connecting → ringing → connected`
- the callee's panel offers accept / decline
- after accepting, **you hear each other**
- Twilio Console → Monitor → Logs → **Calls** shows **two** call legs joining one conference — two,
  because `<Dial><Conference>` dials each party into a room rather than one party to the other

### When it does not work

| symptom | cause |
|---|---|
| **No call button at all** | **Check the window first.** Re-run step 1. Then: is the status `en_route`? Is the signed-in account actually on this booking? |
| "Calling is not configured" | `twilio-token` returned `configured: false` — a secret is missing. Actions → *Twilio self-test* → `staging` names which. |
| Rings, then drops immediately | The TwiML App's Voice URL is empty, unroutable, or set to GET. Gate 0 catches all three; staging is green as of 09:44Z 2026-08-13. |
| Connects, silence one way | Microphone denied on the silent side, or the OS input device is muted. Step 4. |
| Connects, silence both ways | Media blocked — a corporate network or VPN dropping UDP. Retry on a mobile hotspot. |
| You end up talking to yourself | A private window. Use two different browsers or two devices. |
| One leg in the conference, not two | The callee never accepted, or their token was minted for a different booking. |

**Tell me the symptom and I can usually name the cause from the table.** Paste the Twilio Console
call log if there is one.

---

## B. Taking SOS live (#36)

⚠️ **SOS ships dark on purpose. Do not just flip the constant.** It is the one feature where a
half-configured state is worse than no feature: a person in trouble presses a button that does
nothing, having been told it would summon help. Off is honest. Half-on is not.

Work through these in order. **Do not enable until all four are true.**

### 1. Decide what SOS actually does when pressed

This is a business decision, not a setting, and everything else depends on it:

- **Notify Xoot only** — an alert reaches an operations person who calls the user. Needs someone
  reachable during operating hours. Simplest, and honest, provided the copy says exactly that.
- **Notify a nominated contact** — the user names someone at sign-up. Needs that field, and consent.
- **Contact emergency services** — **do not do this yet.** In South Africa it requires a relationship
  with a response provider and creates a duty of care you cannot discharge with a web app. If you
  want it, it is a contract with a private security firm, not a code change.

**Recommendation: notify Xoot only**, with copy that says so in the button's own words —
*"Alerts the Xoot safety team"*, never *"Emergency"*.

### 2. Make the notification path real

Whatever you picked, prove the message arrives:

- Who receives it? A phone number, a WhatsApp group, an email inbox — name it.
- **Send a test alert to it and confirm someone got it.** If nobody is watching at 22:00 on a Sunday,
  the copy must not imply otherwise.
- Write down the expected response time. It belongs in the user-facing copy.

### 3. Get the wording legally safe

The button's label and the confirmation screen are a **promise**. Under the Consumer Protection Act
a service described in a particular way must be delivered that way.

- Say what happens: *"This alerts the Xoot safety team, who will call you."*
- Say what it is not: *"This does not contact emergency services. In an emergency call 10111."*
- The 10111 line is the most important sentence on the screen. Do not bury it.

### 4. Test it on a real device, from a real booking

An SOS press from a desktop with no GPS is not a test. Use a phone, on an active booking, outdoors
where location resolves — then confirm the alert arrived **with the location in it**.

### 5. Then, and only then, enable it

The control is in Supabase, not in code. Tell me when steps 1–4 are done and I will name the exact
control key and wire the copy. **I am not enabling it before then**, and the constant stays as it is.

> Why this is not a five-minute task: every one of the four steps above has a failure mode where the
> button appears to work. That is the specific danger, and it is why this issue has stayed open.

---

## C. Device verification (#37)

**What it is:** the app has iOS and Android surfaces that no simulator can honestly test — Live
Activities, home-screen widgets, Siri intents, push notifications and deep links. Each needs to be
opened once on real hardware.

**What you need:** an iPhone, an Android phone if you have one, and about an hour. Do them in this
order; each builds on the last.

### 1. Get a build onto the phone

You cannot test any of this from the browser. Either:
- **iOS:** an EAS internal-distribution build (needs Apple credentials — this is the blocker on that
  side), or
- **Android:** the APK, installed directly. Simpler, and worth doing first for that reason.

Tell me which you have and I will produce the build command.

### 2. Cold launch

Force-quit, then open. You are checking: does it open to the right screen, is the splash correct, is
the wordmark **Xoot** everywhere (this repo has shipped `zoot` lowercase in one place before, which
is why there is now a guard test for it).

### 3. Sign in, and check the deep link

⚠️ **The `zoot://` scheme is still live in `mobile/app.config.ts`** — that is issue #34, and it must
change before the first store submission or never, because the scheme is baked into the app record.
Test it as it is, and note whether anything user-visible shows the old scheme.

Sign in, then background the app and reopen it. The session should survive.

### 4. Push notifications

Accept the permission prompt. Then have a booking event fire — the easiest is to arm the call test
(walkthrough A) and watch for the notification. **Background the app first**: a notification that
only appears in the foreground is not working.

### 5. Live Activities and widgets (iOS)

- Start a booking and check the Dynamic Island / lock-screen activity appears and **updates** as the
  status changes.
- Long-press the home screen → add the Xoot widget → confirm it shows real data, not a placeholder.

### 6. Siri intents (iOS)

Try the phrases the app registers. If nothing is registered yet, say so — that is a finding, not a
failure.

### 7. Report back

For each of the six: **worked / did not / not present.** "Not present" is the most useful answer,
because it means the feature was never wired and no amount of retrying will help. I will turn the
list into fixes.

---

## What I could not do for you, and why

**The call, SOS and device verification all need a human with a device.** No session can press a
button, hear audio, or hold a phone. Everything around them is automated — arming, configuration
checks, the deploy — so that the part that needs you is only the part that genuinely does.
