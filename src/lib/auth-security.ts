export type AuthMode = "signin" | "signup";
export type SocialAuthProvider = "google" | "apple";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_AUTH_REDIRECT = "/app";
const BLOCKED_REDIRECT_QUERY_KEYS = new Set([
  "access_token",
  "admin",
  "amount",
  "app_role",
  "callback",
  "code",
  "continue",
  "destination",
  "href",
  "id_token",
  "next",
  "payment_status",
  "payment_success",
  "price",
  "provider_token",
  "redirect",
  "redirect_to",
  "refresh_token",
  "return_to",
  "returnto",
  "role",
  "token",
  "url",
]);

const isUnsafeRedirectQuery = (params: URLSearchParams) => {
  for (const [rawKey, rawValue] of params.entries()) {
    const key = rawKey.trim().toLowerCase().replace(/-/g, "_");
    const value = rawValue.trim();
    if (BLOCKED_REDIRECT_QUERY_KEYS.has(key)) return true;
    if (!value) continue;
    if (value.includes("\\") || /[<>"'`]/.test(value)) return true;
    if (/(^|\/)(?:\.{2}|%2e%2e)(?:\/|$)/i.test(value)) return true;
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value)) return true;
  }

  return false;
};

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

const PASSWORD_LOWER = "abcdefghijkmnopqrstuvwxyz";
const PASSWORD_UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const PASSWORD_DIGITS = "23456789";
const PASSWORD_SYMBOLS = "!@#$%&*?";
const PASSWORD_ALPHABET = `${PASSWORD_LOWER}${PASSWORD_UPPER}${PASSWORD_DIGITS}${PASSWORD_SYMBOLS}`;

const randomIndex = (maxExclusive: number) => {
  const cryptoRef = globalThis.crypto;
  if (!cryptoRef?.getRandomValues) return Math.floor(Math.random() * maxExclusive);

  const maxUint32 = 0xffffffff;
  const limit = maxUint32 - (maxUint32 % maxExclusive);
  const values = new Uint32Array(1);

  do {
    cryptoRef.getRandomValues(values);
  } while (values[0] >= limit);

  return values[0] % maxExclusive;
};

const pick = (alphabet: string) => alphabet[randomIndex(alphabet.length)];

export const generateStrongPassword = (length = 18) => {
  const safeLength = Math.max(12, Math.min(length, 32));
  const characters = [
    pick(PASSWORD_LOWER),
    pick(PASSWORD_UPPER),
    pick(PASSWORD_DIGITS),
    pick(PASSWORD_SYMBOLS),
  ];

  while (characters.length < safeLength) {
    characters.push(pick(PASSWORD_ALPHABET));
  }

  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1);
    [characters[index], characters[swapIndex]] = [characters[swapIndex], characters[index]];
  }

  return characters.join("");
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
    if (isUnsafeRedirectQuery(parsed.searchParams)) return fallback;
    const path = `${parsed.pathname}${parsed.search}`;
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
  "If that email can access Xoot, we sent a one-time code or sign-in link.";

export const getSafeOtpErrorMessage = () =>
  "We could not verify that one-time code. Request a new code and try again.";

export const getSafePasswordResetMessage = () =>
  "If that email can access Xoot, we will send password reset instructions.";

export const getSafePasswordUpdateErrorMessage = () =>
  "We could not update your password. Request a new reset link and try again.";

export const getSafeOAuthErrorMessage = (provider: SocialAuthProvider) => {
  const label = provider === "google" ? "Google" : "Apple";
  return `We could not start ${label} sign-in. Check that this provider is enabled for Xoot and try again.`;
};
