const encoder = new TextEncoder();

export type PaymentWebhookProvider = "stitch" | "ozow" | "internal";

export type PaymentWebhookSecrets = {
  stitch?: string | null;
  ozow?: string | null;
  internal?: string | null;
};

type PaymentWebhookAuthResult =
  | { ok: true; provider: PaymentWebhookProvider }
  | { ok: false; provider: null; reason: string };

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

const timingSafeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return result === 0;
};

const sign = async (rawBody: string, secret: string) => {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody)));
};

export const verifyPaymentWebhook = async (
  rawBody: string,
  headers: Headers,
  secrets: PaymentWebhookSecrets,
): Promise<PaymentWebhookAuthResult> => {
  const candidates = [
    {
      provider: "stitch" as const,
      signature: headers.get("x-stitch-signature"),
      secret: secrets.stitch?.trim(),
    },
    {
      provider: "ozow" as const,
      signature: headers.get("x-ozow-signature"),
      secret: secrets.ozow?.trim(),
    },
    {
      provider: "internal" as const,
      signature: headers.get("x-zoot-webhook-signature"),
      secret: secrets.internal?.trim(),
    },
  ].filter((candidate) => candidate.signature !== null);

  if (candidates.length === 0) {
    return { ok: false, provider: null, reason: "payment webhook signature missing" };
  }
  if (candidates.length !== 1) {
    return { ok: false, provider: null, reason: "ambiguous payment webhook signature headers" };
  }

  const candidate = candidates[0];
  if (!candidate.secret) {
    return { ok: false, provider: null, reason: `${candidate.provider} webhook secret is not configured` };
  }

  const expected = await sign(rawBody, candidate.secret);
  const supplied = candidate.signature?.replace(/^sha256=/i, "").trim().toLowerCase() ?? "";
  if (!timingSafeEqual(expected, supplied)) {
    return { ok: false, provider: null, reason: "payment webhook signature invalid" };
  }

  return { ok: true, provider: candidate.provider };
};
