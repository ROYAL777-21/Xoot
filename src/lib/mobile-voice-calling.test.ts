import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { ANDROID_VOICE_PERMISSIONS } from "../../mobile/plugins/withXootVoiceCalling.cjs";

/**
 * The native side of in-app calling, held to what the config plugin promises.
 *
 * None of this can be proven by running the app here — a Twilio call needs a device, a dev
 * build, and seven secrets nobody in this environment has. What *can* be proven is that the
 * build is configured to be capable of it, and that is worth checking precisely because the
 * failure mode is silent and late: a missing `NSMicrophoneUsageDescription` does not fail the
 * build, it terminates the app on a tester's phone the first time someone taps call.
 *
 * The shape follows `mobile-native-launch.test.ts` and `native-design-system.test.ts` — assert
 * against the real config files, not against a description of them.
 */

const root = process.cwd();
const appConfig = readFileSync(join(root, "mobile/app.config.ts"), "utf8");
const plugin = readFileSync(join(root, "mobile/plugins/withXootVoiceCalling.cjs"), "utf8");

describe("mobile voice calling — native configuration", () => {
  it("registers the plugin, or none of the rest of this file matters", () => {
    // A plugin file that exists and is not listed is the most likely way this regresses: it
    // survives every refactor, passes review, and simply never runs.
    expect(appConfig).toContain("./plugins/withXootVoiceCalling.cjs");
  });

  it("asks for the microphone in words, not in jargon", () => {
    // App Review rejects "required for app functionality". This is also the sentence a user
    // reads at the moment they decide whether to trust the app with a microphone.
    const match = plugin.match(/NSMicrophoneUsageDescription\s*=\s*\n?\s*"([^"]+)"/);
    expect(match?.[1]).toBeTruthy();
    const text = match![1];
    expect(text.length).toBeGreaterThan(40);
    expect(text).toMatch(/only/i);
    expect(text).not.toMatch(/required for|app functionality/i);
  });

  it("declares both VoIP background modes", () => {
    // `voip` alone is the common half-fix: the socket survives the lock screen, the audio
    // session does not, and the call goes silent while still showing as connected — which is
    // harder to diagnose than a dropped call and worse to experience.
    expect(plugin).toMatch(/modes\.add\("voip"\)/);
    expect(plugin).toMatch(/modes\.add\("audio"\)/);
  });

  it("declares every Android permission a call needs, and no more", () => {
    expect([...ANDROID_VOICE_PERMISSIONS].sort()).toEqual([
      "android.permission.BLUETOOTH_CONNECT",
      "android.permission.FOREGROUND_SERVICE",
      "android.permission.FOREGROUND_SERVICE_MICROPHONE",
      "android.permission.MANAGE_OWN_CALLS",
      "android.permission.MODIFY_AUDIO_SETTINGS",
      "android.permission.RECORD_AUDIO",
      "android.permission.USE_FULL_SCREEN_INTENT",
    ]);
  });

  it("pairs the typed foreground-service permission with the generic one", () => {
    // Android 14 throws at service start if the typed variant is missing, and the generic one
    // alone looks complete. Asserted as a pair so removing either fails.
    const perms = new Set(ANDROID_VOICE_PERMISSIONS);
    expect(perms.has("android.permission.FOREGROUND_SERVICE")).toBe(true);
    expect(perms.has("android.permission.FOREGROUND_SERVICE_MICROPHONE")).toBe(true);
  });

  it("does not ask for READ_PHONE_STATE or CALL_PHONE", () => {
    // Neither is needed for a data call, both are sensitive, and both trigger the Play Store
    // permissions declaration form. ConnectionService needs MANAGE_OWN_CALLS and nothing more.
    expect(ANDROID_VOICE_PERMISSIONS).not.toContain("android.permission.READ_PHONE_STATE");
    expect(ANDROID_VOICE_PERMISSIONS).not.toContain("android.permission.CALL_PHONE");
  });

  it("keeps the native SDK on the mobile package, not the web one", () => {
    // The two SDKs share nothing but a name. Putting the React Native one in the web app's
    // dependencies would ship a native module into a browser bundle.
    const mobilePkg = JSON.parse(readFileSync(join(root, "mobile/package.json"), "utf8"));
    const webPkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    expect(mobilePkg.dependencies["@twilio/voice-react-native-sdk"]).toBeTruthy();
    expect(mobilePkg.dependencies["@twilio/voice-sdk"]).toBeUndefined();
    expect(webPkg.dependencies["@twilio/voice-sdk"]).toBeTruthy();
    expect(webPkg.dependencies["@twilio/voice-react-native-sdk"]).toBeUndefined();
  });

  it("states the two things the plugin does not do", () => {
    // The plugin makes a build capable of calling. It does not register CallKit or
    // ConnectionService, and it does not wire VoIP push — without which an incoming call never
    // arrives on a backgrounded app. Someone reading only the plugin name would assume
    // otherwise, so the file has to say it, and this makes the saying non-optional.
    expect(plugin).toMatch(/CallKit/);
    expect(plugin).toMatch(/ConnectionService/);
    expect(plugin).toMatch(/PushKit/);
  });
});
