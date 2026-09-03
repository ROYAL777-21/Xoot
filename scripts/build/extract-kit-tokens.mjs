#!/usr/bin/env node
/**
 * Reads the design tokens out of `design/Xoot_App.html` and writes them to two generated
 * files: a TypeScript module the app and the native build import, and a CSS file
 * `src/index.css` imports.
 *
 * The kit is the source of truth for form, so a token in this repo should never be typed
 * by hand from looking at the kit — that is how the last four palette descriptions ended
 * up wrong. Extract it, generate it, and let `kit-tokens.test.ts` fail the build when the
 * generated files stop matching what the kit actually says.
 *
 * Run with `--check` to verify without writing, which is what the test does.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const KIT = join(root, 'design', 'Xoot_App.html');

/**
 * The founder's 2026-09-03 Claude Design handoff, read AFTER the kit so its values win.
 *
 * The `tokens/*.css` files are read, in the dependency order the design's own `styles.css`
 * concatenates them. That order is a cascade and must be honoured: reading the directory
 * alphabetically puts `dark.css` ahead of `semantic.css` and silently promotes dark-theme
 * values into `:root`. `base.css` is not read — it only consumes tokens, it declares none.
 *
 * ⚠️ **`styles.css` is deliberately NOT the source, and the guard caught why.** It is the
 * flattened delivery bundle, and after the token sections it carries a block headed
 * "iOS motion (authored here)" that re-declares four motion tokens in seconds:
 * `dur-fast` 170ms -> .18s, `dur-slow` 440ms -> .5s, `dur-base` -> .28s, and a different
 * `ease-settle`. Reading the bundle imported that app-specific override into the shared
 * token layer, and `kit-tokens.test.ts` failed on `.18s` not matching `/^\d+ms$/`. The
 * design's own README says the files in `tokens/` are the source; it is right.
 *
 * ── Why appending is safe, measured rather than assumed ──────────────────────────────
 * Of 268 `:root` tokens the two sources share, **261 are identical**. The handoff adds 16
 * new ones and changes four:
 *
 *   --xoot-action-brand         violet-500 -> violet-600
 *   --xoot-action-brand-hover   violet-600 -> violet-700
 *   --xoot-action-brand-press   violet-700 -> violet-800
 *   --xoot-text-muted           neutral-500 -> neutral-600
 *
 * All four move the same way the audited `:root` palette in `src/index.css` already moved.
 * That palette darkened brand from violet-500 to violet-600 because the kit's raw value is
 * 4.38:1 against white and fails AA for body text; the handoff has now baked that same
 * correction into the kit layer. So this import brings the two into agreement rather than
 * setting up a rival.
 *
 * ⚠️ It does NOT repoint the Tailwind colour layer at `--xoot-*`. `@theme inline` in
 * `src/index.css` still reads the audited palette, and
 * `theme-consumes-audited-palette.test.ts` fails if that ever changes.
 */
const HANDOFF_DIR = join(root, 'design', 'handoff-2026-09-03', 'xoot', 'tokens');
const HANDOFF = [
  'fonts', 'colors', 'typography', 'spacing', 'radii', 'elevation', 'motion', 'semantic', 'dark',
].map((name) => join(HANDOFF_DIR, `${name}.css`));

const TS_OUT = join(root, 'src', 'lib', 'kit-tokens.ts');
const CSS_OUT = join(root, 'src', 'styles', 'kit-tokens.css');

/**
 * The kit's dark theme is an opt-in that redeclares semantic aliases only, never the
 * palette. Matching that split matters: if the palette were duplicated per scheme, a
 * colour change would need editing in two places and would drift in one.
 */
const DARK_SELECTOR = '[data-theme="dark"]';

/**
 * Escaped newlines and quotes survive the kit's own bundling. Undo them before parsing or
 * every selector match carries a stray backslash.
 */
function unescapeSource(raw) {
  return raw.replaceAll('\\n', '\n').replaceAll('\\"', '"');
}

/**
 * Declarations, in document order, with the selector that introduced them. Later wins, the
 * same as the cascade — the kit declares `:root` seven separate times, so reading the first
 * match rather than the last gives a value the browser never uses.
 *
 * This is a brace scanner rather than a regex over `selector { ... }`. Two things defeat the
 * regex version: a block preceded by a comment has no `;` or `}` delimiter in front of it,
 * which silently drops it, and an `@media` wrapper makes its inner `:root` look top-level,
 * which silently promotes a conditional override into a base token. The first mistake cost
 * the dark scope entirely and about half the light one.
 */
