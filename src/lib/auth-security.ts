export type AuthMode = "signin" | "signup";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normaliseEmail = (email: string) => email.trim().toLowerCase();

export const getEmailIssue = (email: string) => {
  const normalised = normaliseEmail(email);
  if (!normalised) return "Email is required.";
  if (!EMAIL_PATTERN.test(normalised)) return "Enter a valid email address.";
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

export const getSafeAuthErrorMessage = (mode: AuthMode) => {
  if (mode === "signin") {
    return "We could not sign you in. Check your details or reset your password.";
  }

  return "We could not create that account. Check your details or sign in if you already have access.";
};
