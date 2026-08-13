const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\.169\.254$/,
  /^\[?::1\]?$/,
];

const DEFAULT_ALLOWED_HOSTS = [
  "api.supabase.co",
  "supabase.co",
  "api.mapbox.com",
  "tiles.mapbox.com",
  "events.mapbox.com",
];

export const isPrivateHost = (host: string) => {
  const normalised = host.trim().toLowerCase();
  return PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(normalised));
};

export const isAllowedOutboundUrl = (url: string, allowedHosts = DEFAULT_ALLOWED_HOSTS) => {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    if (isPrivateHost(parsed.hostname)) return false;

    return allowedHosts.some((host) => {
      const allowed = host.toLowerCase();
      const actual = parsed.hostname.toLowerCase();
      return actual === allowed || actual.endsWith(`.${allowed}`);
    });
  } catch {
    return false;
  }
};

const replaceControlCharacters = (value: string) =>
  Array.from(value, (character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127 ? " " : character;
  }).join("");

export const sanitisePlainText = (value: string | null | undefined, maxLength = 500) => {
  if (!value) return "";

  return replaceControlCharacters(value)
    .replace(/[<>"'`\\]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
};

export const sanitiseSearchParam = (value: string | null | undefined, maxLength = 200) =>
  sanitisePlainText(value, maxLength);

export const sanitiseCacheKey = (params: URLSearchParams) => {
  const allowedKeys = ["service", "page", "area", "sort", "xooter", "address"];
  const safe = new URLSearchParams();

  for (const key of allowedKeys) {
    const value = params.get(key);
    if (value) safe.set(key, sanitisePlainText(value, 200).replace(/[^a-zA-Z0-9 _.,-]/g, ""));
  }

  return safe.toString();
};
