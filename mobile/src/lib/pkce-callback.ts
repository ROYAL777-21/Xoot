/** Validates the callback destination and coalesces browser/deep-link delivery. */
export function createPkceCallbackConsumer(exchange: (code: string) => Promise<void>, now = Date.now) {
  const requests = new Map<string, { until: number | null; pending: Promise<true> }>();
  return async (url: string, expectedRedirect: string): Promise<true | null> => {
    let incoming: URL, expected: URL;
    try { incoming = new URL(url); expected = new URL(expectedRedirect); } catch { throw new Error('Invalid Xoot sign-in callback.'); }
    if (incoming.protocol !== expected.protocol || incoming.host !== expected.host || incoming.pathname !== expected.pathname || incoming.username || incoming.password) return null;
    if (incoming.hash || incoming.searchParams.has('access_token') || incoming.searchParams.has('refresh_token')) throw new Error('Start a new sign-in from Xoot to use a secure sign-in link.');
    if (incoming.searchParams.has('error') || incoming.searchParams.has('error_code')) throw new Error('Sign-in was not completed. Please try again from Xoot.');
    const codes = incoming.searchParams.getAll('code');
    if (codes.length !== 1 || !/^[A-Za-z0-9._~-]{10,2048}$/.test(codes[0])) throw new Error('Sign-in did not return a valid code. Please try again.');
    const code = codes[0];
    for (const [key, item] of requests) if (item.until !== null && item.until <= now()) requests.delete(key);
    const existing = requests.get(code); if (existing) return existing.pending;
    if (requests.size >= 16) throw new Error('Too many sign-in attempts. Please wait a moment.');
    const pending = Promise.resolve().then(() => exchange(code)).then(() => true as const);
    // Only completion is retained briefly, never the returned access/refresh tokens.
    // A slow exchange must stay coalesced; begin the retention window after it settles.
    const item = { until: null as number | null, pending };
    requests.set(code, item);
    void pending.then(() => { item.until = now() + 120_000; }, () => { item.until = now() + 120_000; });
    return pending;
  };
}
