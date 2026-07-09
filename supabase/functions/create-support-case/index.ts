import {
  assertBookingParticipant,
  cleanId,
  cleanText,
  fail,
  getPriority,
  handlePreflight,
  insertNotification,
  insertOutbox,
  insertReviewQueue,
  ok,
  requireAuth,
  writeAuditLog,
} from "../_shared/action-utils.ts";

const expectedResponseTime = (priority: string) => {
  if (priority === "urgent") return "Within 30 minutes";
  if (priority === "high") return "Within 4 business hours";
  if (priority === "normal") return "Within 1 business day";
  return "Within 2 business days";
};

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const preflight = handlePreflight(req, origin);
  if (preflight) return preflight;

  const auth = await requireAuth(req, origin);
  if (auth.response) return auth.response;
  const { user, supa } = auth as { user: any; supa: any };

  try {
    const body = await req.json();
    const bookingId = cleanId(body.bookingId ?? body.booking_id) || null;
    const category = cleanText(body.category, 80) || "general";
    const subject = cleanText(body.subject, 160) || `Support request: ${category}`;
    const description = cleanText(body.description ?? body.body, 2000);
    if (!description || description.length < 8) return fail("description required", origin, 400);

    let booking: any = null;
    if (bookingId) {
      const { data } = await supa
        .from("bookings")
        .select("id,user_id,zooter_id,status")
        .eq("id", bookingId)
        .maybeSingle();
      if (!data?.id) return fail("booking not found", origin, 404);
      const participant = await assertBookingParticipant(supa, data, user.id);
      if (participant.role !== "client" && participant.role !== "admin") return fail("booking access denied", origin, 403);
      booking = data;
    }

    const priority = getPriority(`${category} ${subject} ${description}`);
    const { data: ticket, error } = await supa.from("support_tickets").insert({
      user_id: user.id,
      subject,
      body: description,
      status: "open",
    }).select("id,status").single();
    if (error || !ticket?.id) throw new Error("support ticket insert failed");

    await supa.from("support_followups").insert({
      ticket_id: ticket.id,
      booking_id: booking?.id ?? null,
      user_id: user.id,
      trigger_type: "manual",
      priority,
      notes: subject,
    });

    await insertReviewQueue(supa, {
      queueType: "support",
      subjectTable: "support_tickets",
      subjectId: ticket.id,
      userId: user.id,
      zooterId: booking?.zooter_id ?? null,
      bookingId: booking?.id ?? null,
      priority,
      summary: subject,
    });

    await insertNotification(supa, {
      userId: user.id,
      kind: "support_case_created",
      title: "Support case opened",
      body: `We received your support request. Expected response: ${expectedResponseTime(priority)}.`,
      link: "/app/support",
    });

    await insertOutbox(supa, {
      source_table: "support_tickets",
      source_id: ticket.id,
      event_type: "support_opened",
      channel: "in_app",
      owner: "Customer Support Agent",
      stack_tool: "Zoot support queue",
      payload: { ticket_id: ticket.id, priority, category, booking_id: booking?.id ?? null },
      status: "queued",
      approval_required: false,
      created_by: user.id,
    });

    await writeAuditLog(supa, {
      actorId: user.id,
      action: "create_support_case",
      targetTable: "support_tickets",
      targetId: ticket.id,
      changes: { priority, category, booking_id: booking?.id ?? null },
      reason: "Client created support case through Edge Function",
      ipAddress: req.headers.get("x-forwarded-for"),
    });

    return ok({ case_id: ticket.id, status: ticket.status, priority, expected_response_time: expectedResponseTime(priority) }, origin);
  } catch (error) {
    console.error("create-support-case failed", error);
    return fail("support case creation failed", origin, 500);
  }
});
