import { fail, insertNotification, insertOutbox, ok } from "../_shared/action-utils.ts";
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
      .from("zooter_applications")
      .select("*")
      .eq("id", idResult.id)
      .maybeSingle();
    if (applicationError || !application?.id) return fail("application not found", origin, 404);
    if (application.status === "approved") return fail("approved applications cannot be rejected from this action", origin, 409);

    await writeStrictAdminAuditLog(supa, {
      adminId: user.id,
      action: "admin_reject_zooter",
      targetTable: "zooter_applications",
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
      .from("zooter_applications")
      .update({
        status: "rejected",
        reviewer_notes: reasonResult.reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", application.id)
      .select("id,status")
      .single();
    if (error || !data?.id) return fail("zooter rejection failed", origin, 400);

    await supa
      .from("admin_review_queue")
      .update({
        status: "resolved",
        resolution_notes: "Application rejected by admin",
        resolved_at: new Date().toISOString(),
      })
      .eq("subject_id", application.id)
      .eq("queue_type", "kyc");

    if (application.user_id) {
      await insertNotification(supa, {
        userId: application.user_id,
        kind: "zooter_application_rejected",
        title: "Application update",
        body: "Your Xoot contractor application needs attention. Open onboarding for the reviewer notes and next steps.",
        link: "/zooter/apply",
      });
    }

    await insertOutbox(supa, {
      source_table: "zooter_applications",
      source_id: application.id,
      event_type: "zooter_application_rejected",
      channel: "brevo_email",
      owner: "Contractor Success Agent",
      stack_tool: "Brevo transactional email queue",
      payload: { application_id: application.id, reason: reasonResult.reason! },
      status: "queued",
      approval_required: false,
      created_by: user.id,
    });

    return ok({ application_id: data.id, status: data.status }, origin);
  } catch (error) {
    console.error("admin-reject-zooter failed", error);
    return fail("admin zooter rejection failed", origin, 500);
  }
});
