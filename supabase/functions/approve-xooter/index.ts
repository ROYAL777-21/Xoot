import {
  cleanId,
  cleanText,
  fail,
  handlePreflight,
  insertNotification,
  insertOutbox,
  ok,
  requireAdmin,
  readJson,
  requireAuth,
  toNumber,
} from "../_shared/action-utils.ts";
import { requireAdminReason, writeStrictAdminAuditLog } from "../_shared/admin-action-utils.ts";

const approvedValues = new Set(["approved", "verified", "cleared"]);

const isApproved = (value: unknown) => approvedValues.has(String(value ?? "").toLowerCase());

const getApplicationName = (application: any) =>
  cleanText(application.full_name ?? application.name, 160);

const getApplicationCategory = (application: any) =>
  cleanText(application.service_category, 80) || "cleaning";

const getMissingActivationItems = (application: any, documentCount: number) => {
  const missing: string[] = [];
  for (const field of [
    "id_verification_status",
    "selfie_verification_status",
    "address_verification_status",
    "banking_verification_status",
    "reference_verification_status",
    "third_party_verification_status",
  ]) {
    if (!isApproved(application[field])) missing.push(field);
  }
  if (!isApproved(application.background_check_status)) missing.push("background_check_status");
  if (documentCount < 4) missing.push("required_documents");
  if (!application.background_check_consent) missing.push("background_check_consent");
  if (!getApplicationName(application) || !application.phone || !application.suburb) missing.push("core_profile_fields");
  return missing;
};

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const preflight = handlePreflight(req, origin);
  if (preflight) return preflight;

  const auth = await requireAuth(req, origin);
  if (auth.response) return auth.response;
  const { user, supa } = auth as { user: any; supa: any };
  const adminError = await requireAdmin(supa, user.id, origin);
  if (adminError) return adminError;

  try {
    const body = await readJson(req);
    const applicationId = cleanId(body.applicationId ?? body.application_id);
    if (!applicationId) return fail("application_id required", origin, 400);
    const reasonResult = requireAdminReason(body.reason, origin);
    if (reasonResult.response) return reasonResult.response;
    const reason = reasonResult.reason!;

    const { data: application } = await supa
      .from("xooter_applications")
      .select("*")
      .eq("id", applicationId)
      .maybeSingle();
    if (!application?.id) return fail("application not found", origin, 404);
    if (!application.user_id) return fail("application user link required before approval", origin, 409);

    const { data: documents } = await supa
      .from("xooter_documents")
      .select("id,doc_type,status")
      .eq("application_id", application.id);

    const missing = getMissingActivationItems(application, documents?.length ?? 0);
    if (missing.length) return fail("activation locked", origin, 409, { missing });

    await writeStrictAdminAuditLog(supa, {
      adminId: user.id,
      action: "approve_xooter",
      targetTable: "xooter_applications",
      targetId: application.id,
      changes: {
        from: { status: application.status },
        to: { status: "approved", assigned_role: "xooter" },
        service_category: getApplicationCategory(application),
        document_count: documents?.length ?? 0,
      },
      reason,
      ipAddress: req.headers.get("x-forwarded-for"),
    });

    const xooterPayload = {
      user_id: application.user_id,
      name: getApplicationName(application),
      role: getApplicationCategory(application),
      hourly_rate: 35,
      bio: cleanText(application.bio, 1000) || null,
      tags: ["Verified", "Background checked"],
      /*
       * `distance_mi: 1` was here until 2026-08-12, and it was the last live trace of the fake
       * distance.
       *
       * The column is a static seed. It made every Xooter "1 away" from every customer in the
       * country, `ai-match` scored on it, and `XooterCard` rendered it as though it meant
       * something. Real distance now comes from `suburb_centroids` + `suburb_coverage` (below) via
       * `_shared/geo.ts`, and nothing reads `distance_mi` anywhere in the repo.
       *
       * Nothing reading it is not a reason to keep writing it — it is the reason to stop. A column
       * that nobody reads but something keeps filling is how a dead value comes back to life: the
       * next person to see it populated reasonably assumes it means something. Removing the write
       * is what makes the column provably vestigial and safe to drop.
       */
      active: true,
      background_check_status: "approved",
      reliability_score: 100,
      job_completion_rate: 100,
      years_experience: Math.max(0, toNumber(application.years_experience, 2)),
      suburb_coverage: [application.suburb, application.city].filter(Boolean),
      transport: cleanText(application.transport, 160) || "Transport confirmed",
      supplies_owned: Array.isArray(application.supplies_owned) ? application.supplies_owned : [],
      pet_comfort: cleanText(application.pet_comfort, 160) || "Pet comfort reviewed",
    };

    const { data: existing } = await supa.from("xooters").select("id").eq("user_id", application.user_id).maybeSingle();
    let xooterId = existing?.id ?? null;
    if (existing?.id) {
      await supa.from("xooters").update(xooterPayload).eq("id", existing.id);
    } else {
      const { data: inserted, error: insertError } = await supa.from("xooters").insert(xooterPayload).select("id").single();
      if (insertError || !inserted?.id) throw new Error("xooter activation insert failed");
      xooterId = inserted.id;
    }

    await supa.from("xooter_applications").update({
      status: "approved",
      reviewer_notes: reason,
      activation_locked_reason: null,
      updated_at: new Date().toISOString(),
    }).eq("id", application.id);

    await supa.from("user_roles").upsert(
      { user_id: application.user_id, role: "xooter" },
      { onConflict: "user_id,role" },
    );

    await supa
      .from("admin_review_queue")
      .update({
        status: "resolved",
        resolution_notes: "Application approved and activated",
        resolved_at: new Date().toISOString(),
      })
      .eq("subject_id", application.id)
      .eq("queue_type", "kyc");

    await insertNotification(supa, {
      userId: application.user_id,
      kind: "xooter_application_approved",
      title: "You are approved",
      body: "Your Xoot contractor profile is active. You can now receive eligible booking offers.",
      link: "/xooter",
    });
    await insertOutbox(supa, {
      source_table: "xooter_applications",
      source_id: application.id,
      event_type: "xooter_application_approved",
      channel: "brevo_email",
      owner: "Contractor Success Agent",
      stack_tool: "Brevo transactional email queue",
      payload: { application_id: application.id, xooter_id: xooterId },
      status: "queued",
      approval_required: false,
      created_by: user.id,
    });
    return ok({ application_id: application.id, xooter_id: xooterId, status: "approved" }, origin);
  } catch (error) {
    console.error("approve-xooter failed", error);
    return fail("xooter approval failed", origin, 500);
  }
});
