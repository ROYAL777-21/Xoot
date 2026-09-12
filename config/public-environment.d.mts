export type PublicEnvironment = Record<string, string | boolean | undefined>;
export type PublicEnvironmentDefaults = Record<string, Record<string, string> | string[]>;
export type RuntimeFlags = { ci?: boolean; prod?: boolean; dev?: boolean; requireReal?: boolean };
export type DerivedEnvironment = { value: string; source: "VERCEL_ENV" | "CONTEXT" } | null;

export function normaliseAppEnvironment(value?: string): string;
export function deriveAppEnvironment(env: PublicEnvironment): DerivedEnvironment;
export function getPublicEnvironmentDefaults(defaults: PublicEnvironmentDefaults, appEnv?: string): Record<string, string>;
export function resolvePublicEnvironment(input: PublicEnvironment, defaults: PublicEnvironmentDefaults): {
  env: PublicEnvironment;
  derived: DerivedEnvironment;
  appliedDefaults: string[];
};
export function isPlaceholderSupabaseUrl(value?: string): boolean;
export function isPlaceholderSupabaseKey(value?: string): boolean;
export function isSupabasePublicConfigComplete(env: PublicEnvironment): boolean;
export function getPublicSecretLeaks(env: PublicEnvironment): string[];
export function isUnsafePublicMapboxToken(value?: string): boolean;
export function getUnsafePublicMapboxTokenNames(env: PublicEnvironment): string[];
export function isUnsafePublicPostHogToken(value?: string): boolean;
export function getUnsafePublicPostHogTokenNames(env: PublicEnvironment): string[];
export function getPublicConfigIssue(env: PublicEnvironment, flags?: RuntimeFlags): string | null;
export function publicViteEnvironment(env: PublicEnvironment): Record<string, string>;
