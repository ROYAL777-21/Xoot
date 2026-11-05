/**
 * Turn a `supabase.functions.invoke` error into a message a human can act on.
 *
 * ── Why this exists ─────────────────────────────────────────────────────────────
 * When an Edge Function answers 4xx/5xx, supabase-js throws `FunctionsHttpError` whose `message`
 * is the same generic sentence for every failure: "Edge Function returned a non-2xx status code".
 * The function's actual explanation — "application is missing required fields", plus WHICH
 * fields — is in the JSON body of the response, attached as `error.context`.
 *
 * Nothing read it. Every failed submit therefore showed the founder a sentence that names no
 * problem and no field, and the real reason was only visible in server logs.
 */

type FunctionsErrorShape = {
  message?: string;
  context?: unknown;
};

type InvokeFailureBody = {
  success?: boolean;
  error?: string;
  missing?: unknown;
  reason?: string;
};

const isResponseLike = (value: unknown): value is { json: () => Promise<unknown>; text: () => Promise<string> } =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { json?: unknown }).json === "function" &&
  typeof (value as { text?: unknown }).text === "function";

const readBody = async (context: unknown): Promise<InvokeFailureBody | null> => {
  if (!isResponseLike(context)) return null;
  try {
    const parsed = await context.json();
    if (parsed && typeof parsed === "object") return parsed as InvokeFailureBody;
    return null;
  } catch {
    return null;
  }
};

const humaniseMissing = (missing: unknown): string => {
  if (!Array.isArray(missing) || missing.length === 0) return "";
  const fields = missing
    .map((item) => String(item).replace(/_/g, " "))
    .map((item) => (item.startsWith("document ") ? item : item.trim()))
    .join(", ");
  return ` Missing: ${fields}.`;
};

/**
 * Returns the most specific message available for a failed `supabase.functions.invoke`:
 * the function's own `error`/`reason` field, its `missing` list, or the original message.
 *
 * `error` may be anything (network failure,FunctionsHttpError, a thrown string) — anything this
 * cannot unpack falls back to a readable sentence rather than `"[object Object]"`.
 */
export const describeInvokeError = async (error: unknown): Promise<string> => {
  if (!error) return "Something went wrong. Please try again.";

  const body = await readBody((error as FunctionsErrorShape).context);

  if (body) {
    const detail = body.error ?? body.reason ?? null;
    const missing = humaniseMissing(body.missing);
    if (detail) return `${String(detail).trim()}${missing}`;
    if (missing) return `Some required information is still missing.${missing}`;
  }

  if (typeof error === "string") return error;
  const message = (error as FunctionsErrorShape).message;
  if (typeof message === "string" && message.trim()) return message;
  return "Something went wrong. Please try again.";
};
