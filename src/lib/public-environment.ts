import defaults from "../../config/public-environments.json";

/**
 * Fill in committed PUBLIC defaults for the environment a build says it is.
 *
 * ── The problem this removes ────────────────────────────────────────────────────────────────────
 * `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` had to be typed into every host's
 * dashboard by hand. That is a manual step per host, done under no supervision, and getting it
 * wrong produces a site that builds green and cannot sign anyone in. The Vercel switch on
 * 2026-09-01 hit exactly that.
 *
 * ── The safety property ─────────────────────────────────────────────────────────────────────────
 * Defaults apply **only to the environment named by `VITE_APP_ENV`**. A preview derives
 * `development` (see `scripts/config/validate-public-env.mjs`), whose default block is empty, so a
 * preview build cannot pick up production credentials no matter what else is set. `netlify.toml`
 * protected that by hand; this enforces it, and `public-environment.test.ts` pins it.
 *
 * A real environment variable always wins. This is a floor, never a ceiling.
 */

type PublicEnvironment = Record<string, string | boolean | undefined>;

// `$comment` in the JSON is a string[], so the object is cast through `unknown`. The `$`-prefix
// filter below is what actually keeps documentation out of the environment lookup.
const environmentDefaults = defaults as unknown as Record<string, Record<string, string>>;

/** Keys beginning with `$` are documentation inside the JSON, not environments. */
const isEnvironmentName = (name: string) => !name.startsWith("$");

export const publicEnvironmentNames = Object.keys(environmentDefaults).filter(isEnvironmentName);

export const getPublicEnvironmentDefaults = (appEnv: string | undefined): Record<string, string> => {
  const name = appEnv?.trim().toLowerCase() ?? "";
  if (!name || !isEnvironmentName(name)) return {};
  return environmentDefaults[name] ?? {};
};

/**
 * Return `env` with committed defaults filled in for any key it does not already set.
 *
 * Blank strings count as unset — a host that defines the variable and leaves it empty is a common
 * dashboard mistake, and treating it as "configured" would ship an empty Supabase URL.
 */
export const resolvePublicEnv = (env: PublicEnvironment): PublicEnvironment => {
  const appEnv = typeof env.VITE_APP_ENV === "string" ? env.VITE_APP_ENV : "";
  const fallbacks = getPublicEnvironmentDefaults(appEnv);
  if (Object.keys(fallbacks).length === 0) return env;

  const resolved: PublicEnvironment = { ...env };
  for (const [key, value] of Object.entries(fallbacks)) {
    const current = resolved[key];
    const isBlank = typeof current !== "string" || current.trim() === "";
    if (isBlank) resolved[key] = value;
  }
  return resolved;
};
