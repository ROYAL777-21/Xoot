/**
 * Xooter identity and reference validation — the meticulous-onboarding rules.
 *
 * ── Why this module exists ─────────────────────────────────────────────────────
 * The application form previously accepted any date of birth and any ID string. That let
 * under-18 applicants through to review, accepted mistyped ID numbers, and never checked that a
 * South African ID number's embedded date of birth agrees with the date of birth the applicant
 * typed. Every one of those is a trust-review defect the admin discovers late, after the
 * applicant has uploaded documents and waited.
 *
 * The rules are enforced in TWO places, deliberately: here (client, for immediate feedback) and
 * in `supabase/functions/_shared/xooter-identity.ts` (server, because client checks are UX, not
 * security). The two implementations must stay in sync — `src/lib/xooter-identity.test.ts` pins
 * the shared behaviours, and any change here must be mirrored there in the same commit.
 *
 * ── South African ID number format ─────────────────────────────────────────────
 * 13 digits: `YYMMDD G SSS C A Z`
 *   YYMMDD — date of birth (the check this module is named for)
 *   G      — gender digit (0–4 female, 5–9 male); not validated, not used
 *   SSS    — sequence; not validated
 *   C      — citizenship: 0 = SA citizen, 1 = permanent resident
 *   A      — usually 8 or 9 (a historical race indicator; DHA still emits 8/9, it is not enforced)
 *   Z      — Luhn check digit over the first 12 digits
 *
 * Non-SA documents are passports: alphanumeric, 5–20 characters. A passport carries no date of
 * birth, so the DOB-correlation check only applies to 13-digit SA IDs.
 */

export const MIN_XOOTER_AGE = 18;
export const MAX_XOOTER_AGE = 100;

/** Longest-lived applicant we will accept; DOBs before this are almost certainly typos. */
export const earliestAcceptableDob = (now = new Date()) => {
  const date = new Date(now);
  date.setFullYear(date.getFullYear() - MAX_XOOTER_AGE);
  return date;
};

/** Youngest acceptable DOB: the most recent date on which someone turned exactly 18. */
export const latestAcceptableDob = (now = new Date()) => {
  const date = new Date(now);
  date.setFullYear(date.getFullYear() - MIN_XOOTER_AGE);
  return date;
};

