import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Creates (or re-uses) a Twilio Conversation for a booking's masked chat.
 *
 * RECOVERED FROM PRODUCTION 2026-08-02, where it ran with no source in this repository.
 * Committed verbatim so the fix reads as a diff.
 *
 * DEFECT — no participation check, the same as `twilio-token`. It confirms the caller has a
 * session, then creates a conversation for whatever `bookingId` it is given and returns the
 * conversation SID along with `client_identity` and `contractor_identity`.
 *
 * THESE TWO CHAIN. `twilio-conversation` hands any signed-in user the conversation SID and the
 * participant identities for any booking; `twilio-token` hands the same user a conversations
 * grant. Together that is read access to another household's booking chat, from an ordinary
 * account, once Twilio is enabled. Neither function is exploitable alone in an obvious way,
 * which is exactly why the pair is worth writing down.
 *
 * Fix both together, with the ownership pattern from `respond-zooter-job`: look the booking up,
 * confirm the caller is the customer or the assigned Xooter, and respond identically when they
 * are not.
 *
 * DEFECT — the catch returns `String(err)`, and `*` CORS on an endpoint returning identities.
 *
 * Not currently reachable: the Twilio controls are disabled (blocker.md). The unconfigured
 * path below is well behaved — it records a session, queues an approval-gated outbox event,
 * and tells the caller to stay on in-app chat. That part is worth keeping as written.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const requiredSecrets = ["TWILIO_ACCOUNT_SID", "TWILIO_API_KEY_SID", "TWILIO_API_KEY_SECRET", "TWILIO_CONVERSATIONS_SERVICE_SID"] as const;

const authHeader = () => {
  const key = `${Deno.env.get("TWILIO_API_KEY_SID")}:${Deno.env.get("TWILIO_API_KEY_SECRET")}`;
  return `Basic ${btoa(key)}`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const requestAuth = req.headers.get("authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: requestAuth } } },
    );
    const { data: { user }, error } = await supabase.auth.getUser(requestAuth.replace("Bearer ", ""));
    if (error || !user) {
      return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { bookingId } = await req.json();
    if (!bookingId) {
      return new Response(JSON.stringify({ error: "bookingId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const missing = requiredSecrets.filter((key) => !Deno.env.get(key));
    if (missing.length > 0) {
      const { data: session } = await supabase.from("masked_conversation_sessions").insert({
        booking_id: bookingId,
        requester_id: user.id,
        status: "setup_required",
        failure_reason: `Missing Twilio secrets: ${missing.join(", ")}`,
      }).select("id").single();

      await supabase.from("integration_outbox").insert({
        source_table: "masked_conversation_sessions",
        source_id: session?.id,
        event_type: "masked_conversation_requested",
        channel: "twilio_conversations",
        owner: "Customer Support Agent",
        stack_tool: "Twilio Conversations queue",
        payload: { booking_id: bookingId, configured: false },
        status: "needs_approval",
        approval_required: true,
        failure_mode: "Keep communication in Supabase in-app chat until Twilio Conversations is configured.",
        created_by: user.id,
      });

      return new Response(JSON.stringify({ configured: false, status: "setup_required", missing, sessionId: session?.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
    const serviceSid = Deno.env.get("TWILIO_CONVERSATIONS_SERVICE_SID")!;
    const url = `https://conversations.twilio.com/v1/Services/${serviceSid}/Conversations`;
    const form = new URLSearchParams({
      FriendlyName: `Zoot booking ${bookingId}`,
      UniqueName: `zoot-booking-${bookingId}`,
    });
    const twilioRes = await fetch(url, {
      method: "POST",
      headers: { Authorization: authHeader(), "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    const payload = await twilioRes.json();
    if (!twilioRes.ok && payload?.code !== 50353) {
      return new Response(JSON.stringify({ configured: true, error: payload }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const conversationSid = payload.sid;
    const { data: session } = await supabase.from("masked_conversation_sessions").insert({
      booking_id: bookingId,
      requester_id: user.id,
      status: "active",
      provider_conversation_sid: conversationSid,
      client_identity: `zoot_client_${bookingId}`,
      contractor_identity: `zoot_contractor_${bookingId}`,
      started_at: new Date().toISOString(),
    }).select("id").single();

    return new Response(JSON.stringify({ configured: true, status: "active", conversationSid, accountSid, sessionId: session?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
