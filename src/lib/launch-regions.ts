/**
 * The suburbs Xoot launches in — the client mirror of `approvedLaunchRegions` in
 * `supabase/functions/_shared/action-utils.ts`.
 *
 * `submit-xooter-application` rejects a final submission whose suburb is not in that server-side
 * list, and until this module existed the application form never told the applicant: a free-text
 * "Kempton Park" sailed through every client check and then failed at submit with a generic
 * non-2xx error. The list must match the server's exactly, in lowercase, and the parity test in
 * `launch-regions.test.ts` pins the two together through the documented values.
 *
 * Display casing is derived, not stored, so the list has exactly one source of truth.
 */
export const APPROVED_LAUNCH_REGIONS = [
  "midrand",
  "sandton",
  "bryanston",
  "bedfordview",
  "rosebank",
  "parkhurst",
  "melville",
  "fourways",
  "waterfall",
  "dainfern",
  "hyde park",
  "braamfontein",
] as const;

export type LaunchRegion = (typeof APPROVED_LAUNCH_REGIONS)[number];

const titleCase = (value: string) =>
  value
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

/** Human-facing labels for inputs and hints: "Midrand", "Hyde Park", … */
export const approvedLaunchRegionLabels = (): string[] =>
  APPROVED_LAUNCH_REGIONS.map((region) => titleCase(region));

/** Same containment rule the Edge Function applies: substring, case-insensitive. */
export const isApprovedLaunchRegion = (input: unknown): boolean => {
  const value = String(input ?? "").trim().toLowerCase();
  if (!value) return false;
  return APPROVED_LAUNCH_REGIONS.some((region) => value.includes(region));
};
