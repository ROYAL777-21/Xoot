/** Only the authenticated booking customer's latest, expiring Edge response is renderable. */
export type FreshJobPosition = { latitude: number; longitude: number; expiresAt: string };
export const MAX_FIX_AGE_MS = 60_000;

export function readFreshJobPosition(payload: unknown, now = Date.now()): FreshJobPosition | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const envelope = payload as { success?: unknown; data?: unknown };
  if (envelope.success !== true || !envelope.data || typeof envelope.data !== 'object' ||
      Array.isArray(envelope.data)) return null;
  const fix = envelope.data as Record<string, unknown>;
  if (fix.state !== 'current' || typeof fix.latitude !== 'number' ||
      typeof fix.longitude !== 'number' || !Number.isFinite(fix.latitude) ||
      !Number.isFinite(fix.longitude) || Math.abs(fix.latitude) > 90 ||
      Math.abs(fix.longitude) > 180 || typeof fix.recordedAt !== 'string' ||
      typeof fix.expiresAt !== 'string' || typeof fix.accuracyM !== 'number' ||
      !Number.isFinite(fix.accuracyM) || fix.accuracyM <= 0 || fix.accuracyM > 200) return null;
  const recorded = Date.parse(fix.recordedAt);
  const expires = Date.parse(fix.expiresAt);
  if (!Number.isFinite(recorded) || !Number.isFinite(expires) ||
      recorded > now + 30_000 || now - recorded > MAX_FIX_AGE_MS ||
      expires <= now || expires > recorded + 90_000) return null;
  return { latitude: fix.latitude, longitude: fix.longitude, expiresAt: fix.expiresAt };
}
