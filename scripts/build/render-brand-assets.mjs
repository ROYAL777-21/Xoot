/**
 * Renders every brand still from the Remotion compositions in `remotion/`.
 *
 * The launcher and launch-screen assets are generated from the same `ZoeyArt`
 * component as the mascot in the product, so the icon cannot drift from the
 * character. Re-run after any change to her.
 *
 * Remotion downloads its own Chrome on first use; set REMOTION_BROWSER_EXECUTABLE to
 * point at an existing one when that download is not available.
 *
 * It must point at a **headless shell**, not at a full Chrome binary. Chrome removed old
 * headless mode, which is what Remotion launches, so a normal `chrome` exits immediately
 * with "Old Headless mode has been removed from the Chrome binary" — reported as a generic
 * browser-launch failure that looks like a sandbox or missing-library problem.
 *
 * In a sandboxed CI or agent environment the download is usually blocked and a headless
 * shell is usually already present:
 *
 *   REMOTION_BROWSER_EXECUTABLE=/opt/pw-browsers/chromium_headless_shell-*\/chrome-linux/headless_shell \
 *     npm run icons:render
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * Everything the stills are rendered *from*.
 *
 * `Root.tsx` holds the `PAGE` and `INK` constants and the per-composition props; `XootMark`
 * draws the plate; `ZoeyArt` is the mascot herself. Change any of them and the committed PNGs
 * are stale until this script runs again.
 *
 * Add an input here when the renderer grows one, or the manifest will keep reporting fresh.
 */
const INPUTS = [
  "remotion/Root.tsx",
  "remotion/XootMark.tsx",
  "src/components/zoot/mascot/ZoeyArt.tsx",
];

const MANIFEST = "scripts/build/render-manifest.json";

/** Path then bytes, in list order, so a rename counts as a change. */
const hashInputs = () => {
  const sha = createHash("sha256");
  for (const rel of INPUTS) {
    sha.update(rel);
    sha.update(readFileSync(rel));
  }
  return sha.digest("hex");
};

const TARGETS = [
  ["XootIcon", "mobile/assets/images/icon.png"],
  ["XootIcon", "mobile/assets/images/favicon.png"],
  ["XootSplashMark", "mobile/assets/images/splash-icon.png"],
  ["XootAdaptiveForeground", "mobile/assets/images/android-icon-foreground.png"],
  ["XootAdaptiveBackground", "mobile/assets/images/android-icon-background.png"],
  ["XootMonochrome", "mobile/assets/images/android-icon-monochrome.png"],
];

for (const [composition, out] of TARGETS) {
  mkdirSync(path.dirname(out), { recursive: true });
  console.log(`${composition} -> ${out}`);
  execFileSync(
    "npx",
    ["remotion", "still", "remotion/index.ts", composition, out, "--image-format=png", "--log=error"],
    { stdio: "inherit" },
  );
}

/*
 * Stamp what these PNGs were rendered from.
 *
 * `brand-assets-fresh.test.ts` re-hashes the same inputs and fails when they have moved on,
 * which is the whole point: `palette-migration.md` spent four days asserting these assets were
 * "probably stale" because nothing could answer the question, and settling it took archaeology
 * across six `git log` queries. They were fine. A hash makes the next version of that question
 * a red test instead.
 *
 * Written here rather than by hand so the only way to update it is to actually re-render.
 * No timestamp — the file must stay byte-identical when nothing changed, or every run would
 * show up as a diff and teach people to ignore it.
 */
writeFileSync(
  MANIFEST,
  `${JSON.stringify({ inputs: INPUTS, sha256: hashInputs() }, null, 2)}\n`,
);
console.log(`Brand assets rendered. Manifest -> ${MANIFEST}`);
