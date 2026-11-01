import { fail, handlePreflight, requireAuth, requireAdmin } from "../_shared/action-utils.ts";

// Containment release: do not revive the former multi-request activation sequence.
// A future reviewed transaction must bind four distinct immutable, scanned and reviewed
// documents, current admin+AAL2, background/consent and canonical required training.
Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const preflight = handlePreflight(req, origin);
  if (preflight) return preflight;
  const auth = await requireAuth(req, origin);
  if (auth.response) return auth.response;
  const { user, supa } = auth;
  const adminError = await requireAdmin(supa!, user!.id, origin);
  if (adminError) return adminError;
  // Never write audit success, contractor activation, role grants, or approval notifications.
  return fail("Xooter activation is locked while document safety and authenticity checks are configured.", origin, 409, {
    code: "kyc_clearance_pending", missing: ["private_malware_scan","document_authenticity_review","atomic_mfa_approval"],
  });
});
