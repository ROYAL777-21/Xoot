import { describe, expect, it } from "vitest";

import {
  isValidBankAccountNumber,
  isValidCityName,
  isValidEmailFormat,
  isValidFullName,
  isValidSaBranchCode,
  isValidSaPhoneNumber,
  isValidSaPostalCode,
  isValidStreetAddress,
  isValidYearsExperience,
  validateXooterFieldFormats,
} from "./xooter-field-validation";

/**
 * Every rule here is the client half of a contract whose other half is
 * `supabase/functions/_shared/xooter-field-validation.ts`. These tests pin the behaviours the
 * Edge Function relies on: if one changes here without changing there, an applicant can be
 * told a field is fine in the form and then rejected at submit — or worse, the reverse.
 */

describe("isValidEmailFormat", () => {
  it("accepts ordinary addresses and plus-addressing", () => {
    expect(isValidEmailFormat("thandi.mokoena@example.co.za")).toBe(true);
    expect(isValidEmailFormat("t+work@gmail.com")).toBe(true);
    expect(isValidEmailFormat("  Thandi@Example.COM ")).toBe(true);
  });

  it("rejects the malformed shapes that used to reach the database", () => {
    expect(isValidEmailFormat("a@b")).toBe(false); // no TLD
    expect(isValidEmailFormat("a@b.c")).toBe(false); // 1-char TLD
    expect(isValidEmailFormat("a..b@example.com")).toBe(false); // consecutive dots
    expect(isValidEmailFormat("a b@example.com")).toBe(false); // space in local part
    expect(isValidEmailFormat("@example.com")).toBe(false);
    expect(isValidEmailFormat("a@")).toBe(false);
    expect(isValidEmailFormat("a@localhost")).toBe(false);
    expect(isValidEmailFormat("a@-example.com")).toBe(false);
    expect(isValidEmailFormat("")).toBe(false);
    expect(isValidEmailFormat(null)).toBe(false);
  });
});

describe("isValidSaPhoneNumber", () => {
  it("accepts SA mobile and landline numbers in national and international format", () => {
    expect(isValidSaPhoneNumber("082 555 1234")).toBe(true);
    expect(isValidSaPhoneNumber("+27 82 555 1234")).toBe(true);
    expect(isValidSaPhoneNumber("0825551234")).toBe(true);
    expect(isValidSaPhoneNumber("+27825551234")).toBe(true);
    expect(isValidSaPhoneNumber("011 555 1234")).toBe(true); // Johannesburg landline
    expect(isValidSaPhoneNumber("(031) 555-1234")).toBe(true); // Durban landline
  });

  it("rejects unassigned ranges, wrong lengths and junk", () => {
    expect(isValidSaPhoneNumber("0925551234")).toBe(false); // 09 is not dialable
    expect(isValidSaPhoneNumber("082555123")).toBe(false); // too short
    expect(isValidSaPhoneNumber("08255512345")).toBe(false); // too long
    expect(isValidSaPhoneNumber("1234567")).toBe(false);
    expect(isValidSaPhoneNumber(".......")).toBe(false); // passed the old looksLikePhone
    expect(isValidSaPhoneNumber("+447955123456")).toBe(false); // UK number
    expect(isValidSaPhoneNumber("")).toBe(false);
  });
});

describe("isValidStreetAddress", () => {
  it("accepts real street and plot addresses", () => {
    expect(isValidStreetAddress("12 Oak Avenue, Sandton")).toBe(true);
    expect(isValidStreetAddress("Plot 122, R512, Hartbeespoort")).toBe(true);
    expect(isValidStreetAddress("Unit 4, Hyde Park Corner, Jan Smuts Ave")).toBe(true);
  });

  it("rejects fragments and noise", () => {
    expect(isValidStreetAddress("123")).toBe(false);
    expect(isValidStreetAddress("!!!!")).toBe(false);
    expect(isValidStreetAddress("Sandton")).toBe(false); // a suburb is not an address
    expect(isValidStreetAddress("")).toBe(false);
  });
});

describe("isValidCityName", () => {
  it("accepts real town and city names", () => {
    expect(isValidCityName("Johannesburg")).toBe(true);
    expect(isValidCityName("Cape Town")).toBe(true);
    expect(isValidCityName("eMalahleni")).toBe(true);
  });

  it("rejects symbols and empty values", () => {
    expect(isValidCityName("JHB!!!")).toBe(false);
    expect(isValidCityName("123")).toBe(false);
    expect(isValidCityName("")).toBe(false);
  });
});

