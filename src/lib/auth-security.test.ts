import { describe, expect, it } from "vitest";
import {
  getAuthFormIssue,
  getAuthRedirectTo,
  getOtpCodeIssue,
  getPasswordIssues,
  getPasswordStrength,
  getPasswordUpdateIssue,
  getSafeAuthErrorMessage,
  getSafeOAuthErrorMessage,
  getSafeOtpErrorMessage,
  getSafeOtpSentMessage,
  getSafePasswordResetMessage,
  getSafeRedirectPath,
  normaliseEmail,
  normaliseOtpCode,
} from "./auth-security";

describe("auth security helpers", () => {
  it("normalises email before auth calls", () => {
    expect(normaliseEmail("  Test@Example.COM ")).toBe("test@example.com");
  });

  it("normalises pasted email OTP input", () => {
    expect(normaliseOtpCode(" 12 3-4a5b678 ")).toBe("123456");
  });

  it("validates six-digit email OTP codes", () => {
    expect(getOtpCodeIssue("")).toBe("Enter the 6-digit email code.");
    expect(getOtpCodeIssue("12345")).toBe("Enter all 6 digits from your email.");
    expect(getOtpCodeIssue("123456")).toBeNull();
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

  it("keeps post-auth redirects relative and outside auth routes", () => {
    expect(getSafeRedirectPath("/app/bookings?status=open")).toBe("/app/bookings?status=open");
    expect(getSafeRedirectPath("https://evil.example/app")).toBe("/app");
    expect(getSafeRedirectPath("//evil.example/app")).toBe("/app");
    expect(getSafeRedirectPath("/auth?next=/admin")).toBe("/app");
    expect(getSafeRedirectPath("/auth/reset?next=/app")).toBe("/app");
    expect(getAuthRedirectTo("/app/support", "/auth/callback")).toMatch(/\/auth\/callback\?next=%2Fapp%2Fsupport$/);
  });

  it("validates password update confirmation", () => {
    expect(getPasswordUpdateIssue("Short1", "Short1")).toBe("Use at least 8 characters.");
    expect(getPasswordUpdateIssue("StrongPass8", "DifferentPass8")).toBe("Passwords need to match.");
    expect(getPasswordUpdateIssue("StrongPass8", "StrongPass8")).toBeNull();
  });

  it("uses generic auth, OTP, and recovery errors to avoid account enumeration", () => {
    expect(getSafeAuthErrorMessage("signin")).not.toContain("email exists");
    expect(getSafeAuthErrorMessage("signup")).not.toContain("registered");
    expect(getSafeOtpSentMessage()).not.toContain("account exists");
    expect(getSafeOtpErrorMessage()).not.toContain("email exists");
    expect(getSafePasswordResetMessage()).not.toContain("account exists");
    expect(getSafeOAuthErrorMessage("google")).toContain("Google");
    expect(getSafeOAuthErrorMessage("apple")).toContain("Apple");
  });
});