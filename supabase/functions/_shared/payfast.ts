/**
 * PayFast ITN (Instant Transaction Notification) verification.
 *
 * ── Why this is a module and not three lines in `confirm-payment` ──────────────────────────────
 * The provider this replaces was verified with ONE check: an HMAC in a request header. PayFast
 * works nothing like that, and treating the swap as a rename would have left an endpoint that
 * accepts unverified payment notifications — strictly worse than having no integration, because it
 * looks finished.
 *
 * PayFast POSTs `application/x-www-form-urlencoded` to the notify URL with the signature as a FIELD
 * IN THE BODY, not a header. Correct verification is four independent checks:
 *
 *   1. signature   — the sender knew the passphrase
 *   2. amount      — the notification matches the order we created
 *   3. validate    — PayFast itself confirms it sent this (server-to-server)
 *   4. source      — the request came from PayFast's infrastructure
 *
 * Check 3 is the authoritative one. A forged ITN can be signed only by someone holding the
 * passphrase, but check 3 defeats replay-from-elsewhere and any signature weakness, because it asks
 * PayFast directly. Check 4 is defence in depth — see the note on it below.
 *
 * ── What was verified, and what was not ────────────────────────────────────────────────────────
 * The signature rules below are from PayFast's published guidance (parameter order, encoding case,
 * the `+` for spaces, lowercase hex, passphrase appended). `developers.payfast.co.za` is blocked by
 * this environment's egress proxy, so **the source-IP list and the exact validate path could not be
 * read from the primary source**. That shaped the design rather than being papered over:
 *
 *   - the validate URL is configurable (`PAYFAST_VALIDATE_URL`) with a documented default
 *   - the source check is driven by a configurable host list and is **skipped with a log when
 *     unset**, rather than failing closed on a list nobody could confirm
 *
 * ⚠️ A hard-coded IP list written from memory would be worse than no list: it would look like a
 * control while silently rejecting real callbacks the day PayFast changes an address, and nobody
 * would connect the outage to this file.
 */

/** Sandbox and live share a shape; only the host differs. Both overridable by env. */
export const PAYFAST_PROCESS_URL_LIVE = "https://www.payfast.co.za/eng/process";
export const PAYFAST_PROCESS_URL_SANDBOX = "https://sandbox.payfast.co.za/eng/process";
export const PAYFAST_VALIDATE_URL_LIVE = "https://www.payfast.co.za/eng/query/validate";
export const PAYFAST_VALIDATE_URL_SANDBOX = "https://sandbox.payfast.co.za/eng/query/validate";

/** PayFast reports terminal state in `payment_status`. Only COMPLETE credits an order. */
export type PayFastStatus = "COMPLETE" | "FAILED" | "PENDING" | "CANCELLED" | "UNKNOWN";

export const normaliseStatus = (raw: unknown): PayFastStatus => {
  const value = String(raw ?? "").trim().toUpperCase();
  return value === "COMPLETE" || value === "FAILED" || value === "PENDING" || value === "CANCELLED"
    ? value
    : "UNKNOWN";
};

/**
 * PayFast's URL encoding is NOT `encodeURIComponent`, and the difference is the single most common
 * cause of a signature mismatch:
 *
 *   - spaces become `+`, not `%20`
 *   - hex digits are UPPERCASE (`%3A`, not `%3a`)
 *   - `encodeURIComponent` leaves `!'()*` unescaped; PHP's `urlencode`, which PayFast's own samples
 *     use, escapes them
 *
 * So this is written to match `urlencode`, not to match the JavaScript builtin.
 */
export const payfastUrlEncode = (value: string) =>
  encodeURIComponent(value)
    .replace(/%20/g, "+")
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%[0-9a-f]{2}/g, (m) => m.toUpperCase());

/**
 * Build the string that gets hashed.
 *
 * ⚠️ ORDER IS THE ORDER RECEIVED, NOT ALPHABETICAL. PayFast signs the fields in the sequence they
 * appear in the posted form, so re-sorting them — which any `Object.keys()` round trip is liable to
 * do — produces a valid-looking hash that never matches. `URLSearchParams` preserves insertion
 * order, which is why the raw body is parsed rather than an object.
 *
 * `signature` itself is excluded, and empty values are dropped: PayFast omits blank fields from the
 * string it signs.
 */
export const buildSignatureBase = (params: URLSearchParams, passphrase: string) => {
  const parts: string[] = [];
  for (const [key, value] of params) {
    if (key === "signature") continue;
    const trimmed = value.trim();
    if (trimmed === "") continue;
    parts.push(`${key}=${payfastUrlEncode(trimmed)}`);
  }
  let base = parts.join("&");
  if (passphrase.trim() !== "") base += `&passphrase=${payfastUrlEncode(passphrase.trim())}`;
  return base;
};

/**
 * MD5, lowercase hex.
 *
 * MD5 is PayFast's choice, not ours, and it is not a free variable — the hash has to match what
 * their servers compute. Its collision weakness is not exploitable here: an attacker would need a
 * preimage against a secret passphrase they do not hold, and check 3 (validate) is the control that
 * does not depend on the hash at all. Recorded so nobody "upgrades" this to SHA-256 and spends a day
 * on signature mismatches.
 *
 * Deno's WebCrypto does not implement MD5, so this is a compact local implementation.
 */
