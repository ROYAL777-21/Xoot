import defaults from "../../config/public-environments.json";
import {
  getPublicEnvironmentDefaults as getDefaults,
  resolvePublicEnvironment,
} from "../../config/public-environment.mjs";

export type PublicEnvironment = Record<string, string | boolean | undefined>;

const environmentDefaults = defaults as unknown as Record<string, Record<string, string> | string[]>;

export const publicEnvironmentNames = Object.keys(environmentDefaults).filter((name) => !name.startsWith("$"));

export const getPublicEnvironmentDefaults = (appEnv: string | undefined): Record<string, string> =>
  getDefaults(environmentDefaults, appEnv);

export const resolvePublicEnv = (env: PublicEnvironment): PublicEnvironment =>
  resolvePublicEnvironment(env, environmentDefaults).env;

const buildResolvedEnvironment =
  typeof __XOOT_PUBLIC_ENV__ === "undefined"
    ? resolvePublicEnv({ ...import.meta.env, VITE_APP_ENV: import.meta.env.VITE_APP_ENV })
    : __XOOT_PUBLIC_ENV__;

export const resolvedPublicEnv: PublicEnvironment = Object.freeze(buildResolvedEnvironment);
