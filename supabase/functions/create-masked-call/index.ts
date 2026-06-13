import {
  assertBookingParticipant,
  cleanId,
  fail,
  handlePreflight,
  insertOutbox,
  ok,
  requireAuth,
  writeAuditLog,
} from "../_shared/action-utils.ts";

const activeCallStates = new Set(["enroute", "en_route", "arrived", "in_progress"]);

const basicAuth = (username: string, password: string) => `Basic ${btoa(`${username}:${password}`)}`;

const getUserPhone = async (supa: any, userId: string) => {
  const { data } = await supa.from("profiles").select("phone").eq("id", userId).maybeSingle();
  return data?.phone ?? null;
};

const createTwilioProxySession = async (bookingId: string, clientPhone: string, zooterPhone: string) => {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const apiKey = Deno.env.get("TWILIO_API_KEY_SID") ?? Deno.env.get("TWILIO_API_KEY");
  const apiSecret = Deno.env.get("TWILIO_API_KEY_SECRET");
  const proxyServiceSid = Deno.env.get("TWILIO_PROXY_SERVICE_SID");
  if (!accountSid || !apiKey || !apiSecret || !proxyServiceSid) return { configured: false };

  const sessionBody = new URLSearchParams({
    UniqueName: `booking-${bookingId}-${Date.now()}`,
    Ttl: "3600",
  });
  const sessionResponse = await fetch(`https://proxy.twilio.com/v1/Services/${proxyServiceSid}/Sessions`, {
    method: "POST",
    headers: {
      Authorization: basicAuth(apiKey, apiSecret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: sessionBody,
  });
  if (!sessionResponse.ok) throw new Error("Twilio proxy session create failed");
  const session = await sessionResponse.json();

  const createParticipant = async (identifier: string, friendlyName: string) => {
    const body = new URLSearchParams({ Identifier: identifier, FriendlyName: friendlyName });
    const response = await fetch(`https://proxy.twilio.com/v1/Services/${proxyServiceSid}/Sessions/${session.sid}/Participants`, {
      method: "POST",
      headers: {
        Authorization: basicAuth(apiKey, apiSecret),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    if (!response.ok) throw new Error("Twilio proxy participant create failed");
    return await response.json();
  };

  const client = await createParticipant(clientPhone, "client");
  const zooter = await createParticipant(zooterPhone, "zooter");
  return {
    configured: true,
    session_sid: session.sid,
    client_proxy_number: client.proxy_identifier ?? client.proxyIdentifier ?? null,
    zooter_proxy_number: zooter.proxy_identifier ?? zooter.proxyIdentifier ?? null,
  };
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
    const bookingId = cleanId(body.bookingId ?? body.booking_id);
    if (!bookingId) return fail("booking_id required", origin, 400);

    const { data: booking } = await supa
      .from("bookings")
      .select("id,user_id,zooter_id,status,scheduled_at,job_completed_at,cancelled_at")
      .eq("id", bookingId)
      .maybeSingle();
    if (!booking?.id) return fail("booking not found", origin, 404);

    const participant = await assertBookingParticipant(supa, booking, user.id);
    if (!participant.participant) return fail("booking access denied", origin, 403);
    if (!activeCallStates.has(String(booking.status)) || booking.cancelled_at) {
      return fail("masked calls are available during the active booking window", origin, 403);
    }
    if (!booking.zooter_id) return fail("booking has no assigned Zooter", origin, 409);

    const { data: zooter } = await supa.from("zooters").select("user_id").eq("id", booking.zooter_id).maybeSingle();
    if (!zooter?.user_id) return fail("assigned Zooter account not found", origin, 404);

    const clientPhone = await getUserPhone(supa, booking.user_id);
    const zooterPhone = await getUserPhone(supa, zooter.user_id);
    const calleeRole = participant.role === "contractor" ? "client" : "contractor";

    const { data: call, error: callError } = await supa.from("masked_call_sessions").insert({
      booking_id: booking.id,
      caller_id: user.id,
      callee_role: calleeRole,
      status: "queued",
    }).select("id").single();
    if (callError || !call?.id) throw new Error("masked call session insert failed");

    let providerStatus: Record<string, unknown> = { configured: false };
    if (clientPhone && zooterPhone) {
      providerStatus = await createTwilioProxySession(booking.id, clientPhone, zooterPhone);
    }

    if (providerStatus.configured) {
      await supa.from("masked_call_sessions").update({ status: "active", started_at: new Date().toISOString() }).eq("id", call.id);
    }

    await insertOutbox(supa, {
      source_table: "masked_call_sessions",
      source_id: call.id,
      event_type: "masked_voice_call_requested",
      channel: "twilio_voice",
      owner: "Customer Support Agent",
      stack_tool: "Twilio Proxy masked voice",
      payload: {
        booking_id: booking.id,
        callee_role: calleeRole,
        provider_status: providerStatus,
        missing_phone: !clientPhone || !zooterPhone,
      },
      status: providerStatus.configured ? "completed" : "needs_approval",
      approval_required: !providerStatus.configured,
      failure_mode: "Keep communication in chat if masked call setup fails.",
      created_by: user.id,
    });

    await writeAuditLog(supa, {
      actorId: user.id,
      action: "create_masked_call",
      targetTable: "masked_call_sessions",
      targetId: call.id,
      changes: { booking_id: booking.id, provider_configured: Boolean(providerStatus.configured) },
      reason: "Booking participant requested masked voice contact",
      ipAddress: req.headers.get("x-forwarded-for"),
    });

    return ok({
      call_session_id: call.id,
      status: providerStatus.configured ? "active" : "queued",
      provider_session_sid: providerStatus.session_sid ?? null,
      proxy_numbers: providerStatus.configured
        ? { client: providerStatus.client_proxy_number ?? null, zooter: providerStatus.zooter_proxy_number ?? null }
        : null,
    }, origin);
  } catch (error) {
    console.error("create-masked-call failed", error);
    return fail("masked call creation failed", origin, 500);
  }
});
