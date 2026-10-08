import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

const renderedSmoke = "src/lib/rendered-site-smoke.test.ts";
const excludedTests = ["**/node_modules/**", "**/.git/**", "supabase/functions/_shared/twilio-webhook.test.ts"];

export default defineConfig({
  plugins: [react()],
  // NOTE: `src/lib/mobile-*.test.ts` import shared helpers from `mobile/src/lib`.
  // Vite's oxc transform resolves the nearest tsconfig per file, so those files use
  // mobile/tsconfig.json, which extends `expo/tsconfig.base`. That means the full
  // suite requires `bun install` in ./mobile as well as at the root — without it,
  // both files fail to transform and 8 tests silently do not run.
  test: {
    environment: "jsdom",
    // Bound the unit-suite memory footprint on local machines and small CI runners.
    maxWorkers: 4,
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // ⚠️ `supabase/functions/**` added 2026-08-13. Before that the include was `src/**` only, and
    // `supabase/functions/_shared/twilio-webhook.test.ts` HAD NEVER RUN — it sat in the tree looking
    // like coverage for the webhook signature path while contributing nothing. That is the exact
    // failure CLAUDE.md warns about: a guard is only worth having if it fails against the defect it
    // describes, and one that is never collected cannot fail at all.
    //
    // Edge Function sources import from `https://esm.sh/...`, which Vite cannot resolve, so only
    // modules with no remote imports are testable this way. `_shared/payfast.ts` is deliberately
    // written as pure TypeScript for that reason: its MD5 and signature construction are the parts
    // that must be executed, not eyeballed.
    // `twilio-webhook.test.ts` is a DENO test — `Deno.test()` and a `jsr:@std/assert` import, which
    // Vite cannot resolve. Excluded here and run by the `deno test` step in `tests.yml` instead, so
    // it executes somewhere rather than nowhere. Measured 2026-08-13: widening the include above
    // surfaced it, which is how the fact that it had never run came to light at all.
    exclude: excludedTests,
    // Chromium startup competes with the configuration tests' child Vite builds.
    // Run the real-browser regressions after those workers finish, without relaxing
    // the browser deadlines or dropping these checks from the normal test command.
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.{test,spec}.{ts,tsx}", "supabase/functions/**/*.{test,spec}.{ts,tsx}"],
          exclude: [...excludedTests, renderedSmoke],
          sequence: { groupOrder: 0 },
        },
      },
      {
        extends: true,
        test: {
          name: "rendered",
          include: [renderedSmoke],
          sequence: { groupOrder: 1 },
        },
      },
    ],
    env: {
      VITE_APP_ENV: "development",
      VITE_SUPABASE_URL: "https://test-project.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
