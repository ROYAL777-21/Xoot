/**
 * Xooter identity validation — server-side half of `src/lib/xooter-identity.ts`.
 *
 * Same rules, mirrored into the Edge Function runtime because Edge Functions cannot import from
 * `src/`. The two files must change together: the client copy gives the applicant instant
 * feedback, this copy is the one that actually decides, because anything that runs in the
 * browser is UX rather than a control.
 *
 * Validated here, on submit only (drafts stay lenient so an applicant can save progress):
 *   1. age gate          — 18 to 100
 *   2. ID format         — 13-digit SA ID (checksum + embedded date) or passport 5–20 alphanumerics
 *   3. DOB correlation   — a 13-digit SA ID's encoded DOB must equal the supplied date of birth
 *
 * Reference checks that need the database (self-reference, duplicate reference, reference who is
 * an unverified Xoot applicant) live in `submit-xooter-application`, which has the service client.
 */

export const MIN_XOOTER_AGE = 18;
export const MAX_XOOTER_AGE = 100;

export const normaliseIdNumber = (value: unknown) =>
  String(value ?? "")
    .replace(/\s+/g, "")
    .toUpperCase()
    .slice(0, 24);

export const ageOn = (dateOfBirth: unknown, on = new Date()): number | null => {
  const value = String(dateOfBirth ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  /*
   * Calendar check: `new Date("1990-02-31T00:00:00")` rolls over to March 3rd instead of
   * producing Invalid Date, so an impossible DOB used to slip through as a shifted date.
   * Mirrors the client copy in `src/lib/xooter-identity.ts`.
   */
  const [year, month, day] = value.split("-").map(Number);
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  const dob = new Date(`${value}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return null;
  let age = on.getFullYear() - dob.getFullYear();
  const beforeBirthday =
    on.getMonth() < dob.getMonth() ||
    (on.getMonth() === dob.getMonth() && on.getDate() < dob.getDate());
  if (beforeBirthday) age -= 1;
  return age;
};

const isLeapYear = (year: number) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

const daysInMonth = (year: number, month: number) => {
  if (month < 1 || month > 12) return 0;
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [31, 0, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
};

const dobFromIdPrefix = (prefix: string, now = new Date()): string | null => {
  if (!/^\d{6}$/.test(prefix)) return null;
  const yy = Number(prefix.slice(0, 2));
  const mm = Number(prefix.slice(2, 4));
  const dd = Number(prefix.slice(4, 6));
  const century = yy > now.getUTCFullYear() % 100 ? 1900 : 2000;
  const year = century + yy;
  if (daysInMonth(year, mm) < dd || dd < 1) return null;
  return `${String(year).padStart(4, "0")}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
};

/**
 * Luhn check digit as the Department of Home Affairs computes it for the 13th digit.
 *
 * ⚠️ The doubling is on 1-BASED EVEN positions — 0-based ODD indices. The first version doubled
 * 0-based EVEN indices, which inverted the parity: every genuine DHA number failed while ~10% of
 * random 13-digit strings passed. Pinned documentary examples: `800101500908` → 7,
 * `880123511108` → 8, `920220472008` → 3. Must stay identical to `src/lib/xooter-identity.ts`.
 */
export const saIdChecksumDigit = (firstTwelveDigits: string): number | null => {
  if (!/^\d{12}$/.test(firstTwelveDigits)) return null;
  let sum = 0;
  for (let index = 0; index < 12; index += 1) {
    let digit = Number(firstTwelveDigits[index]);
    if (index % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return (10 - (sum % 10)) % 10;
};

export const parseSaIdNumber = (
  idNumber: string,
  now = new Date(),
): { ok: true; dateOfBirth: string } | { ok: false; reason: string } => {
  const value = normaliseIdNumber(idNumber);
  if (value.length !== 13) return { ok: false, reason: "sa_id_length" };
  if (!/^\d{13}$/.test(value)) return { ok: false, reason: "sa_id_characters" };
  const dob = dobFromIdPrefix(value.slice(0, 6), now);
  if (!dob) return { ok: false, reason: "sa_id_date" };
  if (value[10] !== "0" && value[10] !== "1") return { ok: false, reason: "sa_id_citizenship" };
  const expected = saIdChecksumDigit(value.slice(0, 12));
  if (expected === null || expected !== Number(value[12])) return { ok: false, reason: "sa_id_checksum" };
  return { ok: true, dateOfBirth: dob };
};

const PASSPORT_PATTERN = /^[A-Z0-9]{5,20}$/;

/**
 * Returns a list of rejection reasons; empty means acceptable. Reasons are machine codes the
 * caller maps onto a stable client message — the client cannot see Edge Function logs, so the
 * code is the contract.
 */
export const validateXooterIdentity = (
  input: { dateOfBirth: unknown; idNumber: unknown },
  now = new Date(),
): string[] => {
  const reasons: string[] = [];
  const dob = String(input.dateOfBirth ?? "").trim();
  const idNumber = normaliseIdNumber(input.idNumber);

  const age = ageOn(dob, now);
  if (!dob || age === null) reasons.push("date_of_birth_invalid");
  else if (age < MIN_XOOTER_AGE) reasons.push("under_18");
  else if (age > MAX_XOOTER_AGE) reasons.push("age_implausible");

  if (!idNumber) {
    reasons.push("id_number_required");
    return reasons;
  }

  if (/^\d+$/.test(idNumber) || idNumber.length === 13) {
    const parsed = parseSaIdNumber(idNumber, now);
    if (!parsed.ok) reasons.push(parsed.reason);
    else if (dob && age !== null && parsed.dateOfBirth !== dob) reasons.push("id_dob_mismatch");
    return reasons;
  }

  if (!PASSPORT_PATTERN.test(idNumber)) reasons.push("passport_invalid");
  return reasons;
};

/** Digits only, last 9 — matches "+27 82 555 1234" against "0825551234". */
export const normalisePhoneForComparison = (value: unknown) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length > 9 ? digits.slice(-9) : digits;
};

const normaliseNameForComparison = (value: unknown) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Database-free reference rules: no self-references (by phone or name), no duplicate reference.
 * Returns machine codes the caller maps onto client messages.
 */
export const validateReferenceShape = (input: {
  applicantName: unknown;
  applicantPhone: unknown;
  reference1Name: unknown;
  reference1Phone: unknown;
  reference2Name: unknown;
  reference2Phone: unknown;
}): string[] => {
  const reasons: string[] = [];
  const applicantPhone = normalisePhoneForComparison(input.applicantPhone);
  const applicantName = normaliseNameForComparison(input.applicantName);
  const references = [
    { label: "reference_1", name: input.reference1Name, phone: input.reference1Phone },
    { label: "reference_2", name: input.reference2Name, phone: input.reference2Phone },
  ];
  const seen = new Map<string, string>();

  for (const reference of references) {
    const phone = normalisePhoneForComparison(reference.phone);
    const name = normaliseNameForComparison(reference.name);
    if (phone && phone === applicantPhone) reasons.push(`${reference.label}_is_applicant_phone`);
    if (name && applicantName && name === applicantName) reasons.push(`${reference.label}_is_applicant_name`);
    const prior = seen.get(phone);
    if (phone && prior) reasons.push("references_duplicate");
    else if (phone) seen.set(phone, reference.label);
  }

  return reasons;
};
