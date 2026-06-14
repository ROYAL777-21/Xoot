import {
  cleanId,
  cleanText,
  fail,
  getServiceClient,
  handlePreflight,
  readJson,
  requireAdmin,
  requireAuth,
} from "./action-utils.ts";

export type AdminActionContext =
  | { response: Response; origin: string | null; user: null; supa: null; body: null }
  | { response: null; origin: string | null; user: any; supa: ReturnType<typeof getServiceClient>; body: Record<string, unknown> };

export const getAdminActionContext = async (req: Request): Promise<AdminActionContext> => {
  const origin = req.headers.get("Origin");
  const preflight = handlePreflight(req, origin);
  if (preflight) return { response: preflight, origin, user: null, supa: null, body: null };

  const auth = await requireAuth(req, origin);
  if (auth.response) return { response: auth.response, origin, user: null, supa: null, body: null };

  const { user, supa } = auth as { user: any; supa: ReturnType<typeof getServiceClient> };
  const adminError = await requireAdmin(supa, user.id, origin);
  if (adminError) return { response: adminError, origin, user: null, supa: null, body: null };

  const body = await readJson(req);
  return { response: null, origin, user, supa, body: body as Record<string, unknown> };
};

export const requireAdminReason = (value: unknown, origin: string | null, label = "reason") => {
  const reason = cleanText(value, 1200);
  if (reason.length < 10) {
    return { reason: null, response: fail(`${label} must be at least 10 characters`, origin, 400) };
  }
  return { reason, response: null };
};

export const getRequiredId = (value: unknown, origin: string | null, label: string) => {
  const id = cleanId(value);
  if (!id) return { id: null, response: fail(`${label} required`, origin, 400) };
  return { id, response: null };
};

export const writeStrictAdminAuditLog = async (
  supa: ReturnType<typeof getServiceClient>,
  entry: {
    adminId: string;
    action: string;
    targetTable: string;
    targetId?: string | null;
    changes?: Record<string, unknown>;
    reason: string;
    ipAddress?: string | null;
  },
) => {
  const { error } = await supa.from("admin_audit_log").insert({
    admin_id: entry.adminId,
    action: cleanText(entry.action, 120),
    target_table: cleanText(entry.targetTable, 120),
    target_id: entry.targetId ?? null,
    changes: entry.changes ?? null,
    reason: cleanText(entry.reason, 1200),
    ip_address: entry.ipAddress ?? null,
  });

  if (error) throw new Error(`admin audit log insert failed: ${error.message}`);
};