export const ageOn = (dateOfBirth: string, on = new Date()): number | null => {
  const dob = new Date(`${dateOfBirth}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return null;
  const reference = new Date(on);
  let age = reference.getFullYear() - dob.getFullYear();
  const beforeBirthday =
    reference.getMonth() < dob.getMonth() ||
    (reference.getMonth() === dob.getMonth() && reference.getDate() < dob.getDate());
  if (beforeBirthday) age -= 1;
  return age;
};

/** Uppercase, no spaces — the shape both the DB and reviewers expect. */
export const normaliseIdNumber = (value: unknown) =>
  String(value ?? "")
    .replace(/\s+/g, "")
    .toUpperCase()
    .slice(0, 24);

const isLeapYear = (year: number) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

const daysInMonth = (year: number, month: number) => {
  if (month < 1 || month > 12) return 0;
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [31, 0, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
};

/**
 * Build a full `YYYY-MM-DD` date from a 6-digit `YYMMDD` ID prefix.
 *
 * The century is not in the number. A "260214" prefix is 2026-02-14; a "990214" prefix is
 * 1999-02-14. The cutoff is: two-digit years above the current two-digit year belong to the
 * previous century. A living applicant cannot be born in the future, and a 100+ applicant is
 * rejected by the age gate anyway, so this rule cannot be talked into accepting a future DOB
 * without also failing the age check.
 */
const dobFromIdPrefix = (prefix: string, now = new Date()): string | null => {
  if (!/^\d{6}$/.test(prefix)) return null;
  const yy = Number(prefix.slice(0, 2));
  const mm = Number(prefix.slice(2, 4));
  const dd = Number(prefix.slice(4, 6));
  const currentTwoDigitYear = now.getUTCFullYear() % 100;
  const century = yy > currentTwoDigitYear ? 1900 : 2000;
  const year = century + yy;
  if (daysInMonth(year, mm) < dd || dd < 1) return null;
  return `${String(year).padStart(4, "0")}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
};

/** Luhn check digit as the Department of Home Affairs computes it for the 13th digit. */
export const saIdChecksumDigit = (firstTwelveDigits: string): number | null => {
  if (!/^\d{12}$/.test(firstTwelveDigits)) return null;
  let sum = 0;
  for (let index = 0; index < 12; index += 1) {
    let digit = Number(firstTwelveDigits[index]);
    if (index % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return (10 - (sum % 10)) % 10;
};

export type SaIdDetails = {
  kind: "sa_id";
  dateOfBirth: string;
  citizenship: "citizen" | "permanent_resident";
};

export type SaIdParseResult =
  | { ok: true; details: SaIdDetails }
  | { ok: false; reason: "length" | "characters" | "checksum" | "date" | "citizenship" };

/**
 * Validate a 13-digit South African ID number: shape, embedded date, citizenship digit and the
 * Luhn checksum. Returns the DOB encoded in the number so the caller can compare it with the
 * date of birth the applicant typed.
 */
export const parseSaIdNumber = (idNumber: string, now = new Date()): SaIdParseResult => {
  const value = normaliseIdNumber(idNumber);
  if (value.length !== 13) return { ok: false, reason: "length" };
  if (!/^\d{13}$/.test(value)) return { ok: false, reason: "characters" };

  const dob = dobFromIdPrefix(value.slice(0, 6), now);
  if (!dob) return { ok: false, reason: "date" };

  const citizenshipDigit = value[10];
  if (citizenshipDigit !== "0" && citizenshipDigit !== "1") return { ok: false, reason: "citizenship" };

  const expected = saIdChecksumDigit(value.slice(0, 12));
  if (expected === null || expected !== Number(value[12])) return { ok: false, reason: "checksum" };

  return {
    ok: true,
    details: {
      kind: "sa_id",
      dateOfBirth: dob,
      citizenship: citizenshipDigit === "0" ? "citizen" : "permanent_resident",
    },
  };
};

/** Passport numbers: 5–20 letters and digits. No DOB is embedded, so no correlation applies. */
const PASSPORT_PATTERN = /^[A-Z0-9]{5,20}$/;

export type IdentityIssue = string;

/**
 * Full identity check for a Xooter application: age gate, ID document format, and — when the ID
 * is a South African ID number — that the DOB it encodes matches the date of birth supplied.
 *
 * Returns a list of human-readable issues; empty means the identity data is acceptable.
 * Server-side enforcement lives in `submit-xooter-application` and uses the same rules.
 */
export const validateXooterIdentity = (
  input: { dateOfBirth: unknown; idNumber: unknown },
  now = new Date(),
): IdentityIssue[] => {
  const issues: IdentityIssue[] = [];
  const dob = String(input.dateOfBirth ?? "").trim();
  const idNumber = normaliseIdNumber(input.idNumber);

  if (!dob) {
    issues.push("Date of birth is required.");
  } else {
    const age = ageOn(dob, now);
    if (age === null) {
      issues.push("Enter a valid date of birth.");
    } else if (age < MIN_XOOTER_AGE) {
      issues.push(`Xooters must be ${MIN_XOOTER_AGE} or older to apply.`);
    } else if (age > MAX_XOOTER_AGE) {
      issues.push("Please check the date of birth entered.");
    }
  }

  if (!idNumber) {
    issues.push("ID or passport number is required.");
    return issues;
  }

  if (/^\d+$/.test(idNumber) || idNumber.length === 13) {
    // Claimed or shaped like an SA ID number — hold it to the full standard.
    const parsed = parseSaIdNumber(idNumber, now);
    if (!parsed.ok) {
      const reasons: Record<"length" | "characters" | "checksum" | "date" | "citizenship", string> = {
        length: "A South African ID number has 13 digits.",
        characters: "A South African ID number contains digits only.",
        checksum: "That ID number is not valid — check the digits carefully.",
        date: "The date of birth inside that ID number is not a real date.",
        citizenship: "That ID number is not valid — check the digits carefully.",
      };
      if ('reason' in parsed) { issues.push(reasons[parsed.reason]); }
    } else if (dob && ageOn(dob, now) !== null) {
      if (parsed.details.dateOfBirth !== dob) {
        issues.push(
          "The date of birth in your ID number does not match the date of birth you entered.",
        );
      }
    }
    return issues;
  }

  if (!PASSPORT_PATTERN.test(idNumber)) {
    issues.push("Enter a valid passport number (5–20 letters and digits, no spaces).");
  }

  return issues;
};

/** Normalise a phone number for comparison: digits only, last 9 digits (SA national number). */
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

export type ReferenceInput = { name: unknown; phone: unknown; label: string };

/**
 * Reference checks that need no database: an applicant cannot reference themselves, the same
 * person cannot be listed twice, and a reference cannot share the applicant's phone number.
 *
 * The platform-user check (a reference who is an unverified Xoot applicant) needs the database
 * and is enforced server-side in `submit-xooter-application`, alongside these rules.
 */
export const validateXooterReferences = (
  input: { applicantName: unknown; applicantPhone: unknown; references: ReferenceInput[] },
): IdentityIssue[] => {
  const issues: IdentityIssue[] = [];
  const applicantPhone = normalisePhoneForComparison(input.applicantPhone);
  const applicantName = normaliseNameForComparison(input.applicantName);
  const seen = new Map<string, string>();

  for (const reference of input.references) {
    const phone = normalisePhoneForComparison(reference.phone);
    const name = normaliseNameForComparison(reference.name);
    const label = reference.label;

    if (phone && phone.length < 9) {
      issues.push(`${label}: enter a valid South African phone number.`);
    }

    if (phone && phone === applicantPhone) {
      issues.push(`${label}: you cannot list yourself as a reference.`);
    }

    if (name && applicantName && name === applicantName) {
      issues.push(`${label}: you cannot list yourself as a reference.`);
    }

    const priorLabel = seen.get(phone);
    if (phone && priorLabel) {
      issues.push(`${label} and ${priorLabel} are the same person — list two different references.`);
    } else if (phone) {
      seen.set(phone, label);
    }
  }

  return issues;
};
