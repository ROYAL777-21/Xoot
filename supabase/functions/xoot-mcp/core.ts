/**
 * Xoot's public, read-only MCP tools.
 *
 * No customer/contractor data, private address, availability, booking mutation, or payment
 * information is exposed through this surface. Base pricing comes directly from the
 * server-authoritative pricing ladder; only the signed-in Xoot app can issue a final quote.
 */
import { basePrice, BOOKING_FEE_CENTS, LADDERS } from "../_shared/pricing.ts";

type JsonObject = Record<string, unknown>;
type RpcId = string | number | null;
type RpcResponse = { jsonrpc: "2.0"; id: RpcId; result?: unknown; error?: { code: number; message: string } };
const SITE = "https://xoot.co.za";
const CURRENT_PROTOCOL = "2026-07-28";
const SUPPORTED_PROTOCOLS = new Set([CURRENT_PROTOCOL, "2025-06-18", "2025-03-26"]);

const isRecord = (value: unknown): value is JsonObject =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const success = (id: RpcId, result: unknown): RpcResponse => ({ jsonrpc: "2.0", id, result });
const failure = (id: RpcId, code: number, message: string): RpcResponse => ({
  jsonrpc: "2.0", id, error: { code, message },
});
const toolResult = (data: JsonObject, isError = false) => ({
  content: [{ type: "text", text: JSON.stringify(data) }],
  structuredContent: data,
  isError,
});
const EMPTY = { type: "object", properties: {}, additionalProperties: false } as const;
const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

export const XOOT_TOOLS = [
  {
    name: "get_xoot_overview",
    title: "About Xoot",
    description: "Explain Xoot's home-services marketplace, premium-but-accessible positioning, service area verification, and customer safety boundaries. Public information only.",
    annotations: READ_ONLY,
    inputSchema: EMPTY,
  },
  {
    name: "list_xoot_services",
    title: "Explore Xoot services",
    description: "List Xoot's advertised home and property cleaning services. This does not check service availability for an address or date.",
    annotations: READ_ONLY,
    inputSchema: EMPTY,
  },
  {
    name: "get_xoot_base_price",
    title: "Get an indicative Xoot base price",
    description: "Read the current server-authoritative base price for a service and a valid duration in hours. EXCLUDES fees, extras, crew, taxes where applicable and live booking constraints; NEVER describe this as a final quote.",
    annotations: READ_ONLY,
    inputSchema: {
      type: "object",
      properties: {
        service_type: {
          type: "string",
          enum: ["regular", "express", "office", "airbnb", "moving"],
          description: "Priced service type. Premium/deep residential services require confirmation of scope in the booking flow.",
        },
        hours: { type: "number", description: "Booked duration; must match the approved half-hour ladder for the service." },
      },
      required: ["service_type", "hours"],
      additionalProperties: false,
    },
  },
  {
    name: "get_xoot_booking_link",
    title: "Continue to Xoot booking",
    description: "Give the user a safe official link to sign in and check coverage, time-slot availability and final price inside Xoot. Does not create a booking.",
    annotations: READ_ONLY,
    inputSchema: EMPTY,
  },
] as const;

const services = [
  { id: "regular", name: "Residential cleaning", detail: "Regular home cleaning and one-off resets; the precise scope is selected in the Xoot app." },
  { id: "express", name: "Express cleaning", detail: "Short, focused cleaning sessions." },
  { id: "office", name: "Office and commercial cleaning", detail: "Cleaning for offices and smaller commercial spaces." },
  { id: "airbnb", name: "Airbnb turnovers", detail: "Guest changeovers and property cleaning for hosts." },
  { id: "moving", name: "Move-in and move-out cleaning", detail: "Cleaning around property moves and handovers." },
  { id: "regular", name: "Premium clean", detail: "Detailed home care; exact scope, duration and price must be checked in Xoot." },
];