function collectDeclarations(css) {
  const source = css.replace(/\/\*.*?\*\//gs, '');
  const light = new Map();
  const dark = new Map();

  const stack = [];
  let selectorStart = 0;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (char !== '{' && char !== '}') continue;

    if (char === '{') {
      stack.push({ selector: source.slice(selectorStart, i).trim(), start: i + 1, children: 0 });
      if (stack.length > 1) stack[stack.length - 2].children += 1;
      selectorStart = i + 1;
      continue;
    }

    const frame = stack.pop();
    selectorStart = i + 1;
    if (!frame) continue;

    // Only leaves hold declarations; reading a parent would double-count its children.
    if (frame.children > 0) continue;

    // At-rules are conditions, not scopes. A token inside `@media (prefers-reduced-motion)`
    // is a behaviour override and must not overwrite the base value it is derived from.
    if (stack.some((ancestor) => ancestor.selector.startsWith('@'))) continue;

    const target =
      frame.selector === ':root' ? light : frame.selector === DARK_SELECTOR ? dark : null;
    if (!target) continue;

    for (const decl of source.slice(frame.start, i).matchAll(/(--xoot-[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
      target.set(decl[1], decl[2].trim());
    }
  }

  return { light, dark };
}

/**
 * Keys keep the kit's own kebab spelling minus the prefix, so the round trip back to a CSS
 * custom property is exact. camelCase would not survive it: `violet-500` and `violet-5-0-0`
 * both camelise to `violet500`, and only one of them is a real token.
 */
function toIdentifier(name) {
  return name.replace(/^--xoot-/, '');
}

function renderTs({ light, dark }) {
  const entries = (map) =>
    [...map]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, value]) => `  ${JSON.stringify(toIdentifier(name))}: ${JSON.stringify(value)},`)
      .join('\n');

  return `/**
 * GENERATED by scripts/build/extract-kit-tokens.mjs — do not edit.
 *
 * The design tokens declared by \`design/Xoot_App.html\`, then by the founder's 2026-09-03
 * handoff at \`design/handoff-2026-09-03/xoot/tokens/\`, which wins where the two differ.
 * Together they are the source of truth for how the app looks. \`kit-tokens.test.ts\`
 * re-extracts and fails if this file drifts.
 *
 * Values are kept as the kit wrote them, including \`var(--xoot-...)\` references, because
 * resolving them here would throw away the kit's own semantic layering — which alias points
 * at which palette entry is information, not indirection to be flattened.
 */

/** Tokens declared in the kit's \`:root\` scope. Light is the default and primary mode. */
export const KIT_LIGHT = {
${entries(light)}
} as const;

/**
 * Tokens the kit redeclares under \`${DARK_SELECTOR}\`. Semantic aliases only — the palette
 * is never re-stated, so anything absent here resolves to its light value.
 */
export const KIT_DARK = {
${entries(dark)}
} as const;

export type KitLightToken = keyof typeof KIT_LIGHT;
export type KitDarkToken = keyof typeof KIT_DARK;

/** CSS custom property for a token, e.g. \`surface-page\` to \`var(--xoot-surface-page)\`. */
export function kitVar(token: KitLightToken): string {
  return \`var(--xoot-\${token})\`;
}
`;
}

function renderCss({ light, dark }) {
  const declarations = (map) =>
    [...map]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, value]) => `  ${name}: ${value};`)
      .join('\n');

  return `/* GENERATED by scripts/build/extract-kit-tokens.mjs — do not edit.
 *
 * The design tokens declared by design/Xoot_App.html, then by the founder's 2026-09-03
 * handoff at design/handoff-2026-09-03/xoot/tokens/, which wins where the two differ.
 * Additive: nothing here changes an existing component until that component asks for a
 * --xoot-* value, so the kit's system can land ahead of the port rather than in one
 * breaking sweep.
 */

:root {
${declarations(light)}
}

${DARK_SELECTOR} {
${declarations(dark)}
}
`;
}

function main() {
  const check = process.argv.includes('--check');

  // Handoff second, so its values win on the four tokens the two sources disagree about.
  // `collectDeclarations` already resolves the cascade by document order.
  const css = [KIT, ...HANDOFF]
    .map((path) => unescapeSource(readFileSync(path, 'utf8')))
    .join('\n');
  const tokens = collectDeclarations(css);

  if (tokens.light.size === 0) {
    throw new Error('No --xoot-* tokens found in the kit. Has its format changed?');
  }

  const outputs = [
    [TS_OUT, renderTs(tokens)],
    [CSS_OUT, renderCss(tokens)],
  ];

  if (check) {
    const stale = outputs.filter(([path, want]) => {
      try {
        return readFileSync(path, 'utf8') !== want;
      } catch {
        return true;
      }
    });
    if (stale.length > 0) {
      throw new Error(
        `Generated kit tokens are stale: ${stale.map(([p]) => p).join(', ')}. Run npm run kit:tokens.`,
      );
    }
    return { tokens, stale: [] };
  }

  for (const [path, contents] of outputs) writeFileSync(path, contents);
  return { tokens, stale: [] };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { tokens } = main();
  console.log(`Extracted ${tokens.light.size} light and ${tokens.dark.size} dark kit tokens.`);
}

export { collectDeclarations, unescapeSource, KIT, HANDOFF, TS_OUT, CSS_OUT };
