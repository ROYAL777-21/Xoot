const { AndroidConfig, createRunOncePlugin, withAndroidManifest, withInfoPlist } =
  require("expo/config-plugins");

const pluginName = "withXootVoiceCalling";
const pluginVersion = "1.0.0";

/**
 * Native configuration for in-app voice calling over mobile data.
 *
 * The transport is WebRTC between two app clients meeting in a Twilio conference — the WhatsApp
 * mechanism, and the same one `src/lib/voice-call.ts` and `src/hooks/useVoiceCall.ts` drive on
 * the web. It is not the masked-PSTN path in `create-masked-call`, which needs rented numbers
 * and carries the Twilio Proxy end-of-life question.
 *
 * WHY THIS HAS TO BE A CONFIG PLUGIN
 *
 * `@twilio/voice-react-native-sdk` is a native module. Expo Go cannot load it, so the app needs
 * a **dev build** (`eas build --profile development`) and the permissions below have to be in
 * the manifest and the Info.plist *before* that build — you cannot request `RECORD_AUDIO` at
 * runtime if it is not declared, and iOS terminates an app that calls a usage-described API
 * with no usage string rather than showing a prompt.
 *
 * WHAT IS DELIBERATELY NOT HERE
 *
 * CallKit (iOS) and ConnectionService (Android) are the OS call screens — the full-screen
 * "incoming call" UI with a green answer button. `MANAGE_OWN_CALLS` and the VoIP background
 * mode below are their prerequisites, but registering the provider itself is application code
 * inside the SDK's `Voice` singleton, not manifest configuration, and it cannot be written
 * blind: it needs a device to verify against, because the failure mode is an incoming call that
 * simply never rings.
 *
 * PushKit (iOS) and FCM high-priority (Android) are the other half of that, and are why an
 * incoming call arrives at all when the app is backgrounded. They need a Twilio Push Credential
 * built from an APNs key and an FCM service account — both founder-held, both in issue #32.
 *
 * So: this plugin makes the native build *capable*. It does not make calling work, and the app
 * must keep gating the feature on `twilio.masked_voice` until someone has placed a real call.
 */

/** iOS. Microphone string, plus the background modes a VoIP call needs to survive a lock screen. */
const withVoiceInfoPlist = (config) =>
  withInfoPlist(config, (mod) => {
    // Written in the same voice as the camera and location strings already in app.config.ts:
    // what it is used for and when, not "required for app functionality". App Review rejects
    // the vague form, and it is the sentence the user actually reads.
    mod.modResults.NSMicrophoneUsageDescription =
      "Xoot uses your microphone only during a call you start with your Xooter or with support.";

    const modes = new Set(mod.modResults.UIBackgroundModes ?? []);
    // `voip` keeps the socket alive so a call is not dropped the moment the screen locks, and is
    // the mode PushKit requires. `audio` keeps the call audible in the background — without it
    // iOS suspends the audio session and the call goes silent while still appearing connected,
    // which is worse than dropping.
    modes.add("voip");
    modes.add("audio");
    mod.modResults.UIBackgroundModes = [...modes];

    return mod;
  });

/**
 * Android. Permissions, declared with the reason each one exists.
 *
 * `RECORD_AUDIO` is the only one the user is prompted for; the rest are install-time. That
 * asymmetry matters — asking for the microphone at the moment a call starts is fine, but a
 * missing install-time permission is a crash on a device you cannot reproduce locally.
 */
const ANDROID_PERMISSIONS = [
  // The microphone itself. Runtime prompt, requested at the first call.
  "android.permission.RECORD_AUDIO",
  // Routing: earpiece vs speaker vs headset, and the in-call volume stream.
  "android.permission.MODIFY_AUDIO_SETTINGS",
  // ConnectionService. Without it the OS refuses to register the phone account and there is no
  // system call screen at all — the app can still call, but only while it is in the foreground.
  "android.permission.MANAGE_OWN_CALLS",
  // A call that continues while the user is in another app is a foreground service. Android 14
  // requires the typed variant alongside the generic one or the service throws on start.
  "android.permission.FOREGROUND_SERVICE",
  "android.permission.FOREGROUND_SERVICE_MICROPHONE",
  // Bluetooth headsets. Runtime-prompted on Android 12+, and its absence is silent: audio simply
  // stays on the speaker while the user's earpiece shows as connected.
  "android.permission.BLUETOOTH_CONNECT",
  // The full-screen incoming-call notification. Without it an incoming call is a banner that
  // disappears, which on a locked phone means the call is missed.
  "android.permission.USE_FULL_SCREEN_INTENT",
];

const withVoiceAndroidManifest = (config) =>
  withAndroidManifest(config, (mod) => {
    AndroidConfig.Permissions.ensurePermissions(mod.modResults, ANDROID_PERMISSIONS);
    return mod;
  });

const withXootVoiceCalling = (config) => withVoiceAndroidManifest(withVoiceInfoPlist(config));

module.exports = createRunOncePlugin(withXootVoiceCalling, pluginName, pluginVersion);
module.exports.ANDROID_VOICE_PERMISSIONS = ANDROID_PERMISSIONS;
