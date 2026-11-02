import { fail, ok } from "../_shared/action-utils.ts";
import {
  getAdminActionContext,
  getRequiredId,
  requireAdminReason,
  writeStrictAdminAuditLog,
} from "../_shared/admin-action-utils.ts";

Deno.serve(async (req) => {
  const context = await getAdminActionContext(req);
  if (context.response) return context.response;

  const { body, origin, supa, user } = context;
  const idResult = getRequiredId(body.application_id ?? body.applicationId, origin, "application_id");
  if (idResult.response) return idResult.response;

  const reasonResult = requireAdminReason(body.reason, origin);
  if (reasonResult.response) return reasonResult.response;

  try {
    const { data: application, error: applicationError } = await supa
      .from("xooter_applications")
      .select("*")
      .eq("id", idResult.id)
      .maybeSingle();
    if (applicationError || !application?.id) return fail("application not found", origin, 404);
    if (application.status === "approved") return fail("approved applications cannot be rejected from this action", origin, 409);

    await writeStrictAdminAuditLog(supa, {
      adminId: user.id,
      action: "admin_reject_xooter",
      targetTable: "xooter_applications",
      targetId: application.id,
      changes: {
        from: { status: application.status },
        to: { status: "rejected", reviewer_notes: reasonResult.reason },
        service_category: application.service_category ?? "cleaning",
      },
      reason: reasonResult.reason!,
      ipAddress: req.headers.get("x-forwarded-for"),
    });

    const { data, error } = await supa
      .from("xooter_applications")
      .update({
        status: "rejected",
        reviewer_notes: reasonResult.reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", application.id)
      .select("id,status")
      .single();
    if (error || !data?.id) return fail("xooter rejection failed", origin, 400);

    await supa
      .from("admin_review_queue")
      .update({
        status: "resolved",
        resolution_notes: "Application rejected by admin",
        resolved_at: new Date().toISOString(),
      })
      .eq("subject_id", application.id)
      .eq("queue_type", "kyc");

    // The atomic application journey trigger owns the safe status notification/email receipt.
    // Private reviewer notes stay in the application and are never copied into email payloads.

    return ok({ application_id: data.id, status: data.status }, origin);
  } catch (error) {
    console.error("admin-reject-xooter failed", error);
    return fail("admin xooter rejection failed", origin, 500);
  }
});
