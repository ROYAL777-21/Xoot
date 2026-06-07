export type AuthMode = "signin" | "signup";
export type SocialAuthProvider = "google" | "apple";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_AUTH_REDIRECT = "/app";

export const normaliseEmail = (email: string) => email.trim().toLowerCase();
export const normaliseOtpCode = (code: string) => code.replace(/\D/g, "").slice(0, 6);

export const getEmailIssue = (email: string) => {
  const normalised = normaliseEmail(email);
  if (!normalised) return "Email is required.";
  if (!EMAIL_PATTERN.test(normalised)) return "Enter a valid email address.";
  return null;
};

export const getOtpCodeIssue = (code: string) => {
  const normalised = normaliseOtpCode(code);
  if (!normalised) return "Enter the 6-digit email code.";
  if (normalised.length !== 6) return "Enter all 6 digits from your email.";
  return null;
};

export const getFullNameIssue = (fullName: string) => {
  const name = fullName.trim();
  if (!name) return "Full name is required.";
  if (name.length < 2) return "Enter your full name.";
  return null;
};

export const getPasswordIssues = (password: string, mode: AuthMode) => {
  const issues: string[] = [];

  if (!password) return ["Password is required."];
  if (mode === "signin") return issues;

  if (password.length < 8) issues.push("Use at least 8 characters.");
  if (!/[a-z]/.test(password)) issues.push("Add a lowercase letter.");
  if (!/[A-Z]/.test(password)) issues.push("Add an uppercase letter.");
  if (!/\d/.test(password)) issues.push("Add a number.");
  if (/\s/.test(password)) issues.push("Remove spaces from your password.");

  return issues;
};

export const getPasswordStrength = (password: string) => {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^a-zA-Z0-9\s]/.test(password)) score += 1;
  return score;
};

export const getAuthFormIssue = ({
  mode,
  email,
  password,
  fullName,
}: {
  mode: AuthMode;
  email: string;
  password: string;
  fullName?: string;
}) => {
  const emailIssue = getEmailIssue(email);
  if (emailIssue) return emailIssue;

  if (mode === "signup") {
    const nameIssue = getFullNameIssue(fullName ?? "");
    if (nameIssue) return nameIssue;
  }

  const passwordIssues = getPasswordIssues(password, mode);
  if (passwordIssues.length > 0) return passwordIssues[0];

  return null;
};

export const getSafeRedirectPath = (value: string | null | undefined, fallback = DEFAULT_AUTH_REDIRECT) => {
  if (!value) return fallback;

  const trimmed = value.trim();
  if (!trimmed || trimmed.includes("\\") || trimmed.startsWith("//")) return fallback;

  try {
    const parsed = new URL(trimmed, "https://zoot.local");
    if (parsed.origin !== "https://zoot.local") return fallback;
    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    if (!path.startsWith("/") || path.startsWith("/auth")) return fallback;
    return path;
  } catch {
    return fallback;
  }
};

export const getAuthRedirectTo = (nextPath: string | null | undefined, callbackPath = "/auth/callback") => {
  const safePath = getSafeRedirectPath(nextPath);
  if (typeof window === "undefined") return `${callbackPath}?next=${encodeURIComponent(safePath)}`;
  return `${window.location.origin}${callbackPath}?next=${encodeURIComponent(safePath)}`;
};

export const getPasswordResetRedirectTo = () => {
  if (typeof window === "undefined") return "/auth/reset";
  return `${window.location.origin}/auth/reset`;
};

export const getPasswordUpdateIssue = (password: string, confirmation: string) => {
  const passwordIssue = getPasswordIssues(password, "signup")[0];
  if (passwordIssue) return passwordIssue;
  if (password !== confirmation) return "Passwords need to match.";
  return null;
};

export const getSafeAuthErrorMessage = (mode: AuthMode) => {
  if (mode === "signin") {
    return "We could not sign you in. Check your details or reset your password.";
  }

  return "We could not create that account. Check your details or sign in if you already have access.";
};

export const getSafeOtpSentMessage = () =>
  "If that email can access Zoot, we sent a one-time code or sign-in link.";

export const getSafeOtpErrorMessage = () =>
  "We could not verify that one-time code. Request a new code and try again.";

export const getSafePasswordResetMessage = () =>
  "If that email can access Zoot, we will send password reset instructions.";

export const getSafePasswordUpdateErrorMessage = () =>
  "We could not update your password. Request a new reset link and try again.";

export const getSafeOAuthErrorMessage = (provider: SocialAuthProvider) => {
  const label = provider === "google" ? "Google" : "Apple";
  return `We could not start ${label} sign-in. Check that this provider is enabled for Zoot and try again.`;
};