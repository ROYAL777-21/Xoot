import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:4173",
  "https://xoot.co.za",
  "https://www.xoot.co.za",
];

export const approvedLaunchRegions = [
  "midrand",
  "sandton",
  "bryanston",
  "bedfordview",
  "rosebank",
  "parkhurst",
  "melville",
  "fourways",
  "waterfall",
  "dainfern",
  "hyde park",
  "braamfontein",
];

export const getAllowedOrigins = () => {
  const configured = Deno.env.get("ALLOWED_ORIGINS")
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  // Staging hosts are deliberately NOT part of defaultAllowedOrigins: that
  // array drives the production ALLOWED_ORIGINS value and must remain production-only.
  // Accept additional staging browser origins on the staging Supabase project alone.
  const permitted = configured?.length ? configured : defaultAllowedOrigins;
  const isStaging = Deno.env.get("SUPABASE_URL") === "https://fxmxyabdjqviqbcxmvlp.supabase.co";
  return isStaging ? [...new Set([...permitted, "https://staging.xoot.co.za", "https://preview.xoot.co.za"])] : permitted;
};

export const getCorsHeaders = (origin: string | null) => {
  const allowedOrigins = getAllowedOrigins();
  const allowedOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-xoot-webhook-signature",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
};

export const isAllowedOrigin = (origin: string | null) => !origin || getAllowedOrigins().includes(origin);

export const json = (body: Record<string, unknown>, status: number, origin: string | null) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
  });

export const ok = (data: Record<string, unknown>, origin: string | null, status = 200) =>
  json({ success: true, data }, status, origin);

export const fail = (message: string, origin: string | null, status = 400, extra: Record<string, unknown> = {}) =>
  json({ success: false, error: message, ...extra }, status, origin);

export const handlePreflight = (req: Request, origin: string | null) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: getCorsHeaders(origin) });
  if (req.method !== "POST") return fail("method not allowed", origin, 405);
  if (!isAllowedOrigin(origin)) return fail("origin not allowed", origin, 403);
  return null;
};

const stripUnsafeText = (value: string) =>
  value
    .split("")
    .map((character) => {
      const code = character.charCodeAt(0);
      return code <= 31 || code === 127 || character === "<" || character === ">" || character === "`" || character === "\\"
        ? " "
        : character;
    })
    .join("");

export const cleanText = (value: unknown, maxLength = 500) =>
  typeof value === "string"
    ? stripUnsafeText(value).replace(/\s+/g, " ").trim().slice(0, maxLength)
    : "";

export const cleanId = (value: unknown) => cleanText(value, 80);

export const cleanArray = (value: unknown, maxItems = 12, maxLength = 80) =>
  Array.isArray(value)
    ? value.map((item) => cleanText(item, maxLength)).filter(Boolean).slice(0, maxItems)
    : [];

/** Browser-controlled request bodies must be bounded before JSON parsing. */
export const MAX_JSON_BODY_BYTES = 256 * 1024;
export const readJson = async (req: Request, maxBytes = MAX_JSON_BODY_BYTES) => {
  const declaredLength = Number(req.headers.get("content-length") ?? "");
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) return {};
  if (!req.body) return {};
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return {};
      }
      chunks.push(value);
    }
    const body = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder().decode(body));
  } catch {
    return {};
  } finally {
    reader.releaseLock();
  }
};

export const getServiceClient = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

export const getAuthUser = async (req: Request) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return { user: null, error: "authentication required" };

  const authClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data, error } = await authClient.auth.getUser();
  return { user: error ? null : data.user, error: error ? "authentication required" : null };
};

export const requireAuth = async (req: Request, origin: string | null) => {
  const { user, error } = await getAuthUser(req);
  if (!user) return { response: fail(error ?? "authentication required", origin, 401), user: null, supa: null };
  return { response: null, user, supa: getServiceClient() };
};