export function handleMcpMessage(message: unknown): RpcResponse | null {
  if (!isRecord(message) || message.jsonrpc !== "2.0" || typeof message.method !== "string") {
    return failure(null, -32600, "Invalid JSON-RPC request");
  }
  // MCP notifications do not receive responses. No notifications trigger state changes.
  if (!Object.prototype.hasOwnProperty.call(message, "id")) return null;
  const id: RpcId = typeof message.id === "string" || typeof message.id === "number" ? message.id : null;
  const params = isRecord(message.params) ? message.params : {};
  switch (message.method) {
    case "initialize": {
      const requested = params.protocolVersion;
      const protocolVersion =
        typeof requested === "string" && SUPPORTED_PROTOCOLS.has(requested) ? requested : CURRENT_PROTOCOL;
      return success(id, {
        protocolVersion,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "xoot", title: "Xoot — home care", version: "0.1.0" },
        instructions:
          "Xoot is premium in service, not automatically expensive. Only share public service details. " +
          "A base price is not a final quote. Never claim availability, confirmed booking, " +
          "payment status, a specific Xooter or guarantees. Direct users to Xoot to check and book. " +
          "Never request passwords, OTPs, access codes, private addresses or payment information in chat.",
      });
    }
    case "ping": return success(id, {});
    case "tools/list": return success(id, { tools: XOOT_TOOLS });
    case "tools/call": {
      const name = params.name;
      const args = isRecord(params.arguments) ? params.arguments : {};
      if (typeof name !== "string" || !XOOT_TOOLS.some(t => t.name === name)) {
        return failure(id, -32602, "Unknown Xoot tool");
      }
      if (name === "get_xoot_overview") return success(id, toolResult({
        brand: "Xoot", tagline: "Your home. Handled.",
        description: "Xoot is a South African marketplace for managed home and property care using independent service providers called Xooters.",
        positioning: "Premium refers to the standard of care, booking clarity and support — it does not by itself mean a high price.",
        coverage: "Johannesburg-area launch coverage is subject to address validation inside the app.",
        caution: "Verification, booking availability and any final price require checks in Xoot. No safety outcome is guaranteed.",
        website: SITE, booking: SITE + "/auth",
      }));
      if (name === "list_xoot_services") return success(id, toolResult({
        services,
        note: "Advertised service categories, not live availability. The booking flow confirms area, scope and slots.",
        booking: SITE + "/auth",
      }));
      if (name === "get_xoot_booking_link") return success(id, toolResult({
        url: SITE + "/auth",
        website: SITE,
        steps: "Sign in, select your service and address, review available times and the final amount, then confirm through Xoot.",
        note: "No booking, slot hold, payment or quote has been created by this tool.",
      }));
      if (name === "get_xoot_base_price") {
        const service = args.service_type, hours = args.hours;
        if (typeof service !== "string" || !(service in LADDERS) ||
            typeof hours !== "number" || !Number.isFinite(hours)) {
          return success(id, toolResult({
            error: "Select a supported service_type and numeric hours from the approved pricing ladder.",
          }, true));
        }
        const price = basePrice(service, hours);
        if (!price.ok) {
          const options = LADDERS[service as keyof typeof LADDERS];
          return success(id, toolResult({
            error: "This service and duration combination is not on Xoot's approved price ladder.",
            allowedHours: Object.keys(options.ladder).map(Number),
            booking: SITE + "/auth",
          }, true));
        }
        return success(id, toolResult({
          currency: "ZAR", serviceType: service, hours: price.hours,
          basePriceCents: price.baseCents,
          nonMemberBookingFeeCents: BOOKING_FEE_CENTS,
          carePlusBookingFee: "Waived for eligible active Care+ members; membership is a separate paid product.",
          isFinalQuote: false,
          disclaimer: "This is a base rate, not a bookable quote. Total may vary with add-ons, number of Xooters, payment items and booking parameters. Confirm address, availability and final price within Xoot.",
          booking: SITE + "/auth",
        }));
      }
      return failure(id, -32601, "Method not found");
    }
    default: return failure(id, -32601, "Method not found");
  }
}
