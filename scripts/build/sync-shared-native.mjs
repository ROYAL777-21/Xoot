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
  // Generated from design/Xoot_App.html. The native app needs the same token values as the
  // web app, and it cannot read the CSS copy, so the TypeScript one crosses the root here.
  "kit-tokens.ts",
];

// Resolved from this file, not from the working directory — mobile's `prestart` runs
// it from `mobile/`, and the web's `shared:sync` runs it from the repo root.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const from = path.join(repoRoot, "src/lib");
const to = path.join(repoRoot, "mobile/src/generated");

export const banner = (module) =>
  `// GENERATED FILE — DO NOT EDIT.\n` +
  `// Copied from src/lib/${module} by scripts/build/sync-shared-native.mjs.\n` +
  `// Edit the source and run \`npm run shared:sync\`.\n\n`;

mkdirSync(to, { recursive: true });

for (const module of MODULES) {
  const source = readFileSync(path.join(from, module), "utf8");
  writeFileSync(path.join(to, module), banner(module) + source);
  console.log(`src/lib/${module} -> mobile/src/generated/${module}`);
}

export { MODULES };
