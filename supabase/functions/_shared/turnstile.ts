type TurnstileValidation = {
  ok: boolean;
  required: boolean;
  configured: boolean;
  error?: string;
};

const siteverifyUrl = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export const getClientIp = (req: Request) =>
  req.headers.get("cf-connecting-ip") ??
  req.headers.get("x-real-ip") ??
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
  "";

export const verifyTurnstile = async ({
  token,
  remoteIp,
  required,
}: {
  token: unknown;
  remoteIp: string;
  required: boolean;
}): Promise<TurnstileValidation> => {
  const secret = Deno.env.get("CLOUDFLARE_TURNSTILE_SECRET_KEY")?.trim() ?? "";
  const response = typeof token === "string" ? token.trim() : "";

  if (!required && (!secret || !response)) {
    return { ok: true, required, configured: Boolean(secret) };
  }

  if (!secret) {
    return { ok: false, required, configured: false, error: "turnstile secret missing" };
  }

  if (!response) {
    return { ok: false, required, configured: true, error: "turnstile token required" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const verification = await fetch(siteverifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        secret,
        response,
        remoteip: remoteIp || undefined,
        idempotency_key: crypto.randomUUID(),
      }),
    });

    const payload = await verification.json().catch(() => null);
    return {
      ok: verification.ok && payload?.success === true,
      required,
      configured: true,
      error: payload?.["error-codes"]?.join(",") || (verification.ok ? undefined : `http_${verification.status}`),
    };
  } catch {
    return { ok: false, required, configured: true, error: "turnstile verification failed" };
  } finally {
    clearTimeout(timeout);
  }
};
