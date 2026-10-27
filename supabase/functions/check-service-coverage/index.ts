import {
  cleanText, fail, getServiceClient, handlePreflight, ok, readJson, requireAuth,
} from "../_shared/action-utils.ts";
import { assessVerifiedCoverage } from "../_shared/verified-coverage.ts";

/**
 * JWT-only eligibility check. Anonymous requests cannot bill Mapbox; customer
 * strings and client coordinates never determine whether a zone is serviceable.
 */
Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  const preflight = handlePreflight(req, origin);
  if (preflight) return preflight;
  const auth = await requireAuth(req, origin);
  if (auth.response || !auth.user) return auth.response;

  const raw: unknown = await readJson(req, 2048);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return fail("invalid location check", origin, 400);
  }
  const body = raw as Record<string, unknown>;
  const address = cleanText(body.address, 200);
  const service = cleanText(body.service, 24);
  const result = await assessVerifiedCoverage({
    address, service, actorId: auth.user.id, db: getServiceClient(),
    token: Deno.env.get("MAPBOX_GEOCODING_TOKEN") ?? "",
  });

  const reply = result.state === "rate_limited"
    ? fail("Too many coverage checks. Try later.", origin, 429)
    : result.state === "unavailable"
      ? fail("Coverage confirmation is temporarily unavailable.", origin, 503)
      : ok(result, origin);
  reply.headers.set("Cache-Control", "private, no-store");
  return reply;
});
