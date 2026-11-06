import { describe, expect, it } from "vitest";

import {
  MAX_XOOTER_AGE,
  MIN_XOOTER_AGE,
  ageOn,
  latestAcceptableDob,
  normaliseIdNumber,
  normalisePhoneForComparison,
  parseSaIdNumber,
  saIdChecksumDigit,
  validateXooterIdentity,
  validateXooterReferences,
} from "./xooter-identity";

/**
 * The ID numbers below are documentary examples whose DHA check digits are published facts —
 * `8001015009087`, `8801235111088` and `9202204720083` are widely cited as valid SA IDs, and
 * their last digits (7, 8, 3) are what the Department of Home Affairs actually computed.
 *
 * They are pinned here on purpose. The first version of these tests generated "valid" IDs with
 * `saIdChecksumDigit` itself, so when that function inverted its Luhn parity the tests inverted
 * with it and stayed green while every real applicant was rejected. A test that derives its
 * expectation from the code under test cannot catch the code being wrong.
 */
const PINNED_VALID_IDS: { id: string; firstTwelve: string; checkDigit: number; dob: string }[] = [
  { id: "8001015009087", firstTwelve: "800101500908", checkDigit: 7, dob: "1980-01-01" },
  { id: "8801235111088", firstTwelve: "880123511108", checkDigit: 8, dob: "1988-01-23" },
  { id: "9202204720083", firstTwelve: "920220472008", checkDigit: 3, dob: "1992-02-20" },
  // Leap-day DOB: 29 February 2000 (year 00 → century 2000, which WAS a leap year).
  { id: "0002295009084", firstTwelve: "000229500908", checkDigit: 4, dob: "2000-02-29" },
];

/** The check digit the OLD, parity-inverted implementation computed for a real prefix. */
const INVERTED_CHECKSUM_ID = "8001015009083";

/** An 18th birthday exactly today: the boundary the age gate must allow. */
const dobExactlyEighteen = (now: Date) => {
  const date = new Date(now);
  date.setFullYear(date.getFullYear() - 18);
  return date.toISOString().slice(0, 10);
};

const dobSeventeen = (now: Date) => {
  const date = new Date(now);
  date.setFullYear(date.getFullYear() - 17);
  date.setMonth(date.getMonth() - 6);
  return date.toISOString().slice(0, 10);
};

describe("saIdChecksumDigit", () => {
  it("matches the published DHA check digits for documentary ID prefixes", () => {
    for (const sample of PINNED_VALID_IDS) {
      expect(saIdChecksumDigit(sample.firstTwelve)).toBe(sample.checkDigit);
    }
  });

  it("computes a digit in range and rejects non-12-digit input", () => {
    expect(saIdChecksumDigit("780123678901")).toBeTypeOf("number");
    expect(saIdChecksumDigit("780123678901")).toBeLessThan(10);
    expect(saIdChecksumDigit("12345")).toBeNull();
  });
});

describe("parseSaIdNumber", () => {
  it("accepts documentary SA IDs and returns their embedded dates of birth", () => {
    for (const sample of PINNED_VALID_IDS) {
      const result = parseSaIdNumber(sample.id);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.details.dateOfBirth).toBe(sample.dob);
    }
  });

  it("rejects the parity-inverted checksum the old implementation produced", () => {
    // `8001015009083` is what the inverted Luhn blessed; DHA's digit for that prefix is 7.
    expect(parseSaIdNumber(INVERTED_CHECKSUM_ID).ok).toBe(false);
  });

  it("rejects wrong length, non-digits, bad dates and bad checksums", () => {
    expect(parseSaIdNumber("80010150090871").ok).toBe(false); // too long
    expect(parseSaIdNumber("80010150090A7").ok).toBe(false); // non-digit
    expect(parseSaIdNumber("9913325009088").ok).toBe(false); // month 33
    const valid = PINNED_VALID_IDS[0];
    const badChecksum = `${valid.firstTwelve}${(valid.checkDigit + 1) % 10}`;
    expect(parseSaIdNumber(badChecksum).ok).toBe(false);
  });
});

