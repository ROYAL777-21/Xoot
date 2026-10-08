#!/usr/bin/env node
/** Regenerate the committed fonts from the current uploaded handoff.
 * Install the optional authoring dependency: python -m pip install 'fonttools[woff]'
 * Then run: node scripts/design/extract-kit-fonts.mjs
 * XOOT_FONT_PYTHON may point to a specific Python executable.
 * Builds use committed files; they do not install Python or download fonts.
 * Preserve Newsreader optical sizing: pinning opsz changes the approved design.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("./subset-handoff-fonts.py", import.meta.url));
const result = spawnSync(process.env.XOOT_FONT_PYTHON || "python", [script], { stdio: "inherit" });
if (result.error) console.error(`Font regeneration failed: ${result.error.message}`);
process.exitCode = result.status ?? 1;
