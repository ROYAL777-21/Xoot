const ALLOWED_DOMAINS = [
  "supabase.co",
  "api.mapbox.com",
  "tiles.mapbox.com",
  "events.mapbox.com",
];

const privateRanges = [/^10\./, /^172\.(1[6-9]|2[0-9]|3[01])\./, /^192\.168\./];
const blockedHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1", "169.254.169.254"]);

export function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    if (blockedHosts.has(parsed.hostname)) return false;
    if (privateRanges.some((range) => range.test(parsed.hostname))) return false;

    return ALLOWED_DOMAINS.some((domain) => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

export async function safeFetch(url: string, options?: RequestInit): Promise<Response> {
  if (!isAllowedUrl(url)) throw new Error(`[Zoot] Blocked request to disallowed URL: ${url}`);
  return fetch(url, options);
}
