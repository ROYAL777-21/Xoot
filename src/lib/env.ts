import {
  getPublicConfigIssue,
  getPublicSecretLeaks,
  getUnsafePublicMapboxTokenNames,
  getUnsafePublicPostHogTokenNames,
  isPlaceholderSupabaseKey,
  isPlaceholderSupabaseUrl,
  isSupabasePublicConfigComplete,
  isUnsafePublicMapboxToken,
  isUnsafePublicPostHogToken,
  normaliseAppEnvironment,
} from "../../config/public-environment.mjs";
import { resolvedPublicEnv, type PublicEnvironment } from "./public-environment";

type RuntimeFlags = { prod?: boolean; dev?: boolean; ci?: boolean; requireReal?: boolean };

export {
  getPublicSecretLeaks,
  getUnsafePublicMapboxTokenNames,
  getUnsafePublicPostHogTokenNames,
  isPlaceholderSupabaseKey,
  isPlaceholderSupabaseUrl,
  isSupabasePublicConfigComplete,
  isUnsafePublicMapboxToken,
  isUnsafePublicPostHogToken,
  normaliseAppEnvironment,
};

export const isDemoModeAllowedForEnv = (_env: PublicEnvironment, _flags: RuntimeFlags = {}) => false;

export const getPublicConfigIssueForEnv = (env: PublicEnvironment, flags: RuntimeFlags = {}) =>
  getPublicConfigIssue(env, flags);

export const assertValidPublicConfig = () => {
  const issue = getPublicConfigIssueForEnv(resolvedPublicEnv, {
    prod: import.meta.env.PROD,
    dev: import.meta.env.DEV,
  });
  if (issue) throw new Error(`Xoot environment configuration error: ${issue}`);
};
