import { Config } from "@remotion/cli/config";
import path from "node:path";

/**
 * Remotion renders the splash compositions in `remotion/`. It runs its own bundler,
 * so the `@/` alias Vite provides has to be restated here — without it the
 * composition cannot import the shared choreography or the mascot art, which is the
 * entire point of the setup.
 *
 * Nothing else is overridden. The compositions style themselves inline and declare
 * their own brand tokens, so there is no Tailwind or stylesheet wiring to keep in
 * step with the app.
 */
// `npx remotion versions` reports zod as mismatched: Remotion's schema tooling wants
// zod 4, the app is on zod 3. Left alone deliberately — that tooling is only used for
// editable props in Remotion Studio, which these compositions do not have, and forcing
// the upgrade would move the app's own validation to a new major for a warning.
//
// Remotion downloads its own Chrome Headless Shell on first render. Point this at an
// existing Chrome instead when that download is unavailable — an offline machine, or
// a CI image with an egress allowlist that does not include Remotion's CDN.
if (process.env.REMOTION_BROWSER_EXECUTABLE) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER_EXECUTABLE);
}

Config.overrideWebpackConfig((config) => ({
  ...config,
  resolve: {
    ...config.resolve,
    alias: {
      ...config.resolve?.alias,
      "@": path.resolve(process.cwd(), "src"),
    },
  },
}));