export const md5Hex = (input: string): string => {
  const bytes = new TextEncoder().encode(input);
  const withPadding = new Uint8Array((((bytes.length + 8) >> 6) + 1) << 6);
  withPadding.set(bytes);
  withPadding[bytes.length] = 0x80;
  const view = new DataView(withPadding.buffer);
  view.setUint32(withPadding.length - 8, bytes.length << 3, true);

  const K = new Int32Array(64);
  for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296);
  const S = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
  ];

  let [a0, b0, c0, d0] = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476];
  const rotl = (x: number, c: number) => (x << c) | (x >>> (32 - c));

  for (let chunk = 0; chunk < withPadding.length; chunk += 64) {
    const M: number[] = [];
    for (let i = 0; i < 16; i++) M.push(view.getUint32(chunk + i * 4, true));
    let [A, B, C, D] = [a0, b0, c0, d0];
    for (let i = 0; i < 64; i++) {
      let F: number, g: number;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      F = (F + A + K[i] + M[g]) | 0;
      A = D; D = C; C = B;
      B = (B + rotl(F, S[i])) | 0;
    }
    a0 = (a0 + A) | 0; b0 = (b0 + B) | 0; c0 = (c0 + C) | 0; d0 = (d0 + D) | 0;
  }

  return [a0, b0, c0, d0]
    .map((n) => new Uint8Array(new Int32Array([n]).buffer))
    .flatMap((b) => Array.from(b))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

/**
 * Length-independent, value-independent comparison.
 *
 * A signature check that returns early on the first differing character leaks, over many attempts,
 * how much of a guess was right. Both are hex of fixed length here so the exposure is small, but
 * "small" is not a reason to write the version that leaks.
 */
export const timingSafeEqual = (a: string, b: string) => {
  const left = a.trim().toLowerCase();
  const right = b.trim().toLowerCase();
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
};

export const verifySignature = (params: URLSearchParams, passphrase: string) => {
  const supplied = params.get("signature") ?? "";
  if (supplied.trim() === "") return { ok: false as const, reason: "signature field missing" };
  const expected = md5Hex(buildSignatureBase(params, passphrase));
  return timingSafeEqual(supplied, expected)
    ? { ok: true as const }
    : { ok: false as const, reason: "signature mismatch" };
};

/**
 * Amounts are compared in CENTS as integers.
 *
 * `amount_gross` arrives as a decimal string ("387.00"). Comparing it as a float invites the
 * classic 0.1 + 0.2 problem on a value that decides whether someone's booking is paid for, so it is
 * rounded to cents once and compared as an integer. One cent of tolerance is allowed for the
 * provider's own rounding and nothing more.
 */
export const amountMatches = (grossFromItn: unknown, expectedCents: number) => {
  const gross = Number.parseFloat(String(grossFromItn ?? ""));
  if (!Number.isFinite(gross)) return { ok: false as const, reason: "amount_gross is not a number" };
  const itnCents = Math.round(gross * 100);
  if (Math.abs(itnCents - expectedCents) > 1) {
    return { ok: false as const, reason: `amount mismatch: ITN ${itnCents}c, order ${expectedCents}c` };
  }
  return { ok: true as const };
};

/**
 * Ask PayFast whether it sent this. The authoritative check.
 *
 * The whole received body is posted back verbatim; PayFast answers with a body containing `VALID`
 * or `INVALID`. Anything else — a timeout, a 500, an unrecognised body — is treated as NOT valid,
 * because an integration that credits an order when its verifier is unreachable is an integration
 * that can be credited by taking the verifier offline.
 */
export const validateWithPayFast = async (
  rawBody: string,
  validateUrl: string,
  fetchImpl: typeof fetch = fetch,
) => {
  try {
    const res = await fetchImpl(validateUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: rawBody,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { ok: false as const, reason: `validate returned HTTP ${res.status}` };
    const text = (await res.text()).trim().toUpperCase();
    if (text.startsWith("VALID")) return { ok: true as const };
    return { ok: false as const, reason: `validate returned "${text.slice(0, 40)}"` };
  } catch (error) {
    return { ok: false as const, reason: `validate unreachable: ${(error as Error).message}` };
  }
};

/**
 * Source check — defence in depth, and deliberately NOT fail-closed when unconfigured.
 *
 * `PAYFAST_ALLOWED_IPS` is a comma-separated allowlist. When it is empty this returns `skipped`
 * rather than failing, and the caller logs that. The reasoning, which is the opposite of the usual
 * default and so worth stating:
 *
 *   - the list could not be read from PayFast's own documentation from this environment
 *   - a wrong list fails closed on GENUINE callbacks, which loses real payments silently
 *   - the validate call above already establishes authenticity, so this layer is additive
 *
 * Fail-closed is right for a control you can verify. For one you cannot, a loud skip beats a
 * confident guess.
 */
export const sourceAllowed = (requestIp: string | null, allowList: string) => {
  const allowed = allowList.split(",").map((s) => s.trim()).filter(Boolean);
  if (allowed.length === 0) return { ok: true as const, skipped: true as const };
  if (!requestIp) return { ok: false as const, skipped: false as const, reason: "no source IP on the request" };
  const ip = requestIp.split(",")[0].trim();
  return allowed.includes(ip)
    ? { ok: true as const, skipped: false as const }
    : { ok: false as const, skipped: false as const, reason: `source ${ip} not in PAYFAST_ALLOWED_IPS` };
};
