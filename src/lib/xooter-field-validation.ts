/**
 * Xooter application field-format validation — address, email, phone, banking, postal code.
 *
 * ── Why this module exists ─────────────────────────────────────────────────────
 * The application form checked "is the field non-empty" and nothing else for most fields. A
 * street address of "kkk", a postal code of "asdf", a branch code of "12" and an email of
 * "a@b" all passed every client gate, saved to the database, and were only caught — if at all —
 * by a human reviewer after the applicant had uploaded four documents and waited. The founder
 * asked for a patch that "verifies a valid address, email, number, ID, date of birth, etc.";
 * this is it, for everything identity validation (`xooter-identity.ts`) does not already cover.
 *
 * Like `xooter-identity.ts`, the rules live in TWO places on purpose: here (client, for
 * immediate feedback in the form) and in
 * `supabase/functions/_shared/xooter-field-validation.ts` (server, because a browser check is
 * UX, not a control). The two implementations must change together in the same commit;
 * `xooter-field-validation.test.ts` pins this copy, and the server copy answers in machine
 * codes mapped to messages inside `submit-xooter-application`.
 *
 * ── South African specifics, and where each rule comes from ────────────────────
 * Phone numbers: national significant number is 9 digits after the leading 0, per ICASA's
 * numbering plan. Mobile ranges are 06x–08x; geographic landlines are 01x–05x. A Xooter needs
 * a reachable number, and both mobile and landline are acceptable, so both prefixes pass.
 * Postal codes: exactly 4 digits (South Africa switched to 4-digit codes in 1973; the valid
 * range starts at 0001).
 * Branch codes: 6 digits on every SA bank (FNB 250655, Capitec 470010, Standard 051001,
 * Absa 632005, Nedbank 198765) — universal branch codes included.
 * Bank account numbers: 6–17 digits covers the shortest (FNB 6) to the longest (Nedbank 17)
 * formats issued by the major banks.
 */

const EMAIL_LOCAL_PATTERN = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;
const EMAIL_DOMAIN_LABEL_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;

/**
 * Pragmatic RFC 5322 email check: one "@", a sane local part, a domain of dot-separated labels
 * with a TLD of at least two letters. Not the full grammar — the full grammar is famously
 * unverifiable — but it rejects every malformed shape that has actually reached the database:
 * consecutive dots, missing TLDs, spaces, unicode punctuation, `@` in the domain.
 */
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
  const tld = labels[labels.length - 1];
  return /^[a-z]{2,}$/.test(tld);
};

/** Lowercased, trimmed — the shape two email addresses must share to be "the same person". */
export const normaliseEmailForComparison = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .slice(0, 254);

/**
 * South African phone number: "+27" or leading "0", then a digit 1–8 and eight more digits.
 * Accepts mobile (06x–08x) and landline (01x–05x); rejects 09x/00x (unassigned), short codes,
 * international numbers and letter-containing junk. Spaces, parentheses, dots and dashes are
 * tolerated before the check because users type them.
 */
const SA_PHONE_PATTERN = /^(?:\+27|0)[1-9]\d{8}$/;

export const normaliseSaPhone = (value: unknown) =>
  String(value ?? "")
    .replace(/[\s().-]/g, "")
    .trim()
    .slice(0, 20);

export const isValidSaPhoneNumber = (value: unknown): boolean => {
  const phone = normaliseSaPhone(value);
  if (!SA_PHONE_PATTERN.test(phone)) return false;
  // Leading digit after the prefix: 1–8 are assigned ranges; 9 and 0 are not dialable SA numbers.
  const significant = phone.startsWith("+27") ? phone.slice(3) : phone.slice(1);
  return /^[1-8]/.test(significant);
};

/**
 * Street address: 8–500 characters, at least two words, at least one letter. Rejects "123",
 * "!!!!", and single-word fragments — the shapes that make a proof-of-residence review guess.
 * SA addresses include units, plot numbers and informal settlement descriptors, so requiring a
 * specific "number + street" pattern would reject real addresses; length + two words + a letter
 * is the strictest rule that does not.
 */
export const isValidStreetAddress = (value: unknown): boolean => {
  const address = String(value ?? "").trim();
  if (address.length < 8 || address.length > 500) return false;
  if (!/[A-Za-z]/.test(address)) return false;
  return address.split(/\s+/).length >= 2;
};

/** City / suburb name: 2–120 characters, must start with a letter, letters/digits/spaces/-/'/. allowed. */
export const isValidCityName = (value: unknown): boolean => {
  const city = String(value ?? "").trim();
  if (city.length < 2 || city.length > 120) return false;
  return /^[A-Za-z][A-Za-z0-9\s\-'.()]*$/.test(city);
};

/** South African postal code: exactly 4 digits, 0001–9999 (0000 is not allocated). */
export const isValidSaPostalCode = (value: unknown): boolean => {
  const code = String(value ?? "").trim();
  if (!/^\d{4}$/.test(code)) return false;
  return code !== "0000";
};

/**
 * Full name as it must appear on the applicant's ID document: 2–120 characters, letters
 * (including accented forms), spaces, hyphens and apostrophes only, and at least two words —
 * a first name and a surname, because the trust review compares this field against the ID
 * document and a single word cannot match a South African ID book or smart card.
 */
export const isValidFullName = (value: unknown): boolean => {
  const name = String(value ?? "").trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 120) return false;
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/.test(name)) return false;
  return name.split(" ").length >= 2;
};

