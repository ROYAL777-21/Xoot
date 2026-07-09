const windows: Map<string, number[]> = new Map();

export function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const requests = (windows.get(key) ?? []).filter((timestamp) => now - timestamp < windowMs);
  if (requests.length >= maxRequests) return false;
  requests.push(now);
  windows.set(key, requests);
  return true;
}

export function resetRateLimitsForTests() {
  windows.clear();
}