describe("validateXooterIdentity", () => {
  it("rejects applicants under 18", () => {
    const now = new Date("2026-11-05T10:00:00");
    const issues = validateXooterIdentity({ dateOfBirth: dobSeventeen(now), idNumber: "A12345678" }, now);
    expect(issues.join(" ")).toContain(`${MIN_XOOTER_AGE}`);
  });

  it("accepts an 18-year-old born today", () => {
    const now = new Date("2026-11-05T10:00:00");
    const issues = validateXooterIdentity(
      { dateOfBirth: dobExactlyEighteen(now), idNumber: "A12345678" },
      now,
    );
    expect(issues).toEqual([]);
  });

  it("rejects implausibly old applicants", () => {
    const issues = validateXooterIdentity({ dateOfBirth: "1901-01-01", idNumber: "A12345678" });
    expect(issues.length).toBeGreaterThan(0);
    expect(MIN_XOOTER_AGE).toBe(18);
    expect(MAX_XOOTER_AGE).toBe(100);
  });

  it("flags an SA ID whose embedded DOB disagrees with the supplied DOB", () => {
    const { id, dob } = PINNED_VALID_IDS[1]; // embedded DOB 1988-01-23
    const issues = validateXooterIdentity({ dateOfBirth: "1988-01-24", idNumber: id });
    expect(issues.some((issue) => issue.includes("does not match"))).toBe(true);
  });

  it("accepts an SA ID whose embedded DOB matches, and a valid passport", () => {
    const { id, dob } = PINNED_VALID_IDS[1];
    expect(validateXooterIdentity({ dateOfBirth: dob, idNumber: id })).toEqual([]);
    expect(validateXooterIdentity({ dateOfBirth: "1988-01-23", idNumber: "A12345678" })).toEqual([]);
  });

  it("rejects malformed passports and missing IDs", () => {
    expect(validateXooterIdentity({ dateOfBirth: "1988-01-23", idNumber: "A1" }).length).toBe(1);
    expect(validateXooterIdentity({ dateOfBirth: "1988-01-23", idNumber: "" }).length).toBe(1);
  });

  it("normalises spaces and case before validating", () => {
    expect(normaliseIdNumber(" a12345678 ")).toBe("A12345678");
    expect(validateXooterIdentity({ dateOfBirth: "1988-01-23", idNumber: " a12345678 " })).toEqual([]);
  });

  it("rejects impossible calendar dates instead of letting them roll over", () => {
    // February 31st does not exist; `new Date("1990-02-31")` silently becomes March 3rd.
    expect(validateXooterIdentity({ dateOfBirth: "1990-02-31", idNumber: "A12345678" }).length).toBeGreaterThan(0);
    expect(ageOn("1990-02-31")).toBeNull();
    expect(ageOn("2001-04-31")).toBeNull();
    expect(ageOn("1999-13-01")).toBeNull();
    // Unpadded dates must fail the same way the server copy fails them.
    expect(ageOn("1999-3-5")).toBeNull();
    // A real leap day stays valid.
    expect(ageOn("2000-02-29")).toBeTypeOf("number");
  });
});

describe("ageOn", () => {
  it("handles birthdays before and after the reference date", () => {
    expect(ageOn("2000-05-14", new Date("2026-05-13T00:00:00"))).toBe(25);
    expect(ageOn("2000-05-14", new Date("2026-05-14T00:00:00"))).toBe(26);
    expect(ageOn("not-a-date")).toBeNull();
  });
});

describe("latestAcceptableDob", () => {
  it("is exactly 18 years before now", () => {
    const now = new Date("2026-11-05T10:00:00");
    expect(latestAcceptableDob(now).getFullYear()).toBe(2008);
  });
});

describe("validateXooterReferences", () => {
  const base = {
    applicantName: "Thandi Mokoena",
    applicantPhone: "+27 82 555 1234",
  };

  it("accepts two distinct external references", () => {
    expect(
      validateXooterReferences({
        ...base,
        references: [
          { label: "Reference 1", name: "Priya Naidoo", phone: "083 555 9876" },
          { label: "Reference 2", name: "John Sithole", phone: "+27 84 555 2222" },
        ],
      }),
    ).toEqual([]);
  });

  it("rejects the applicant listing themselves by phone", () => {
    const issues = validateXooterReferences({
      ...base,
      references: [
        { label: "Reference 1", name: "Thandi Mokoena", phone: "0825551234" },
        { label: "Reference 2", name: "John Sithole", phone: "+27 84 555 2222" },
      ],
    });
    expect(issues.some((issue) => issue.includes("cannot list yourself"))).toBe(true);
  });

  it("rejects the applicant listing themselves by name even with another phone", () => {
    const issues = validateXooterReferences({
      ...base,
      references: [
        { label: "Reference 1", name: "thandi mokoena", phone: "0835559876" },
        { label: "Reference 2", name: "John Sithole", phone: "+27 84 555 2222" },
      ],
    });
    expect(issues.some((issue) => issue.includes("cannot list yourself"))).toBe(true);
  });

  it("rejects the same person listed as both references", () => {
    const issues = validateXooterReferences({
      ...base,
      references: [
        { label: "Reference 1", name: "Priya Naidoo", phone: "083 555 9876" },
        { label: "Reference 2", name: "Priya N.", phone: "+27 83 555 9876" },
      ],
    });
    expect(issues.some((issue) => issue.includes("same person"))).toBe(true);
  });

  it("normalises phone formats before comparing", () => {
    expect(normalisePhoneForComparison("+27 82 555 1234")).toBe(normalisePhoneForComparison("0825551234"));
  });
});
