/**
 * Xooter application field-format validation — server-side half of
 * `src/lib/xooter-field-validation.ts`.
 *
 * Same rules, mirrored into the Edge Function runtime because Edge Functions cannot import from
 * `src/`. The two files must change together in the same commit: the client copy gives the
 * applicant instant feedback, this copy is the one that actually decides, because anything that
 * runs in the browser is UX rather than a control.
 *
 * Returns machine codes (`field` + `code`) that `submit-xooter-application` maps onto stable
 * client messages — the client cannot see Edge Function logs, so the code is the contract.
 * Empty values are NOT reported here: presence is enforced by the required-fields check, and
 * drafts must stay lenient so an applicant can save progress.
 */

export const normaliseEmailForComparison = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .slice(0, 254);

export const normaliseSaPhone = (value: unknown) =>
  String(value ?? "")
    .replace(/[\s().-]/g, "")
    .trim()
    .slice(0, 20);

const EMAIL_LOCAL_PATTERN = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;
const EMAIL_DOMAIN_LABEL_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;

export const isValidEmailFormat = (value: unknown): boolean => {
  const email = String(value ?? "").trim().toLowerCase();
  if (email.length < 6 || email.length > 254) return false;
  if (email.includes("..")) return false;
  const atIndex = email.lastIndexOf("@");
  if (atIndex < 1) return false;
  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);
  if (!local || !domain) return false;
  if (!EMAIL_LOCAL_PATTERN.test(local)) return false;
  if (domain.startsWith(".") || domain.endsWith(".") || domain.includes("..")) return false;
  const labels = domain.split(".");
  if (labels.length < 2) return false;
  if (!labels.every((label) => EMAIL_DOMAIN_LABEL_PATTERN.test(label))) return false;
  return /^[a-z]{2,}$/.test(labels[labels.length - 1]);
};

const SA_PHONE_PATTERN = /^(?:\+27|0)[1-9]\d{8}$/;

export const isValidSaPhoneNumber = (value: unknown): boolean => {
  const phone = normaliseSaPhone(value);
  if (!SA_PHONE_PATTERN.test(phone)) return false;
  const significant = phone.startsWith("+27") ? phone.slice(3) : phone.slice(1);
  return /^[1-8]/.test(significant);
};

export const isValidStreetAddress = (value: unknown): boolean => {
  const address = String(value ?? "").trim();
  if (address.length < 8 || address.length > 500) return false;
  if (!/[A-Za-z]/.test(address)) return false;
  return address.split(/\s+/).length >= 2;
};

export const isValidCityName = (value: unknown): boolean => {
  const city = String(value ?? "").trim();
  if (city.length < 2 || city.length > 120) return false;
  return /^[A-Za-z][A-Za-z0-9\s\-'.()]*$/.test(city);
};

export const isValidSaPostalCode = (value: unknown): boolean => {
  const code = String(value ?? "").trim();
  if (!/^\d{4}$/.test(code)) return false;
  return code !== "0000";
};

export const isValidFullName = (value: unknown): boolean => {
  const name = String(value ?? "").trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 120) return false;
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/.test(name)) return false;
  return name.split(" ").length >= 2;
};

export const isValidBankAccountNumber = (value: unknown): boolean => {
  const account = String(value ?? "").trim();
  return /^\d{6,17}$/.test(account);
};

export const isValidSaBranchCode = (value: unknown): boolean => {
  const branch = String(value ?? "").trim();
  return /^\d{6}$/.test(branch);
};

export const isValidYearsExperience = (value: unknown): boolean => {
  if (typeof value === "string" && value.trim() === "") return false;
  const years = Number(value);
  return Number.isFinite(years) && Number.isInteger(years) && years >= 0 && years <= 60;
};

export type FieldFormatIssue = { field: string; code: string };

/**
 * Validate every formatted field of a submitted application. Returns one issue per offending
 * field. Only fields with a non-empty value are judged — emptiness is the required-fields
 * check's job, and drafts stay lenient so progress is never blocked.
 */
export const validateXooterFieldFormats = (input: {
  full_name?: unknown;
  email?: unknown;
  phone?: unknown;
  emergency_contact_name?: unknown;
  emergency_contact_phone?: unknown;
  address?: unknown;
  city?: unknown;
  postal_code?: unknown;
  bank_name?: unknown;
  bank_account_number?: unknown;
  bank_branch_code?: unknown;
  years_experience?: unknown;
  reference_1_phone?: unknown;
  reference_1_email?: unknown;
  reference_2_phone?: unknown;
  reference_2_email?: unknown;
}): FieldFormatIssue[] => {
  const issues: FieldFormatIssue[] = [];
  const present = (value: unknown) => String(value ?? "").trim() !== "";

  if (present(input.full_name) && !isValidFullName(input.full_name)) {
    issues.push({ field: "full_name", code: "full_name_format" });
  }
  if (present(input.email) && !isValidEmailFormat(input.email)) {
    issues.push({ field: "email", code: "email_format" });
  }
  if (present(input.phone) && !isValidSaPhoneNumber(input.phone)) {
    issues.push({ field: "phone", code: "phone_format" });
  }
  if (present(input.emergency_contact_name) && !isValidFullName(input.emergency_contact_name)) {
    issues.push({ field: "emergency_contact_name", code: "emergency_contact_name_format" });
  }
  if (present(input.emergency_contact_phone) && !isValidSaPhoneNumber(input.emergency_contact_phone)) {
    issues.push({ field: "emergency_contact_phone", code: "emergency_contact_phone_format" });
  }
  if (present(input.address) && !isValidStreetAddress(input.address)) {
    issues.push({ field: "address", code: "address_format" });
  }
  if (present(input.city) && !isValidCityName(input.city)) {
    issues.push({ field: "city", code: "city_format" });
  }
  if (present(input.postal_code) && !isValidSaPostalCode(input.postal_code)) {
    issues.push({ field: "postal_code", code: "postal_code_format" });
  }
  if (present(input.bank_name) && String(input.bank_name).trim().length < 2) {
    issues.push({ field: "bank_name", code: "bank_name_format" });
  }
  if (present(input.bank_account_number) && !isValidBankAccountNumber(input.bank_account_number)) {
    issues.push({ field: "bank_account_number", code: "bank_account_format" });
  }
  if (present(input.bank_branch_code) && !isValidSaBranchCode(input.bank_branch_code)) {
    issues.push({ field: "bank_branch_code", code: "bank_branch_code_format" });
  }
  if (present(input.years_experience) && !isValidYearsExperience(input.years_experience)) {
    issues.push({ field: "years_experience", code: "years_experience_format" });
  }
  if (present(input.reference_1_phone) && !isValidSaPhoneNumber(input.reference_1_phone)) {
    issues.push({ field: "reference_1_phone", code: "reference_1_phone_format" });
  }
  if (present(input.reference_1_email) && !isValidEmailFormat(input.reference_1_email)) {
    issues.push({ field: "reference_1_email", code: "reference_1_email_format" });
  }
  if (present(input.reference_2_phone) && !isValidSaPhoneNumber(input.reference_2_phone)) {
    issues.push({ field: "reference_2_phone", code: "reference_2_phone_format" });
  }
  if (present(input.reference_2_email) && !isValidEmailFormat(input.reference_2_email)) {
    issues.push({ field: "reference_2_email", code: "reference_2_email_format" });
  }

  return issues;
};
