// Only fields intended for public marketplace display. Private contractor data is excluded.
export const DIRECTORY_COLUMNS = "id,name,role,rating,jobs_completed,hourly_rate,photo_url,tags,is_zotm,verified,background_checked,background_check_status,airbnb_specialist,premium_care_plus,repeat_client_count,job_completion_rate,reliability_score,years_experience,suburb_coverage,transport,supplies_owned,languages_spoken,pet_comfort";
export type PublicDirectoryProfile = {
  id: string; name: string; role: string; rating: number | null; jobs_completed: number;
  hourly_rate: number; photo_url: string | null; tags: string[]; is_zotm: boolean;
  verified: boolean; background_checked: boolean; background_check_status: string;
  airbnb_specialist: boolean; premium_care_plus: boolean; repeat_client_count: number;
  job_completion_rate: number | null; reliability_score: number | null;
  years_experience: number | null; suburb_coverage: string[]; transport: string | null;
  supplies_owned: string[]; languages_spoken: string[]; pet_comfort: string | null;
};
const text = (value: unknown) => typeof value === "string" ? value : null;
const number = (value: unknown) => value !== null && value !== "" && Number.isFinite(Number(value)) ? Number(value) : null;
const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

/** Construct an allowlisted response even if a query later accidentally selects more columns. */
export function publicDirectoryProfile(row: Record<string, unknown>): PublicDirectoryProfile {
  const jobs = Math.max(0, number(row.jobs_completed) ?? 0);
  return {
    id: text(row.id) ?? "", name: text(row.name) ?? "", role: text(row.role) ?? "cleaning",
    // Legacy rows defaulted to 5 stars and 100% before completing any work.
    rating: jobs > 0 ? number(row.rating) : null,
    jobs_completed: jobs, hourly_rate: number(row.hourly_rate) ?? 0,
    photo_url: text(row.photo_url), tags: strings(row.tags), is_zotm: row.is_zotm === true,
    verified: row.verified === true, background_checked: row.background_checked === true || row.background_check_status === "approved",
    background_check_status: text(row.background_check_status) ?? "pending",
    airbnb_specialist: row.airbnb_specialist === true, premium_care_plus: row.premium_care_plus === true,
    repeat_client_count: Math.max(0, number(row.repeat_client_count) ?? 0),
    job_completion_rate: jobs > 0 ? number(row.job_completion_rate) : null,
    reliability_score: jobs > 0 ? number(row.reliability_score) : null,
    years_experience: number(row.years_experience), suburb_coverage: strings(row.suburb_coverage),
    transport: text(row.transport), supplies_owned: strings(row.supplies_owned),
    languages_spoken: strings(row.languages_spoken), pet_comfort: text(row.pet_comfort),
  };
}
