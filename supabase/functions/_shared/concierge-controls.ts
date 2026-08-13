import { getEdgeEnvironment } from "./governance-utils.ts";

type SupabaseServiceClient = any;

/**
 * Resolves every `concierge.*` operational control in one query, with the kill switches applied.
 *
 * ── Why this exists ─────────────────────────────────────────────────────────────
 * `20260703150828_concierge_governance_controls.sql` registers 19 controls and
 * `20260703153056_concierge_structured_handoff.sql` adds a 20th. Measured on 2026-08-11 by
 * grepping every read in `supabase/functions/`: **only `create-concierge-handoff` read any of
 * them.** `support-respond` — the function the Concierge calls on every single message — read
 * `support.turnstile_required` and `support.openai_fallback` and no `concierge.*` control at all.
 *
 * So `concierge.kill.global` killed nothing. It was a kill switch wired to nothing, which is worse
 * than no kill switch: someone reaching for it in an incident would flip it, see the Concierge keep
 * answering, and not know why.
 *
 * `concierge-governance-readiness.test.ts` passed throughout, because it asserts the migration
 * *registers* the flags. Nothing asserted any flag was *read*. `concierge-governance-wired.test.ts`
 * is the missing half.
 *
 * ── Why one query rather than `isOperationalControlEnabled` per key ─────────────
 * That helper runs a query per control. At 20 controls that is 20 round trips on every Concierge
 * message, on the request path a person is waiting on. This selects the whole `concierge.%` prefix
 * once.
 *
 * ── What is NOT gated here, and why it matters ──────────────────────────────────
 * The eight topic flags — `care_plus_support`, `xootcred_support`, `booking_status`,
 * `referral_support`, `booking_cover_support`, `partnership_interest`, `xooter_support`,
 * `authenticated_account_support` — are **tool-permission flags, not topic-permission flags**, and
 * they are all `false` live.
 *
 * `getXootKnowledgeReply` answers Care+ and XootCred questions from approved static knowledge
 * today. Wiring those flags as gates on *answering* would make the Concierge refuse nearly every
 * question it currently answers well — turning a governance fix into an outage. They gate acting
 * on a real account: reading a booking's true status, creating a support case, touching a real
 * Care+ subscription. `create-concierge-handoff` already treats them that way and is correct.
 *
 * The governance readiness test states the same intent in its own words: the flags register
 * "without activating sensitive tools".
 */

/** Every control key this module knows about, and the capability each one governs. */
const CAPABILITY_KEYS = {
  enabled: "concierge.enabled",
  web: "concierge.web.enabled",
  mobile: "concierge.mobile.enabled",
  modelAnswers: "concierge.model_answers",
  staticFallback: "concierge.safe_static_fallback",
  humanHandoff: "concierge.human_handoff",
  supportCaseCreation: "concierge.support_case_creation",
  caseCreationTool: "concierge.handoff.case_creation_tool",
  bookingStatus: "concierge.booking_status",
  authenticatedAccountSupport: "concierge.authenticated_account_support",
  carePlusSupport: "concierge.care_plus_support",
  xootcredSupport: "concierge.xootcred_support",
  referralSupport: "concierge.referral_support",
  bookingCoverSupport: "concierge.booking_cover_support",
  partnershipInterest: "concierge.partnership_interest",
  xooterSupport: "concierge.xooter_support",
} as const;

const KILL_KEYS = {
  global: "concierge.kill.global",
  modelAnswers: "concierge.kill.model_answers",
  supportHandoff: "concierge.kill.support_handoff",
  bookingStatus: "concierge.kill.booking_status",
} as const;

export type ConciergeCapabilities = {
  [K in keyof typeof CAPABILITY_KEYS]: boolean;
} & {
  /** True when `concierge.kill.global` is on. Surfaced so callers can say *why* they refused. */
  killed: boolean;
};

/** Everything off. The value returned whenever the lookup cannot be trusted. */
const ALL_OFF: ConciergeCapabilities = {
  ...(Object.fromEntries(Object.keys(CAPABILITY_KEYS).map((key) => [key, false])) as {
    [K in keyof typeof CAPABILITY_KEYS]: boolean;
  }),
  killed: true,
};

type ControlRow = {
  control_key: string;
  environment: string;
  enabled: boolean;
  expires_at: string | null;
};

/**
 * Pick the row that applies, mirroring `isOperationalControlEnabled` exactly: an environment-
 * specific row beats the `all` row, a missing row is off, and an expired row is off.
 *
 * Mirrored rather than shared because the two must agree — `create-concierge-handoff` still uses
 * the per-key helper, and two different answers to "is this control on" is precisely the defect
 * class this repo keeps paying for.
 */
const resolve = (rows: ControlRow[], key: string, environment: string): boolean => {
  const matches = rows.filter((row) => row.control_key === key);
  const row =
    matches.find((item) => item.environment === environment) ??
    matches.find((item) => item.environment === "all");
  if (!row?.enabled) return false;
  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) return false;
  return true;
};

/**
 * Read the Concierge's capabilities.
 *
 * **Fails closed.** A lookup error returns everything off. A governance layer that opens when it
 * cannot read its own rules is not a governance layer — and the failure mode of being too quiet is
 * a support ticket, while the failure mode of being too loud is whatever the kill switch was
 * added to stop.
 */
export const getConciergeCapabilities = async (
  supa: SupabaseServiceClient | null,
  environment = getEdgeEnvironment(),
): Promise<ConciergeCapabilities> => {
  if (!supa) {
    console.warn("concierge controls unavailable (no service client); failing closed");
    return ALL_OFF;
  }

  const { data, error } = await supa
    .from("operational_controls")
    .select("control_key,environment,enabled,expires_at")
    .like("control_key", "concierge.%");

  if (error) {
    console.warn("concierge control lookup failed; failing closed", { error: error.message });
    return ALL_OFF;
  }

  const rows: ControlRow[] = Array.isArray(data) ? data : [];
  const on = (key: string) => resolve(rows, key, environment);

  const killed = on(KILL_KEYS.global);
  const killModelAnswers = on(KILL_KEYS.modelAnswers);
  const killSupportHandoff = on(KILL_KEYS.supportHandoff);
  const killBookingStatus = on(KILL_KEYS.bookingStatus);

  // A global kill beats every individual flag, so there is exactly one thing to reach for in an
  // incident rather than sixteen.
  if (killed) return ALL_OFF;

  const base = Object.fromEntries(
    Object.entries(CAPABILITY_KEYS).map(([capability, key]) => [capability, on(key)]),
  ) as { [K in keyof typeof CAPABILITY_KEYS]: boolean };

  return {
    ...base,
    modelAnswers: base.modelAnswers && !killModelAnswers,
    humanHandoff: base.humanHandoff && !killSupportHandoff,
    supportCaseCreation: base.supportCaseCreation && !killSupportHandoff,
    caseCreationTool: base.caseCreationTool && !killSupportHandoff,
    bookingStatus: base.bookingStatus && !killBookingStatus,
    killed: false,
  };
};

/** The keys this module reads, exported so the wiring test can prove none was forgotten. */
export const CONCIERGE_CONTROL_KEYS: readonly string[] = [
  ...Object.values(CAPABILITY_KEYS),
  ...Object.values(KILL_KEYS),
];
