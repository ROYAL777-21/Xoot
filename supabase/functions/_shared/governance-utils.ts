const encoder = new TextEncoder();

type SupabaseServiceClient = any;

const cleanText = (value: unknown, maxLength = 500) =>
  typeof value === "string"
    ? value
        .replace(/\p{Cc}/gu, " ")
        .replace(/[<>`\\]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, maxLength)
    : "";

const sha256Hex = async (value: string) => {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
  return Array.from(digest)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const privateRpc = (supa: SupabaseServiceClient, fn: string, args: Record<string, unknown>) => {
  if (typeof supa.schema === "function") return supa.schema("private").rpc(fn, args);
  if (typeof supa.rpc === "function") return supa.rpc(fn, args);
  throw new Error("private RPC is unavailable");
};

export const getEdgeEnvironment = () =>
  cleanText(Deno.env.get("ZOOT_APP_ENV") ?? Deno.env.get("APP_ENV") ?? Deno.env.get("ENVIRONMENT") ?? "production", 40)
    .toLowerCase() || "production";

export const isOperationalControlEnabled = async (
  supa: SupabaseServiceClient,
  controlKey: string,
  environment = getEdgeEnvironment(),
) => {
  const environments = Array.from(new Set([environment, "all"]));
  const { data, error } = await supa
    .from("operational_controls")
    .select("control_key,environment,enabled,expires_at")
    .eq("control_key", controlKey)
    .in("environment", environments);

  if (error) throw new Error(`operational control lookup failed: ${error.message}`);

  const rows = Array.isArray(data) ? data : [];
  const row = rows.find((item) => item.environment === environment) ?? rows.find((item) => item.environment === "all");
  if (!row?.enabled) return false;
  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) return false;
  return true;
};

export const claimProviderEvent = async (
  supa: SupabaseServiceClient,
  input: {
    provider: string;
    eventId: string;
    eventType: string;
    rawPayload: string;
    subjectTable?: string | null;
    subjectId?: string | null;
    metadata?: Record<string, unknown>;
  },
) => {
  const payloadHash = await sha256Hex(input.rawPayload);
  const { data, error } = await privateRpc(supa, "claim_provider_event", {
    p_provider: cleanText(input.provider, 60),
    p_event_id: cleanText(input.eventId, 180),
    p_event_type: cleanText(input.eventType, 120),
    p_payload_hash: payloadHash,
    p_subject_table: input.subjectTable ? cleanText(input.subjectTable, 120) : null,
    p_subject_id: input.subjectId ?? null,
    p_metadata: input.metadata ?? {},
  });

  if (error) throw new Error(`provider event claim failed: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  return {
    providerEventId: typeof row?.provider_event_id === "string" ? row.provider_event_id : null,
    alreadySeen: Boolean(row?.already_seen),
    payloadHash,
  };
};

export const markProviderEventProcessed = async (
  supa: SupabaseServiceClient,
  providerEventId: string | null,
  status: "processing" | "processed" | "ignored" | "failed",
  errorMessage?: string | null,
) => {
  if (!providerEventId) return;
  const { error } = await privateRpc(supa, "mark_provider_event_processed", {
    p_provider_event_id: providerEventId,
    p_status: status,
    p_error_message: errorMessage ? cleanText(errorMessage, 500) : null,
  });
  if (error) throw new Error(`provider event status update failed: ${error.message}`);
};

export const consumeRateLimit = async (
  supa: SupabaseServiceClient,
  input: {
    bucket: string;
    actor: string;
    action: string;
    limitCount: number;
    windowSeconds: number;
  },
) => {
  const salt = Deno.env.get("ZOOT_RATE_LIMIT_HASH_SALT") ?? Deno.env.get("SUPABASE_URL") ?? "zoot";
  const actorHash = await sha256Hex(`${salt}:${input.actor}`);
  const { data, error } = await privateRpc(supa, "consume_rate_limit", {
    p_bucket: cleanText(input.bucket, 80),
    p_actor_hash: actorHash,
    p_action: cleanText(input.action, 80),
    p_limit_count: input.limitCount,
    p_window_seconds: input.windowSeconds,
  });

  if (error) throw new Error(`rate limit check failed: ${error.message}`);
  return { allowed: data === true, actorHash };
};
