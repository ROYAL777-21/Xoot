import { afterEach, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import * as readiness from "./apple-auth-readiness";

// Execute the actual native boundary with only its platform/SDK transports replaced.
// Keeping this harness dependency-free avoids loading React Native's device runtime in jsdom.
async function loadNativeApple(platform: string, accepted = readiness.APPLE_AUTH_READINESS, capable = true) {
  const probe = vi.fn(async () => capable);
  const nativeSignIn = vi.fn();
  const browserSignIn = vi.fn();
  const exchange = vi.fn();
  const flow = vi.fn(async () => "synthetic-session");
  const source = readFileSync("mobile/src/lib/apple-auth.ts", "utf8");
  const imports: Record<string, unknown> = {
    "expo-apple-authentication": { isAvailableAsync: probe, signInAsync: nativeSignIn },
    "expo-crypto": {},
    "react-native": { Platform: { OS: platform } },
    "@/lib/supabase": { supabase: { auth: { signInWithIdToken: exchange } } },
    "./apple-auth-flow": { performAppleSignIn: flow },
    "./auth-links": { startOAuth: browserSignIn },
    "../generated/apple-auth-readiness": { isAppleSignInReady: (surface: string) => readiness.isAppleSignInReady(surface, accepted) },
  };
  // Transpile the real module into a small import-injected runtime. This tests its exported
  // availability/start behavior, rather than asserting that the source contains a word.
  const { transpileModule, ModuleKind, ScriptTarget } = await import("typescript");
  const compiled = transpileModule(source, { compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2022 } }).outputText;
  const exports: Record<string, (...args: unknown[]) => Promise<unknown>> = {};
  runInNewContext(compiled, { require: (name: string) => {
    if (!(name in imports)) throw new Error(`Unexpected native import: ${name}`);
    return imports[name];
  }, exports });
  return { exports, probe, nativeSignIn, browserSignIn, exchange, flow };
}

afterEach(() => vi.restoreAllMocks());
it.each(["ios", "android"])("does not claim %s availability from OS capability without reviewed provider/build readiness", async platform => {
  const native = await loadNativeApple(platform);
  expect(await native.exports.isAppleSignInAvailable()).toBe(false);
  expect(native.probe).not.toHaveBeenCalled();
});

it.each(["ios", "android"])("refuses a direct %s Apple start before calling the native or browser transport", async platform => {
  const native = await loadNativeApple(platform);
  await expect(native.exports.signInWithApple()).rejects.toThrow(/not available yet/);
  expect(native.nativeSignIn).not.toHaveBeenCalled();
  expect(native.browserSignIn).not.toHaveBeenCalled();
  expect(native.exchange).not.toHaveBeenCalled();
  expect(native.flow).not.toHaveBeenCalled();
});

const accepted: readiness.AppleAuthReadiness = { providerConfigured: true, webAccepted: true, iosSignedBuildAccepted: true, androidBrowserAccepted: true };
it("still checks actual iOS capability after provider and signed-build acceptance", async () => {
  const native = await loadNativeApple("ios", accepted, false);
  expect(await native.exports.isAppleSignInAvailable()).toBe(false);
  expect(native.probe).toHaveBeenCalledTimes(1);
  await expect(native.exports.signInWithApple()).rejects.toThrow(/not available yet/);
  expect(native.flow).not.toHaveBeenCalled();
});
it("preserves the existing native nonce/state flow after iOS acceptance", async () => {
  const native = await loadNativeApple("ios", accepted);
  expect(await native.exports.signInWithApple()).toBe("synthetic-session");
  expect(native.flow).toHaveBeenCalledTimes(1);
  expect(native.browserSignIn).not.toHaveBeenCalled();
});
it("preserves the Android browser transport only after its independent acceptance", async () => {
  const native = await loadNativeApple("android", accepted);
  await native.exports.signInWithApple();
  expect(native.browserSignIn).toHaveBeenCalledWith("apple");
  expect(native.probe).not.toHaveBeenCalled();
  expect(native.flow).not.toHaveBeenCalled();
});
