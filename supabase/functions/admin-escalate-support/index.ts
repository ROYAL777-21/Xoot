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
  const idResult = getRequiredId(body.ticket_id ?? body.ticketId, origin, "ticket_id");
  if (idResult.response) return idResult.response;

  const noteResult = requireAdminReason(body.escalation_note ?? body.reason, origin, "escalation_note");
  if (noteResult.response) return noteResult.response;

  try {
    const { data: ticket, error: ticketError } = await supa
      .from("support_tickets")
      .select("id,user_id,status,subject")
      .eq("id", idResult.id)
      .maybeSingle();
    if (ticketError || !ticket?.id) return fail("support ticket not found", origin, 404);

    await writeStrictAdminAuditLog(supa, {
      adminId: user.id,
      action: "admin_escalate_support",
      targetTable: "support_tickets",
      targetId: ticket.id,
      changes: {
        from: { status: ticket.status },
        to: { status: "escalated", support_followup: "open" },
        subject: ticket.subject,
      },
      reason: noteResult.reason!,
      ipAddress: req.headers.get("x-forwarded-for"),
    });

    const { data, error } = await supa
      .from("support_tickets")
      .update({ status: "escalated" })
      .eq("id", ticket.id)
      .select("id,status")
      .single();
    if (error || !data?.id) return fail("support ticket escalation failed", origin, 400);

    await supa.from("support_followups").insert({
      ticket_id: ticket.id,
      user_id: ticket.user_id,
      trigger_type: "manual",
      priority: "high",
      status: "open",
      notes: noteResult.reason!,
      due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    return ok({ ticket_id: data.id, status: data.status }, origin);
  } catch (error) {
    console.error("admin-escalate-support failed", error);
    return fail("admin support escalation failed", origin, 500);
  }
});
