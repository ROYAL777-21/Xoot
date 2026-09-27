import { getAuthUser, getCorsHeaders, getServiceClient, isAllowedOrigin } from "../_shared/action-utils.ts";
import { consumeRateLimit } from "../_shared/governance-utils.ts";
import { loadBookingQuoteFacts } from "../_shared/booking-quote-facts.ts";
import { handleBookingQuoteRequest } from "../_shared/booking-quote-handler.ts";

Deno.serve((req: Request) => {
  const supa = getServiceClient();
  return handleBookingQuoteRequest(req, {
    isAllowedOrigin,
    corsHeaders: getCorsHeaders,
    authenticate: async (request) => (await getAuthUser(request)).user?.id ?? null,
    consumeLimit: async (buyerId) => (await consumeRateLimit(supa, {
      bucket: "booking_quote", actor: buyerId, action: "get_booking_quote", limitCount: 60, windowSeconds: 300,
    })).allowed,
    loadFacts: (buyerId, referralCode, nowMs) => loadBookingQuoteFacts(supa, buyerId, referralCode, nowMs),
    now: Date.now,
  });
});
