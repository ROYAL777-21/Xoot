/** Receipt transport only. The forthcoming database transaction remains the financial authority. */
type RpcStore = { rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: { code?: unknown } | null }> };
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const isId = (value: unknown): value is string => typeof value === "string" && uuid.test(value);
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const unsafeControl = (value: string) => [...value].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127);

export type MembershipPaymentSettlement = {
  payment_record_id: string;
  subscription_id: string;
  user_id: string;
  plan_id: string;
  status: "paid" | "admin_confirmed";
  subscription_status: "active" | "paused" | "cancelled" | "pending_payment" | "past_due";
  period_start: string | null;
  period_end: string | null;
  welcome_credit_granted: boolean;
  requires_reconciliation: boolean;
  idempotent: boolean;
};
export type MembershipConfirmationInput = {
  paymentRecordId: string;
  expectedUserId: string;
  expectedSubscriptionId: string;
  expectedPlanId: string;
  source: "payfast" | "admin";
  amountCents: number;
  providerReference: string;
  providerEventId?: string | null;
  payloadHash?: string | null;
  providerTransactionId?: string | null;
  adminId?: string | null;
  adminSessionId?: string | null;
  reason?: string | null;
};

/** Pass only server-rehydrated owner/plan/subscription identities, never a caller's claims. */
export async function applyMembershipPaymentConfirmed(store: RpcStore, input: MembershipConfirmationInput): Promise<MembershipPaymentSettlement> {
  if (![input.paymentRecordId,input.expectedUserId,input.expectedSubscriptionId,input.expectedPlanId].every(isId) ||
    !Number.isSafeInteger(input.amountCents) || input.amountCents <= 0 || typeof input.providerReference !== "string" ||
    input.providerReference.trim().length < 1 || input.providerReference.length > 160 || unsafeControl(input.providerReference)) {
    throw new Error("membership payment identity or amount is invalid");
  }
  if (input.source === "payfast") {
    if (!isId(input.providerEventId) || typeof input.payloadHash !== "string" || !/^[a-f0-9]{64}$/.test(input.payloadHash) ||
      typeof input.providerTransactionId !== "string" || input.providerTransactionId.trim().length < 1 || input.providerTransactionId.length > 120 ||
      unsafeControl(input.providerTransactionId) || input.adminId != null || input.adminSessionId != null || input.reason != null) {
      throw new Error("verified membership provider event is required");
    }
  } else if (input.source === "admin") {
    if (!isId(input.adminId) || !isId(input.adminSessionId) || typeof input.reason !== "string" ||
      input.reason.trim().length < 10 || input.reason.length > 1200 || input.providerEventId != null ||
      input.payloadHash != null || input.providerTransactionId != null) throw new Error("current membership admin assurance and reason are required");
  } else throw new Error("unsupported membership confirmation source");

  const args = {
    p_payment_id:input.paymentRecordId,p_source:input.source,p_amount_cents:input.amountCents,p_reference:input.providerReference,
    p_provider_event_id:input.providerEventId??null,p_payload_hash:input.payloadHash??null,p_provider_transaction_id:input.providerTransactionId??null,
    p_admin_id:input.adminId??null,p_admin_session_id:input.adminSessionId??null,p_reason:input.reason??null,
  };
  let result: Awaited<ReturnType<RpcStore["rpc"]>> | undefined;
  for (let attempt=0;attempt<3;attempt++) {
    result=await store.rpc("settle_membership_payment",args);
    if (!["40001","40P01"].includes(String(result.error?.code??""))) break;
  }
  if (!result) throw new Error("membership transaction did not run");
  if (result.error) {
    const code = typeof result.error.code === "string" && /^[0-9A-Z]{5}$/.test(result.error.code) ? result.error.code : "database_error";
    throw new Error(`atomic membership settlement failed: ${code}`);
  }
  const row=result.data;
  if (!isRecord(row) || row.payment_record_id!==input.paymentRecordId || row.user_id!==input.expectedUserId ||
    row.subscription_id!==input.expectedSubscriptionId || row.plan_id!==input.expectedPlanId ||
    !["paid","admin_confirmed"].includes(String(row.status)) ||
    !["active","paused","cancelled","pending_payment","past_due"].includes(String(row.subscription_status)) ||
    typeof row.welcome_credit_granted!=="boolean" || typeof row.requires_reconciliation!=="boolean" || typeof row.idempotent!=="boolean") {
    throw new Error("membership settlement receipt could not be confirmed");
  }
  const start = typeof row.period_start === "string" ? Date.parse(row.period_start) : NaN;
  const end = typeof row.period_end === "string" ? Date.parse(row.period_end) : NaN;
  const completePeriod = Number.isFinite(start) && Number.isFinite(end) && end>start;
  if ((!row.requires_reconciliation && !completePeriod) ||
    (row.requires_reconciliation && row.welcome_credit_granted) ||
    (!completePeriod && (row.period_start!==null || row.period_end!==null))) {
    throw new Error("membership period or credit receipt could not be confirmed");
  }
  // A paid receipt is not permission to create another subscription or grant credit client-side.
  // Current entitlement still requires the canonical period/status reader, including expiry.
  return row as MembershipPaymentSettlement;
}