/** Bank account number: 6–17 digits, digits only. */
export const isValidBankAccountNumber = (value: unknown): boolean => {
  const account = String(value ?? "").trim();
  return /^\d{6,17}$/.test(account);
};

/** South African branch code: exactly 6 digits (universal branch codes are 6 digits too). */
export const isValidSaBranchCode = (value: unknown): boolean => {
  const branch = String(value ?? "").trim();
  return /^\d{6}$/.test(branch);
};

/** Years of experience: a whole number from 0 to 60. An empty value is NOT zero — it is missing. */
export const isValidYearsExperience = (value: unknown): boolean => {
  if (typeof value === "string" && value.trim() === "") return false;
  const years = Number(value);
  return Number.isFinite(years) && Number.isInteger(years) && years >= 0 && years <= 60;
};

export type FieldFormatIssues = { field: string; message: string }[];

/**
 * Validate every formatted field of a Xooter application in one call. Returns one issue per
 * offending field, in form order, with the field key so the caller can focus the input.
 * All values are optional at the DRAFT stage — this function only reports on fields the
 * caller actually sent; emptiness is enforced separately at submit.
 */
export const validateXooterFieldFormats = (
  input: Partial<{
    full_name: unknown;
    email: unknown;
    phone: unknown;
    emergency_contact_phone: unknown;
    emergency_contact_name: unknown;
    address: unknown;
    city: unknown;
    postal_code: unknown;
    bank_account_number: unknown;
    bank_branch_code: unknown;
    bank_name: unknown;
    years_experience: unknown;
    reference_1_phone: unknown;
    reference_1_email: unknown;
    reference_2_phone: unknown;
    reference_2_email: unknown;
  }>,
): FieldFormatIssues => {
  const issues: FieldFormatIssues = [];
  const add = (field: string, message: string) => issues.push({ field, message });

  const present = (value: unknown) => String(value ?? "").trim() !== "";

  if (present(input.full_name) && !isValidFullName(input.full_name)) {
    add("full_name", "Enter your first and last name exactly as they appear on your ID.");
  }
  if (present(input.email) && !isValidEmailFormat(input.email)) {
    add("email", "Enter a valid email address, e.g. name@example.com.");
  }
  if (present(input.phone) && !isValidSaPhoneNumber(input.phone)) {
    add("phone", "Enter a valid South African phone number, e.g. 082 555 1234.");
  }
  if (present(input.emergency_contact_name) && !isValidFullName(input.emergency_contact_name)) {
    add("emergency_contact_name", "Enter your emergency contact's first and last name.");
  }
  if (present(input.emergency_contact_phone) && !isValidSaPhoneNumber(input.emergency_contact_phone)) {
    add("emergency_contact_phone", "Enter a valid South African phone number for your emergency contact.");
  }
  if (present(input.address) && !isValidStreetAddress(input.address)) {
    add("address", "Enter a complete street address (at least two words, e.g. 12 Oak Avenue).");
  }
  if (present(input.city) && !isValidCityName(input.city)) {
    add("city", "Enter a valid city or town name.");
  }
  if (present(input.postal_code) && !isValidSaPostalCode(input.postal_code)) {
    add("postal_code", "Enter a valid 4-digit South African postal code.");
  }
  if (present(input.bank_name) && String(input.bank_name).trim().length < 2) {
    add("bank_name", "Enter the name of your bank.");
  }
  if (present(input.bank_account_number) && !isValidBankAccountNumber(input.bank_account_number)) {
    add("bank_account_number", "Enter a valid bank account number (6–17 digits).");
  }
  if (present(input.bank_branch_code) && !isValidSaBranchCode(input.bank_branch_code)) {
    add("bank_branch_code", "Enter a valid 6-digit branch code.");
  }
  if (present(input.years_experience) && !isValidYearsExperience(input.years_experience)) {
    add("years_experience", "Years of experience must be a whole number between 0 and 60.");
  }
  if (present(input.reference_1_phone) && !isValidSaPhoneNumber(input.reference_1_phone)) {
    add("reference_1_phone", "Enter a valid South African phone number for Reference 1.");
  }
  if (present(input.reference_1_email) && !isValidEmailFormat(input.reference_1_email)) {
    add("reference_1_email", "Enter a valid email address for Reference 1.");
  }
  if (present(input.reference_2_phone) && !isValidSaPhoneNumber(input.reference_2_phone)) {
    add("reference_2_phone", "Enter a valid South African phone number for Reference 2.");
  }
  if (present(input.reference_2_email) && !isValidEmailFormat(input.reference_2_email)) {
    add("reference_2_email", "Enter a valid email address for Reference 2.");
  }

  return issues;
};
