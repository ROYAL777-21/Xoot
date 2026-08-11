# In-app voice calling

Calling over mobile data, the way WhatsApp and Uber do it: WebRTC between two app clients that
meet in a Twilio conference. It is **not** the masked-PSTN path — that is `create-masked-call`,
which rents numbers through Twilio Proxy and is kept only as a fallback for people without data.

The distinction matters because the Twilio Proxy end-of-life question (#32) applies to the
fallback and to nothing else. It never gated the feature described here.

## What exists, and where

| Layer | File | State |
|---|---|---|
| Token minting | `supabase/functions/twilio-token/index.ts` | Deployed. Participant-checked, rate-limited 30/10min per user per booking. |
| Conference TwiML | `supabase/functions/twilio-voice-twiml/index.ts` | Deployed. Returns `<Dial><Conference>`, HMAC-validated. |
| Call lifecycle | `src/lib/voice-call.ts` | Pure reducer, 12 tests. Shared with native via `npm run shared:sync`. |
| Web SDK binding | `src/hooks/useVoiceCall.ts` | `@twilio/voice-sdk`. Teardown through a ref so unmount mid-call releases the microphone. |
| Web UI | `src/components/zoot/VoiceCallPanel.tsx` | On `BookingDetail`, above the phone route. |
| Native permissions | `mobile/plugins/withXootVoiceCalling.cjs` | Mic string, VoIP + audio background modes, 7 Android permissions. |
| Native SDK | `@twilio/voice-react-native-sdk` 1.7.0 | Installed. Not yet bound to anything. |

The reducer is deliberately shared rather than reimplemented. Which events start a call, which
late events to ignore, and what counts as "live" are the same questions on both surfaces, and two
copies would answer *"did that call connect?"* differently on the day it matters. Only the
transport differs, and the transport is what the hook wraps.

## What is left, in the order it has to happen

**1. A real call on the web.** Two browsers, one booking. This is the cheapest possible proof of
the whole path and it has never been done — no deployed Edge Function in this project has been
exercised over HTTP from an agent session, because the proxy denies the project host. Until this
happens, everything below is building on an untested foundation.

Blocked on: the seven Twilio secrets, and both operational controls (#32). The code requires
`twilio.operational_messages` **and** `twilio.masked_voice` to be true, and both are false.

**2. A dev build.** `@twilio/voice-react-native-sdk` is a native module. Expo Go cannot load it —
`eas build --profile development` is required, and `withXootVoiceCalling.cjs` has to be in the
plugin list before that build, which it now is.

**3. CallKit and ConnectionService.** The OS call screens: the full-screen incoming call with a
green answer button. `MANAGE_OWN_CALLS` and the `voip` background mode are their prerequisites and
are configured; registering the providers is application code inside the SDK's `Voice` singleton
and cannot be written blind. The failure mode is an incoming call that never rings, which no
simulator reproduces.

**4. VoIP push.** PushKit on iOS, FCM high-priority on Android. Without it, an incoming call does
not arrive at all when the app is backgrounded — the call rings on the caller's side and nothing
happens on the callee's. Needs a Twilio Push Credential built from an APNs key and an FCM service
account, both founder-held.

## Recording and transcription stay off

`recording_enabled` and `transcription_enabled` are `false` in every masked-call payload, every
audit entry and every provider status object, and `.semgrep/rules/xoot.yaml` fails the build on
setting either to `true`.

That is not caution for its own sake. Under **RICA s4** a call may only be recorded with the
consent of a party to it, and **POPIA** requires the parties to be told what is collected and why.
Turning either on needs both-party notice wording in the UI and in the terms — the boolean is the
last step, not the first. When that wording ships, delete the Semgrep rule in the same commit.

## Why the feature is still gated

`twilio.masked_voice` is `false`, so the call button does not appear. Flipping it without the
secrets would put a button on the booking screen that fails every time it is tapped, which is
worse than no button: the person tapping it is usually someone standing at a door.
