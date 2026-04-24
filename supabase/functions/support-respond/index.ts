const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const KNOWLEDGE = `
ZOOT KNOWLEDGE BASE — answer ONLY from facts below.

# Pricing (South African Rand)
- On-demand cleaning hourly rate: R85–R145.
- Care+ subscription: R99/month. Includes 15% discount on every booking, priority booking, free replacement Zooter, gamified free cleans (5 successful referrals OR 10 reviews above 4/5 stars unlock a free clean).
- Permanent placements (separate from Care+): R399 non-refundable admin fee, then placement fee on hire (Housekeeper R1 249, Nanny R2 249, Elder Carer R2 249).
- Care+ daily-rate minimums (paid 100% to Candidate): R300 housekeeping, R400 nanny.
- Recommended market average per day: half-day R250–R300, full-day R300–R400. Enforced minimum: R220 (half) and R300 (full).

# Cancellation fees
- 10%: >24h notice + Zooter >5km away.
- 25%: <24h notice OR Zooter 2–5 km away.
- 40%: Zooter within 2 km and prepared.
- 50%: Zooter en route, arrived, or in progress.
- If Zooter cancels after acceptance: free replacement on us, plus email + in-app notification.
- Care+ subscription cancellation requires email confirmation (token link).

# Trust & Safety
- Every Zooter: ID verification, address verification, criminal background check, 2+ years cleaning experience.
- Booking insurance up to R75 000 per visit for accidental damage.

# zootCred referral program
- Refer a friend who completes their first booking → R150 zootCred.

# Services (cleaning only)
- Residential, Airbnb turnover, office/commercial, move-in/move-out deep cleans.
`;

const sysPrompt = (role: "user" | "zooter") => `You are Zoot Assistant — concise, polite, SA-based.
${role === "zooter" ? "You are answering a Zooter (cleaner)." : "You are answering a Zoot customer."}

RULES:
1. Use ONLY facts from the KNOWLEDGE BASE.
2. All prices in Rand (R). Never $.
3. 2–4 short sentences, plain English, no markdown.
4. Account/booking-specific issues (refunds, complaints, billing, technical bugs) — reply with the literal token [ESCALATE] on its own first line, then: "I've flagged this to our human support team — they'll reach you by email and in-app within 24 hours."

KNOWLEDGE BASE:
${KNOWLEDGE}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { subject, body, role } = await req.json();
    if (!subject || !body) return new Response(JSON.stringify({ error: "subject and body required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userRole: "user" | "zooter" = role === "zooter" ? "zooter" : "user";
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: sysPrompt(userRole) }, { role: "user", content: `Subject: ${subject}\n\n${body}` }],
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      const status = res.status === 429 || res.status === 402 ? res.status : 502;
      return new Response(JSON.stringify({ error: "AI request failed", detail: txt }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await res.json();
    let response: string = data.choices?.[0]?.message?.content ?? "Thanks — a human agent will follow up shortly.";
    let escalated = false;
    if (response.includes("[ESCALATE]")) { escalated = true; response = response.replace(/\[ESCALATE\]\s*/i, "").trim(); }
    return new Response(JSON.stringify({ response, escalated }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