export const isAdminUser = async (supa: ReturnType<typeof getServiceClient>, userId: string) => {
  const { data } = await supa
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return Boolean(data?.id);
};

export const requireAdmin = async (supa: ReturnType<typeof getServiceClient>, userId: string, origin: string | null) => {
  if (await isAdminUser(supa, userId)) return null;
  return fail("admin role required", origin, 403);
};

export const isApprovedLaunchRegion = (input: string) => {
  const value = input.toLowerCase();
  return approvedLaunchRegions.some((region) => value.includes(region));
};

export const resolveLaunchRegion = (input: string) => {
  const value = input.toLowerCase();
  return approvedLaunchRegions.find((region) => value.includes(region)) ?? "";
};

export const getPriority = (text: string) => {
  const normalized = text.toLowerCase();
  if (normalized.includes("fraud") || normalized.includes("unsafe") || normalized.includes("threat")) return "urgent";
  if (normalized.includes("payment") || normalized.includes("refund") || normalized.includes("replacement") || normalized.includes("complaint")) return "high";
  if (normalized.includes("cancel") || normalized.includes("late") || normalized.includes("reschedule")) return "normal";
  return "low";
};

export const writeAuditLog = async (
  supa: ReturnType<typeof getServiceClient>,
  entry: {
    actorId: string;
    action: string;
    targetTable: string;
    targetId?: string | null;
    changes?: Record<string, unknown>;
    reason?: string | null;
    ipAddress?: string | null;
  },
) => {
  await supa.from("admin_audit_log").insert({
    admin_id: entry.actorId,
    action: cleanText(entry.action, 120),
    target_table: cleanText(entry.targetTable, 120),
    target_id: entry.targetId ?? null,
    changes: entry.changes ?? null,
    reason: entry.reason ?? null,
    ip_address: entry.ipAddress ?? null,
  });
};

export const insertNotification = async (
  supa: ReturnType<typeof getServiceClient>,
  payload: {
    userId: string;
    kind: string;
    title: string;
    body: string;
    link?: string | null;
  },
) => {
  await supa.from("notifications").insert({
    user_id: payload.userId,
    kind: cleanText(payload.kind, 80),
    title: cleanText(payload.title, 120),
    body: cleanText(payload.body, 500),
    link: payload.link ?? null,
  });
};

export const insertReviewQueue = async (
  supa: ReturnType<typeof getServiceClient>,
  payload: {
    queueType: string;
    subjectTable: string;
    subjectId?: string | null;
    userId?: string | null;
    xooterId?: string | null;
    bookingId?: string | null;
    priority?: string;
    summary: string;
  },
) => {
  await supa.from("admin_review_queue").insert({
    queue_type: payload.queueType,
    subject_table: payload.subjectTable,
    subject_id: payload.subjectId ?? null,
    user_id: payload.userId ?? null,
    xooter_id: payload.xooterId ?? null,
    booking_id: payload.bookingId ?? null,
    priority: payload.priority ?? "normal",
    summary: cleanText(payload.summary, 240),
  });
};

export const insertOutbox = async (
  supa: ReturnType<typeof getServiceClient>,
  rows: Record<string, unknown> | Record<string, unknown>[],
) => {
  await supa.from("integration_outbox").insert(Array.isArray(rows) ? rows : [rows]);
};

export const assertBookingParticipant = async (
  supa: ReturnType<typeof getServiceClient>,
  booking: Record<string, any>,
  userId: string,
) => {
  if (booking.user_id === userId) return { participant: true, role: "client" };
  if (booking.xooter_id) {
    const { data: xooter } = await supa
      .from("xooters")
      .select("id,user_id")
      .eq("id", booking.xooter_id)
      .maybeSingle();
    if (xooter?.user_id === userId) return { participant: true, role: "contractor" };
  }
  if (await isAdminUser(supa, userId)) return { participant: true, role: "admin" };
  return { participant: false, role: "none" };
};

export const toNumber = (value: unknown, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

export const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 864e5);
