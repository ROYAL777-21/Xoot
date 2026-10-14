/**
 * Copies the modules the native app shares with the web app into
 * `mobile/src/generated/`.
 *
 * Why a copy rather than an import across the two package roots: Metro builds its file
 * map from the project root, and a file outside it fails with "Failed to get the SHA-1"
 * no matter what `watchFolders`, `resolveRequest` or `EXPO_USE_METRO_WORKSPACE_ROOT`
 * are set to. A symlink is the other usual answer and breaks on Windows checkouts.
 *
 * The copy is generated, committed, and verified byte-for-byte by
 * `src/lib/shared-native-sync.test.ts` — so editing the copy, or editing the source and
 * forgetting to re-run this, fails CI rather than shipping two different animations.
 * That check is what makes a duplicate file safe; without it this would just be a fork.
 *
 * Only dependency-free modules may be listed. `mobile/` installs its own React Native
 * copies and does not resolve the web app's node_modules, so anything with an import
 * would break at bundle time.
 *
 * Run with `npm run shared:sync`. Mobile's `prestart` and `prebuild` run it too.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MODULES = [
  "splash-choreography.ts",
  "zoey-geometry.ts",
  "design-tokens.ts",
  "safety.ts",
  // Generated from design/Xoot_App.html. The native app needs the same token values as the
  // web app, and it cannot read the CSS copy, so the TypeScript one crosses the root here.
  "kit-tokens.ts",
  // The in-app call lifecycle. Shared for the same reason `safety.ts` is: the rules about when
  // a call may start, when it is live, and which late events to ignore are identical on both
  // surfaces, and two copies would answer "did that call connect?" differently on the day it
  // matters. The transport differs — @twilio/voice-sdk on web, @twilio/voice-react-native-sdk
  // on device — but the transport is what the hook wraps, not what this decides.
  "voice-call.ts",
  // Canonical status aliases must match the native visit detail and tracking flow.
  "booking-state-machine.ts",
  // XootCred balance and expiry rules must be identical on web and native. The web adapter
  // adds its generated Supabase Json type; this dependency-free core is safe for Metro.
  "xootcred-core.ts",
  "xootcred-read.ts",
];

// The booking API contract is server-owned. The native renderer needs a local copy;
// the web renderer also imports the generated contract instead of a Deno pricing module.
export const SERVER_CONTRACTS = ["booking-contract.ts"];
export const BOOKING_MODULES = ["booking-flow.ts"];

// Resolved from this file, not from the working directory — mobile's `prestart` runs
// it from `mobile/`, and the web's `shared:sync` runs it from the repo root.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const from = path.join(repoRoot, "src/lib");
const to = path.join(repoRoot, "mobile/src/generated");

export const banner = (module) =>
  `// GENERATED FILE — DO NOT EDIT.\n` +
  `// Copied from src/lib/${module} by scripts/build/sync-shared-native.mjs.\n` +
  `// Edit the source and run \`npm run shared:sync\`.\n\n`;

export const serverBanner = (module) =>
  `// GENERATED FILE — DO NOT EDIT.\n` +
  `// Copied from supabase/functions/_shared/${module} by scripts/build/sync-shared-native.mjs.\n` +
  `// Edit the source and run \`npm run shared:sync\`.\n\n`;

export function syncSharedNativeModules() {
  mkdirSync(to, { recursive: true });
  for (const module of MODULES) {
    const source = readFileSync(path.join(from, module), "utf8");
    writeFileSync(path.join(to, module), banner(module) + source);
    console.log(`src/lib/${module} -> mobile/src/generated/${module}`);
  }
  for (const module of SERVER_CONTRACTS) {
    const source = serverBanner(module) + readFileSync(path.join(repoRoot, "supabase/functions/_shared", module), "utf8");
    writeFileSync(path.join(from, module), source);
    writeFileSync(path.join(to, module), source);
    console.log(`server ${module} -> web/native contracts`);
  }
  for (const module of BOOKING_MODULES) {
    writeFileSync(path.join(to, module), banner(module) + readFileSync(path.join(from, module), "utf8"));
    console.log(`src/lib/${module} -> mobile/src/generated/${module}`);
  }
}

// Importing the manifest in its drift test must never repair the files before checking them.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  syncSharedNativeModules();
}
export { MODULES };
