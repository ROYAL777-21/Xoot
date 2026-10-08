/** Match the configured web origin to the native environment; never fall back to production. */
export function nativeSplitInviteUrl(siteUrl: string, token: string): string | null {
  try {
    const unsafeCharacters = (text: string, threshold: number) => Array.from(text).some(character => character.charCodeAt(0) <= threshold || character.charCodeAt(0) === 127);
    if (!siteUrl || !token || unsafeCharacters(siteUrl, 32) || unsafeCharacters(token, 31)) return null;
    const site = new URL(siteUrl);
    if (site.username || site.password || site.search || site.hash || !['', '/'].includes(site.pathname)) return null;
    if (site.protocol !== 'https:' && !(site.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(site.hostname))) return null;
    return `${site.origin}/split/${encodeURIComponent(token)}`;
  } catch {
    return null;
  }
}
