import { describe, expect, it } from "vitest";
import {
  getAuthFormIssue,
  getPasswordIssues,
  getPasswordStrength,
  getSafeAuthErrorMessage,
  normaliseEmail,
} from "./auth-security";

describe("auth security helpers", () => {
  it("normalises email before auth calls", () => {
    expect(normaliseEmail("  Test@Example.COM ")).toBe("test@example.com");
  });

  it("requires stronger passwords for signup", () => {
    expect(getPasswordIssues("short", "signup")).toContain("Use at least 8 characters.");
    expect(getPasswordIssues("lowercase8", "signup")).toContain("Add an uppercase letter.");
    expect(getPasswordIssues("StrongPass8", "signup")).toEqual([]);
  });

  it("does not block existing users from signing in with legacy password lengths", () => {
    expect(getPasswordIssues("secret", "signin")).toEqual([]);
  });

  it("returns the first useful form issue", () => {
    expect(getAuthFormIssue({ mode: "signup", email: "bad", password: "StrongPass8", fullName: "Nomsa" })).toBe("Enter a valid email address.");
    expect(getAuthFormIssue({ mode: "signup", email: "n@example.com", password: "StrongPass8", fullName: "" })).toBe("Full name is required.");
  });

  it("scores password strength without exposing password content", () => {
    expect(getPasswordStrength("weak")).toBe(0);
    expect(getPasswordStrength("StrongPass8!")).toBe(4);
  });

  it("uses generic auth errors to avoid account enumeration", () => {
    expect(getSafeAuthErrorMessage("signin")).not.toContain("email exists");
    expect(getSafeAuthErrorMessage("signup")).not.toContain("registered");
  });
});
