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
import { mkdirSync } from "node:fs";
import path from "node:path";

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

console.log("Brand assets rendered.");
