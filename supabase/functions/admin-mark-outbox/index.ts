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
  const idResult = getRequiredId(body.outbox_id ?? body.outboxId, origin, "outbox_id");
  if (idResult.response) return idResult.response;
  const reasonResult = requireAdminReason(body.reason, origin);
  if (reasonResult.response) return reasonResult.response;

  try {
    const { data: outbox, error: outboxError } = await supa
      .from("integration_outbox")
      .select("id,status,event_type,channel,source_table,source_id")
      .eq("id", idResult.id)
      .maybeSingle();
    if (outboxError || !outbox?.id) return fail("outbox event not found", origin, 404);
    if (!["queued", "needs_approval", "processing"].includes(outbox.status)) {
      return fail("only queued, approval, or processing outbox events can be marked completed", origin, 409);
    }

    await writeStrictAdminAuditLog(supa, {
      adminId: user.id,
      action: "admin_mark_outbox_processed",
      targetTable: "integration_outbox",
      targetId: outbox.id,
      changes: {
        from: { status: outbox.status },
        to: { status: "completed" },
        event_type: outbox.event_type,
        channel: outbox.channel,
        source_table: outbox.source_table,
        source_id: outbox.source_id,
      },
      reason: reasonResult.reason!,
      ipAddress: req.headers.get("x-forwarded-for"),
    });

    const { data, error } = await supa
      .from("integration_outbox")
      .update({ status: "completed", processed_at: new Date().toISOString() })
      .eq("id", outbox.id)
      .select("id,status")
      .single();
    if (error || !data?.id) return fail("outbox update failed", origin, 400);

    return ok({ outbox_id: data.id, status: data.status }, origin);
  } catch (error) {
    console.error("admin-mark-outbox failed", error);
    return fail("admin outbox update failed", origin, 500);
  }
});
