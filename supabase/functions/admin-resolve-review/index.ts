import { cleanText, fail, ok } from "../_shared/action-utils.ts";
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
  const idResult = getRequiredId(body.review_id ?? body.reviewId, origin, "review_id");
  if (idResult.response) return idResult.response;

  const resolution = cleanText(body.resolution, 1200);
  if (resolution.length < 10) return fail("resolution must be at least 10 characters", origin, 400);

  const reasonResult = requireAdminReason(body.reason, origin);
  if (reasonResult.response) return reasonResult.response;

  try {
    const { data: review, error: reviewError } = await supa
      .from("admin_review_queue")
      .select("id,status,queue_type,subject_table,subject_id,priority")
      .eq("id", idResult.id)
      .maybeSingle();
    if (reviewError || !review?.id) return fail("review item not found", origin, 404);
    if (review.status !== "open" && review.status !== "in_review") {
      return fail("only open or in-review items can be resolved", origin, 409);
    }

    await writeStrictAdminAuditLog(supa, {
      adminId: user.id,
      action: "admin_resolve_review",
      targetTable: "admin_review_queue",
      targetId: review.id,
      changes: {
        from: { status: review.status },
        to: { status: "resolved", resolution_notes: resolution },
        queue_type: review.queue_type,
        subject_table: review.subject_table,
        subject_id: review.subject_id,
        priority: review.priority,
      },
      reason: reasonResult.reason!,
      ipAddress: req.headers.get("x-forwarded-for"),
    });

    const { data, error } = await supa
      .from("admin_review_queue")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
        resolution_notes: resolution,
      })
      .eq("id", review.id)
      .select("id,status")
      .single();
    if (error || !data?.id) return fail("review update failed", origin, 400);

    return ok({ review_id: data.id, status: data.status }, origin);
  } catch (error) {
    console.error("admin-resolve-review failed", error);
    return fail("admin review resolution failed", origin, 500);
  }
});

