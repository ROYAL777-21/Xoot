/**
 * Legacy booking writers cannot commit benefits and financial rows together.
 * Refuse before any side effect; never drop a requested benefit. Inspect both
 * aliases so a zero/empty first value cannot hide a second benefit request.
 */
export function hasUnsupportedLegacyBookingBenefits(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const body = value as Record<string, unknown>;
  for (const key of ["xootcredRedemption", "xootcred_redemption", "requestedCreditCents", "requested_credit_cents"]) {
    if (body[key] !== undefined && body[key] !== null && body[key] !== 0) return true;
  }
  for (const key of ["referralCode", "referral_code"]) {
    if (body[key] !== undefined && body[key] !== null
      && (typeof body[key] !== "string" || (body[key] as string).trim() !== "")) return true;
  }
  // The reviewed quote uses nested input. Do not mistake it for a supported
  // legacy request and silently lose its promised benefits.
  return body.input !== undefined && hasUnsupportedLegacyBookingBenefits(body.input);
}
