import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The wordmark is `Xoot`, capital X, everywhere a customer can read it.
 *
 * This is a small thing that keeps coming back. The company-wide Xoot → Xoot rename lowercased
 * three wordmarks; two were fixed and `AuthReset.tsx` was missed, so the password-reset screen —
 * which a customer reaches while already unsure whether they are on the right site — showed
 * `xoot` under a header reading `Xoot`. It was then missed a second time by a review that named
 * `Auth.tsx` and `Footer.tsx` as the remaining offenders after both had already been corrected.
 *
 * Twice-missed by eye is the definition of something that should be checked by a test rather
 * than by looking. The rule is trivial; catching it is not.
 */

const SRC = join(process.cwd(), "src");

const tsxFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return tsxFiles(path);
    return path.endsWith(".tsx") ? [path] : [];
  });

/**
 * JSX text nodes only — `>xoot<`.
 *
 * Deliberately not a bare search for the lowercase word: it is correct and must stay correct in
 * URLs (`xoot.co.za`), package and class names (`xoot-pricing`, `text-xoot-violet`), storage
 * keys (`xoot.splash.played`) and import paths. Matching the rendered text node is what
 * separates "the brand is written wrong on screen" from "the identifier is lowercase", and only
 * the first is a defect.
 */
const LOWERCASE_WORDMARK = />\s*xoot\s*</;

describe("brand wordmark", () => {
  it("is never rendered lowercase in JSX text", () => {
    const offenders = tsxFiles(SRC).filter((path) =>
      LOWERCASE_WORDMARK.test(readFileSync(path, "utf8")),
    );

    expect(
      offenders.map((path) => path.replace(`${process.cwd()}/`, "")),
      "wordmark must render as `Xoot`",
    ).toEqual([]);
  });
});
