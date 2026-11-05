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
 * `7801236789017`-style numbers below are synthetic: the DOB prefix decodes, the checksum is
 * computed by the same Luhn the module implements, and no real person is described. The one
 * documentary fact used is the format itself — 13 digits, embedded DOB, Luhn check digit.
 */
const withChecksum = (firstTwelve: string) => `${firstTwelve}${saIdChecksumDigit(firstTwelve)}`;

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
  it("computes the Luhn check digit over the first twelve digits", () => {
    expect(saIdChecksumDigit("780123678901")).toBeTypeOf("number");
    expect(saIdChecksumDigit("780123678901")).toBeLessThan(10);
    expect(saIdChecksumDigit("12345")).toBeNull();
  });
});

describe("parseSaIdNumber", () => {
  it("accepts a structurally valid SA ID and returns its embedded date of birth", () => {
    const id = withChecksum("991214500908");
    const result = parseSaIdNumber(id);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.details.dateOfBirth).toBe("1999-12-14");
  });

  it("rejects wrong length, non-digits, bad dates and bad checksums", () => {
    expect(parseSaIdNumber(withChecksum("991214500908").slice(0, 12)).ok).toBe(false);
    expect(parseSaIdNumber("99121450090A7").ok).toBe(false);
    expect(parseSaIdNumber(withChecksum("991332500908")).ok).toBe(false);
    const badChecksum = `${withChecksum("991214500908").slice(0, 12)}${
      (Number(withChecksum("991214500908")[12]) + 1) % 10
    }`;
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
    const id = withChecksum("991214500908"); // embedded DOB 1999-12-14
    const issues = validateXooterIdentity({ dateOfBirth: "1999-12-15", idNumber: id });
    expect(issues.some((issue) => issue.includes("does not match"))).toBe(true);
  });

  it("accepts an SA ID whose embedded DOB matches, and a valid passport", () => {
    const id = withChecksum("991214500908");
    expect(validateXooterIdentity({ dateOfBirth: "1999-12-14", idNumber: id })).toEqual([]);
    expect(validateXooterIdentity({ dateOfBirth: "1999-12-14", idNumber: "A12345678" })).toEqual([]);
  });

  it("rejects malformed passports and missing IDs", () => {
    expect(validateXooterIdentity({ dateOfBirth: "1999-12-14", idNumber: "A1" }).length).toBe(1);
    expect(validateXooterIdentity({ dateOfBirth: "1999-12-14", idNumber: "" }).length).toBe(1);
  });

  it("normalises spaces and case before validating", () => {
    expect(normaliseIdNumber(" a12345678 ")).toBe("A12345678");
    expect(validateXooterIdentity({ dateOfBirth: "1999-12-14", idNumber: " a12345678 " })).toEqual([]);
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
