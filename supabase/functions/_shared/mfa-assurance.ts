/** Read only AFTER auth.getUser has verified this exact bearer. Decoding alone is not authentication. */
export function mfaSessionFromVerifiedBearer(authorization: string | null, verifiedUserId: string): string | null {
  if (!authorization?.startsWith("Bearer ")) return null;
  try {
    const parts = authorization.slice(7).split(".");
    if (parts.length !== 3) return null;
    const raw = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(atob(raw.padEnd(Math.ceil(raw.length / 4) * 4, "=")));
    return claims.sub === verifiedUserId && claims.aal === "aal2" && typeof claims.session_id === "string"
      && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(claims.session_id) ? claims.session_id : null;
  } catch { return null; }
}
