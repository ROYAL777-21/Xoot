import { cleanText, fail, ok } from "../_shared/action-utils.ts";
import {
  getAdminActionContext,
  requireAdminReason,
  writeStrictAdminAuditLog,
} from "../_shared/admin-action-utils.ts";

const allowedEnvironments = new Set(["all", "development", "preview", "staging", "production"]);

const getRequestType = (controlType: string) => {
  if (controlType === "provider_gate") return "provider_activation";
  if (controlType === "release_gate") return "release_gate";
  if (controlType === "feature_flag" || controlType === "kill_switch") return "feature_flag";
  return "admin_action";
};

const getRiskLevel = (controlType: string, enabled: boolean) => {
  if (!enabled) return "medium";
  if (controlType === "provider_gate" || controlType === "release_gate") return "critical";
  if (controlType === "kill_switch") return "high";
  return "medium";
};

Deno.serve(async (req) => {
  const context = await getAdminActionContext(req);
  if (context.response) return context.response;

  const { body, origin, supa, user } = context;
  const controlKey = cleanText(body.control_key ?? body.controlKey, 120);
  const environment = cleanText(body.environment ?? "all", 40).toLowerCase();
  const enabled = body.enabled;
  const expiresAt = cleanText(body.expires_at ?? body.expiresAt, 80) || null;

  if (!controlKey) return fail("control_key required", origin, 400);
  if (!allowedEnvironments.has(environment)) return fail("environment is not allowed", origin, 400);
  if (typeof enabled !== "boolean") return fail("enabled boolean required", origin, 400);

  const reasonResult = requireAdminReason(body.reason, origin);
  if (reasonResult.response) return reasonResult.response;

  try {
    const { data: control, error: controlError } = await supa
      .from("operational_controls")
      .select("id,control_key,control_type,environment,enabled,description,owner,metadata")
      .eq("control_key", controlKey)
      .eq("environment", environment)
      .maybeSingle();

    if (controlError || !control?.id) return fail("operational control not found", origin, 404);

    const { data: approval, error: approvalError } = await supa
      .from("approval_requests")
      .insert({
        request_type: getRequestType(control.control_type),
        status: "approved",
        title: `${enabled ? "Enable" : "Disable"} ${control.control_key} (${control.environment})`,
        reason: reasonResult.reason,
        requested_by: user.id,
        decided_by: user.id,
        decided_at: new Date().toISOString(),
        target_table: "operational_controls",
        target_id: control.id,
        control_key: control.control_key,
        risk_level: getRiskLevel(control.control_type, enabled),
        evidence: {
          previous_enabled: control.enabled,
          next_enabled: enabled,
          environment: control.environment,
          owner: control.owner,
        },
      })
      .select("id")
      .single();

    if (approvalError || !approval?.id) return fail("approval request insert failed", origin, 400);

    await writeStrictAdminAuditLog(supa, {
      adminId: user.id,
      action: "admin_manage_operational_control",
      targetTable: "operational_controls",
      targetId: control.id,
      changes: {
        from: { enabled: control.enabled },
        to: { enabled, expires_at: expiresAt },
        control_key: control.control_key,
        environment: control.environment,
        approval_request_id: approval.id,
      },
      reason: reasonResult.reason!,
      ipAddress: req.headers.get("x-forwarded-for"),
    });

    const { data: updated, error: updateError } = await supa
      .from("operational_controls")
      .update({
        enabled,
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        expires_at: expiresAt,
      })
      .eq("id", control.id)
      .select("id,control_key,environment,enabled,expires_at")
      .single();

    if (updateError || !updated?.id) return fail("operational control update failed", origin, 400);

    return ok(
      {
        control_id: updated.id,
        control_key: updated.control_key,
        environment: updated.environment,
        enabled: updated.enabled,
        expires_at: updated.expires_at,
        approval_request_id: approval.id,
      },
      origin,
    );
  } catch (error) {
    console.error("admin-control-management failed", error);
    return fail("operational control management failed", origin, 500);
  }
});
