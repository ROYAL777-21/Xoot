const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type UserRole = "user" | "zooter";

const escalationKeywords = [
  "refund",
  "billing",
  "payment",
  "charge",
  "complaint",
  "unsafe",
  "damage",
  "theft",
  "harassment",
  "no-show",
  "noshow",
  "replacement",
  "cancel",
  "cancellation",
  "gate code",
  "access code",
  "lockbox",
  "technical bug",
  "bug",
];

const includesAny = (text: string, terms: string[]) => terms.some((term) => text.includes(term));

const shouldEscalate = (text: string) => includesAny(text, escalationKeywords);

const buildResponse = (text: string, role: UserRole) => {
  if (text.includes("care+") || text.includes("care plus") || text.includes("membership")) {
    return "Care+ is R99/month and keeps your home remembered, protected, and ready. It includes Home Memory, Favourite Zooter rebooking, priority booking windows, priority replacement support, 1.5x ZootCred, a R30 monthly add-on credit, smart reminders, property profiles, and priority support.";
  }

  if (text.includes("zootcred") || text.includes("credit")) {
    return "ZootCred rewards completed bookings and can help reduce future booking costs where eligible. Care+ members earn 1.5x ZootCred on completed bookings and receive a R30 monthly add-on credit that must be used with a completed booking.";
  }

  if (text.includes("zooter") && (text.includes("favorite") || text.includes("favourite") || text.includes("book again"))) {
    return "You can save a preferred Zooter and rebook them from your Care+ experience using the Book Nomsa again pattern. Availability still depends on the Zooter's schedule, so support can help when plans need attention.";
  }

  if (text.includes("airbnb") || text.includes("landlord") || text.includes("property")) {
    return "Property Profiles help hosts and landlords save access notes, room priorities, turnover instructions, cleaning history, and favourite add-ons for each home. Keep lockbox and gate details inside the authenticated app rather than email or SMS.";
  }

  if (role === "zooter") {
    return "Thanks for contacting Zoot Support. We have noted your message and will route it to the right internal queue so a human reviewer can follow up in the app if needed.";
  }

  return "Thanks for contacting Zoot Support. We have noted your message and will route it to the right support queue for booking, Care+, trust, or account help.";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { subject, body, role } = await req.json();
    if (!subject || !body) {
      return new Response(JSON.stringify({ error: "subject and body required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userRole: UserRole = role === "zooter" ? "zooter" : "user";
    const text = `${subject} ${body}`.toLowerCase();
    const escalated = shouldEscalate(text);
    const response = escalated
      ? "I've flagged this to our human support team. They'll review it in the app and follow up through the right support queue."
      : buildResponse(text, userRole);

    return new Response(JSON.stringify({ response, escalated, source: "zoot_support_rules" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
