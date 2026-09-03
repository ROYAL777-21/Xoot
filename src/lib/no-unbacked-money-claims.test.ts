import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { STARTING_RATE_BPS, FLOOR_RATE_BPS } from "../../supabase/functions/_shared/pricing";

/**
 * No screen may claim Xoot takes nothing.
 *
 * ⚠️ **This guard exists because `src/components/xoot/MyHomeHub.tsx` said exactly that.** It was
 * imported by nothing, so it never rendered — but it read as finished work, and the class of
 * mistake that gets made next is mounting it:
 *
 *   "You set the pay" · "Decide your worker's daily rate. They get 100% — Xoot never deducts."
 *
 * Xoot deducts. `STARTING_RATE_BPS` is 3500 — a Xooter starts on 35% commission and the best band
 * is the 20% floor. A rendered screen saying otherwise is a misleading representation about money
 * under **CPA s41**, where intent is irrelevant. The file was deleted; this is what stops the
 * sentence coming back in some other component.
 */
const SRC = join(process.cwd(), "src");

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : full.endsWith(".tsx") || full.endsWith(".ts") ? [full] : [];
  });

// This file quotes the banned claim in order to explain it, so it excludes itself. Comments are
// stripped from everything else for the same reason — two guards in this repo have already failed
// against their own explanatory comment rather than against a regression.
const FILES = walk(SRC).filter((f) => !f.endsWith("no-unbacked-money-claims.test.ts"));

describe("no screen claims Xoot takes no commission", () => {
  it("commission is real, which is what makes the claim false", () => {
    expect(STARTING_RATE_BPS).toBe(3500);
    expect(FLOOR_RATE_BPS).toBe(2000);
  });

  it("nothing in src/ says a worker keeps 100% or that Xoot never deducts", () => {
    const offenders: string[] = [];
    for (const file of FILES) {
      const code = readFileSync(file, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
      if (/never deducts|keeps?\s+100\s*%|get\s+100\s*%\s*[—-]|100% of (?:the |their )?(?:pay|fee|rate)/i.test(code)) {
        offenders.push(file.replace(process.cwd() + "/", ""));
      }
    }
    expect(offenders, "a screen claims Xoot takes no commission").toEqual([]);
  });

  it("nothing in src/ invites a customer to set a Xooter's rate", () => {
    // The other half of the deleted claim. Xoot prices off a fixed ladder in _shared/pricing.ts;
    // a customer naming a daily rate is a different business model, and one nothing implements.
    const offenders: string[] = [];
    for (const file of FILES) {
      const code = readFileSync(file, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
      if (/you set the pay|set your (?:own )?(?:worker|xooter)['’]?s? (?:daily )?rate|decide your worker/i.test(code)) {
        offenders.push(file.replace(process.cwd() + "/", ""));
      }
    }
    expect(offenders, "a screen invites the customer to set the rate").toEqual([]);
  });
});
