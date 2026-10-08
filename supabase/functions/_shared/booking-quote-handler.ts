import {
  BookingQuoteValidationError, fingerprintBookingQuote, parseBookingQuoteInput, quoteBooking,
  type BookingQuoteFacts,
} from "./booking-quote.ts";

type Dependencies = {
  isAllowedOrigin: (origin: string | null) => boolean;
  corsHeaders: (origin: string | null) => Record<string, string>;
  authenticate: (req: Request) => Promise<string | null>;
  consumeLimit: (buyerId: string) => Promise<boolean>;
  loadFacts: (buyerId: string, referralCode: string, nowMs: number) => Promise<BookingQuoteFacts>;
  now: () => number;
};
const maximumBodyBytes = 8192;

class RequestBodyError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

async function readInput(req: Request): Promise<unknown> {
  if (!req.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")) {
    throw new RequestBodyError(415, "Send booking details as JSON.");
  }
  if (!req.body) throw new RequestBodyError(400, "Add your booking details.");
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximumBodyBytes) {
        await reader.cancel();
        throw new RequestBodyError(413, "The booking details are too long.");
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { throw new RequestBodyError(400, "Check your booking details and try again."); }
}

/** Auth, limits and responses are exercised without starting an Edge server in the test suite. */
export async function handleBookingQuoteRequest(req: Request, deps: Dependencies): Promise<Response> {
  const origin = req.headers.get("Origin");
  const headers = { ...deps.corsHeaders(origin), "Content-Type": "application/json", "Cache-Control": "no-store" };
  const response = (status: number, data: Record<string, unknown>, extra: Record<string, string> = {}) =>
    new Response(JSON.stringify(data), { status, headers: { ...headers, ...extra } });
  if (!deps.isAllowedOrigin(origin)) return response(403, { success: false, error: "Origin not allowed." });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return response(405, { success: false, error: "Method not allowed." }, { Allow: "POST, OPTIONS" });
  try {
    const buyerId = await deps.authenticate(req);
    if (!buyerId) return response(401, { success: false, error: "Sign in to review your booking quote." });
    if (!(await deps.consumeLimit(buyerId))) return response(429, {
      success: false, code: "rate_limited", error: "Too many quote requests. Please try again shortly.",
    }, { "Retry-After": "300" });
    const nowMs = deps.now();
    const input = parseBookingQuoteInput(await readInput(req), nowMs);
    const facts = await deps.loadFacts(buyerId, input.referralCode, nowMs);
    // A dependency must never let facts from one session price another customer's booking.
    if (facts.buyerId !== buyerId) throw new Error("Quote account mismatch");
    const quote = quoteBooking(input, facts);
    const fingerprint = await fingerprintBookingQuote(quote, buyerId);
    return response(200, { success: true, data: {
      quote: { ...quote, fingerprint },
      // This read-only endpoint can ship before the atomic writer/crew lifecycle. It must
      // never tell a client to submit its new price through the legacy N-booking writer.
      bookingSubmissionAvailable: false,
    } });
  } catch (error) {
    if (error instanceof BookingQuoteValidationError) return response(400, {
      success: false, code: error.code, error: error.message, ...(error.field ? { field: error.field } : {}),
    });
    if (error instanceof RequestBodyError) return response(error.status, { success: false, error: error.message });
    // No account data, token, database diagnostic or raw request is logged or echoed.
    return response(503, { success: false, code: "quote_unavailable", error: "We could not verify your quote. Please try again." });
  }
}
