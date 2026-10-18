/**
 * Remote Streamable HTTP MCP transport for public, read-only Xoot discovery.
 * The Supabase gateway JWT check is disabled for this function deliberately:
 * no customer data or state-changing tool is reachable here.
 * Apply upstream abuse protection/rate limiting before promoting publicly.
 */
import { handleMcpMessage } from "./core.ts";

const defaultOrigins = [
  "https://chatgpt.com", "https://chat.openai.com", "https://claude.ai",
  "https://xoot.co.za", "https://www.xoot.co.za", "https://staging.xoot.co.za",
  "http://localhost:5173", "http://127.0.0.1:5173",
];
const allowedOrigins = new Set([
  ...defaultOrigins,
  ...(Deno.env.get("XOOT_MCP_ALLOWED_ORIGINS") || "").split(",").map(x => x.trim()).filter(Boolean),
]);
const MAX_BYTES = 64 * 1024;

Deno.serve(async (request: Request): Promise<Response> => {
  const origin = request.headers.get("Origin");
  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Vary": "Origin",
    "Allow": "POST, OPTIONS",
  };

  // MCP Streamable HTTP requires Origin verification for DNS-rebinding protection.
  // Origin-less clients (server-to-server) are accepted; other origins must be allowed.
  if (origin && !allowedOrigins.has(origin)) {
    return new Response(JSON.stringify({ error: "Origin not allowed" }), { status: 403, headers });
  }
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] =
      "content-type, accept, mcp-protocol-version, authorization, x-client-info, apikey";
  }
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return new Response(JSON.stringify({ error: "POST required" }), { status: 405, headers });

  const byteLength = Number(request.headers.get("Content-Length") || "0");
  if (Number.isFinite(byteLength) && byteLength > MAX_BYTES) {
    return new Response(JSON.stringify({ error: "Request too large" }), { status: 413, headers });
  }

  let payload: unknown;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > MAX_BYTES) {
      return new Response(JSON.stringify({ error: "Request too large" }), { status: 413, headers });
    }
    payload = JSON.parse(raw);
  } catch {
    return new Response(JSON.stringify({
      jsonrpc: "2.0", id: null, error: { code: -32700, message: "Invalid JSON" },
    }), { status: 400, headers });
  }
  const result = handleMcpMessage(payload);
  if (result === null) return new Response(null, { status: 202, headers });
  return new Response(JSON.stringify(result), { status: 200, headers });
});