describe("isValidSaPostalCode", () => {
  it("accepts allocated 4-digit codes", () => {
    expect(isValidSaPostalCode("2000")).toBe(true);
    expect(isValidSaPostalCode("1685")).toBe(true);
    expect(isValidSaPostalCode(" 2196 ")).toBe(true);
  });

  it("rejects non-4-digit and unallocated codes", () => {
    expect(isValidSaPostalCode("219")).toBe(false);
    expect(isValidSaPostalCode("21960")).toBe(false);
    expect(isValidSaPostalCode("asdf")).toBe(false);
    expect(isValidSaPostalCode("0000")).toBe(false);
  });
});

describe("isValidFullName", () => {
  it("accepts first and last names incl. hyphens, apostrophes and accents", () => {
    expect(isValidFullName("Thandi Mokoena")).toBe(true);
    expect(isValidFullName("Jean-Pierre du Toit")).toBe(true);
    expect(isValidFullName("Nkosinathi Dlamini")).toBe(true);
    expect(isValidFullName("José O'Connell")).toBe(true);
  });

  it("rejects single names, symbols and digits", () => {
    expect(isValidFullName("Thandi")).toBe(false); // no surname to match against the ID
    expect(isValidFullName("Thandi 123")).toBe(false);
    expect(isValidFullName("!!!")).toBe(false);
    expect(isValidFullName("")).toBe(false);
  });
});

describe("banking formats", () => {
  it("accepts real account number lengths and 6-digit branch codes", () => {
    expect(isValidBankAccountNumber("1234567890")).toBe(true);
    expect(isValidBankAccountNumber("123456")).toBe(true);
    expect(isValidSaBranchCode("250655")).toBe(true); // FNB universal
    expect(isValidSaBranchCode("470010")).toBe(true); // Capitec universal
    expect(isValidSaBranchCode("051001")).toBe(true); // Standard Bank
  });

  it("rejects wrong shapes", () => {
    expect(isValidBankAccountNumber("12345")).toBe(false); // too short
    expect(isValidBankAccountNumber("123456789012345678")).toBe(false); // too long
    expect(isValidBankAccountNumber("12 34 56")).toBe(false); // spaces — the old check allowed 4–8 digits incl. "1234"
    expect(isValidSaBranchCode("1234")).toBe(false); // the old client check accepted this
    expect(isValidSaBranchCode("1234567")).toBe(false);
    expect(isValidSaBranchCode("abcdef")).toBe(false);
  });
});

describe("isValidYearsExperience", () => {
  it("accepts whole years 0–60 and rejects everything else", () => {
    expect(isValidYearsExperience("0")).toBe(true);
    expect(isValidYearsExperience("5")).toBe(true);
    expect(isValidYearsExperience(60)).toBe(true);
    expect(isValidYearsExperience("2.5")).toBe(false);
    expect(isValidYearsExperience("-1")).toBe(false);
    expect(isValidYearsExperience("61")).toBe(false);
    expect(isValidYearsExperience("abc")).toBe(false);
    expect(isValidYearsExperience("")).toBe(false);
  });
});

describe("validateXooterFieldFormats", () => {
  it("returns no issues for a well-formed application", () => {
    expect(
      validateXooterFieldFormats({
        full_name: "Thandi Mokoena",
        email: "thandi@example.co.za",
        phone: "082 555 1234",
        emergency_contact_name: "Nomsa Mokoena",
        emergency_contact_phone: "083 555 9876",
        address: "12 Oak Avenue, Sandton",
        city: "Johannesburg",
        postal_code: "2196",
        bank_name: "FNB",
        bank_account_number: "1234567890",
        bank_branch_code: "250655",
        years_experience: "6",
        reference_1_phone: "083 555 0000",
        reference_1_email: "priya@example.com",
        reference_2_phone: "084 555 2222",
        reference_2_email: "john@example.com",
      }),
    ).toEqual([]);
  });

  it("reports every malformed field, one issue each, with the field key", () => {
    const issues = validateXooterFieldFormats({
      email: "not-an-email",
      phone: "12345",
      postal_code: "abc",
      bank_branch_code: "1234",
      years_experience: "banana",
    });
    const fields = issues.map((issue) => issue.field);
    expect(fields).toEqual(["email", "phone", "postal_code", "bank_branch_code", "years_experience"]);
  });

  it("stays silent on empty values — presence is the required-fields check's job, and drafts must save", () => {
    expect(validateXooterFieldFormats({})).toEqual([]);
    expect(validateXooterFieldFormats({ email: "", phone: null })).toEqual([]);
  });
});
