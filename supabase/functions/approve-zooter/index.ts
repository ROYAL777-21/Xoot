import {
  cleanId,
  cleanText,
  fail,
  handlePreflight,
  insertNotification,
  insertOutbox,
  ok,
  requireAdmin,
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
    const body = await req.json();
    const applicationId = cleanId(body.applicationId ?? body.application_id);
    if (!applicationId) return fail("application_id required", origin, 400);
    const reasonResult = requireAdminReason(body.reason, origin);
    if (reasonResult.response) return reasonResult.response;
    const reason = reasonResult.reason!;

    const { data: application } = await supa
      .from("zooter_applications")
      .select("*")
      .eq("id", applicationId)
      .maybeSingle();
    if (!application?.id) return fail("application not found", origin, 404);
    if (!application.user_id) return fail("application user link required before approval", origin, 409);

    const { data: documents } = await supa
      .from("zooter_documents")
      .select("id,doc_type,status")
      .eq("application_id", application.id);

    const missing = getMissingActivationItems(application, documents?.length ?? 0);
    if (missing.length) return fail("activation locked", origin, 409, { missing });

    await writeStrictAdminAuditLog(supa, {
      adminId: user.id,
      action: "approve_zooter",
      targetTable: "zooter_applications",
      targetId: application.id,
      changes: {
        from: { status: application.status },
        to: { status: "approved", assigned_role: "zooter" },
        service_category: getApplicationCategory(application),
        document_count: documents?.length ?? 0,
      },
      reason,
      ipAddress: req.headers.get("x-forwarded-for"),
    });

    const zooterPayload = {
      user_id: application.user_id,
      name: getApplicationName(application),
      role: getApplicationCategory(application),
      hourly_rate: 35,
      bio: cleanText(application.bio, 1000) || null,
      tags: ["Verified", "Background checked"],
      distance_mi: 1,
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

    const { data: existing } = await supa.from("zooters").select("id").eq("user_id", application.user_id).maybeSingle();
    let zooterId = existing?.id ?? null;
    if (existing?.id) {
      await supa.from("zooters").update(zooterPayload).eq("id", existing.id);
    } else {
      const { data: inserted, error: insertError } = await supa.from("zooters").insert(zooterPayload).select("id").single();
      if (insertError || !inserted?.id) throw new Error("zooter activation insert failed");
      zooterId = inserted.id;
    }

    await supa.from("zooter_applications").update({
      status: "approved",
      reviewer_notes: reason,
      activation_locked_reason: null,
      updated_at: new Date().toISOString(),
    }).eq("id", application.id);

    await supa.from("user_roles").upsert(
      { user_id: application.user_id, role: "zooter" },
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
      kind: "zooter_application_approved",
      title: "You are approved",
      body: "Your Xoot contractor profile is active. You can now receive eligible booking offers.",
      link: "/zooter",
    });
    await insertOutbox(supa, {
      source_table: "zooter_applications",
      source_id: application.id,
      event_type: "zooter_application_approved",
      channel: "brevo_email",
      owner: "Contractor Success Agent",
      stack_tool: "Brevo transactional email queue",
      payload: { application_id: application.id, zooter_id: zooterId },
      status: "queued",
      approval_required: false,
      created_by: user.id,
    });
    return ok({ application_id: application.id, zooter_id: zooterId, status: "approved" }, origin);
  } catch (error) {
    console.error("approve-zooter failed", error);
    return fail("zooter approval failed", origin, 500);
  }
});
