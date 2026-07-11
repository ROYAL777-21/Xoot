import {
  cleanText,
  fail,
  getServiceClient,
  handlePreflight,
  ok,
} from "../_shared/action-utils.ts";
import { consumeRateLimit, isOperationalControlEnabled } from "../_shared/governance-utils.ts";
import { readJsonWithLimit } from "../_shared/request-body.ts";
import { getClientIp, verifyTurnstile } from "../_shared/turnstile.ts";

const vulnerabilityClasses = new Set([
  "access_control",
  "authentication",
  "data_exposure",
  "injection",
  "business_logic",
  "mobile",
  "configuration",
  "other",
]);
const severities = new Set(["low", "medium", "high", "critical"]);
const disclosureStatuses = new Set(["private", "shared_with_zoot_only", "previously_disclosed"]);
const contactPreferences = new Set(["email", "no_reply"]);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const sensitivePatterns: Array<[RegExp, string]> = [
  [/\b(?:sbp|sk|pk|phx|figd|cr|cfat)_[A-Za-z0-9._-]{12,}\b/gi, "[credential redacted]"],
  [/\beyJ[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\b/g, "[token redacted]"],
  [/\b(?:password|passcode|otp|cvv|secret|api\s*key|auth\s*token)\s*[:=#-]?\s*\S+/gi, "$1 [redacted]"],
  [/\b(?:gate|alarm|lockbox|door|garage)\s*(?:code|pin|password)?\s*[:=#-]?\s*[A-Za-z0-9-]{3,}\b/gi, "$1 [redacted]"],
  [/\b(?:\d[ -]*?){13,19}\b/g, "[payment number redacted]"],
];

const redactSensitiveText = (value: unknown, maxLength: number) => {
  let result = cleanText(value, maxLength);
  for (const [pattern, replacement] of sensitivePatterns) result = result.replace(pattern, replacement);
  return result;
};

const requestActor = (req: Request) => {
  const ip = getClientIp(req) || "unknown-ip";
  const userAgent = req.headers.get("user-agent")?.slice(0, 160) || "unknown-agent";
  return `${ip}:${userAgent}`;
};

const makePublicReference = () => {
  const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase();
  return `ZVD-${new Date().getUTCFullYear()}-${suffix}`;
};

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const preflight = handlePreflight(req, origin);
  if (preflight) return preflight;

  try {
    if (!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
      return fail("security report intake unavailable", origin, 503);
    }

    const supa = getServiceClient();
    const [enabled, killed] = await Promise.all([
      isOperationalControlEnabled(supa, "security.disclosure_intake"),
      isOperationalControlEnabled(supa, "security.kill.disclosure_intake"),
    ]);
    if (!enabled || killed) return fail("security report intake is not currently accepting submissions", origin, 503);

    const bodyResult = await readJsonWithLimit(req, 32 * 1024);
    if (!bodyResult.ok) return fail(bodyResult.error, origin, bodyResult.status);
    const body = bodyResult.value;
    if (cleanText(body.website, 120)) {
      return ok({ received: true }, origin, 202);
    }

    const rateLimit = await consumeRateLimit(supa, {
      bucket: "security_disclosure",
      actor: requestActor(req),
      action: "submit_public_report",
      limitCount: 4,
      windowSeconds: 3600,
    });
    if (!rateLimit.allowed) return fail("too many security reports; try again later", origin, 429);

    const turnstileRequired = await isOperationalControlEnabled(
      supa,
      "security.disclosure_turnstile_required",
    ).catch(() => true);
    const turnstile = await verifyTurnstile({
      token: body.turnstile_token,
      remoteIp: getClientIp(req),
      required: turnstileRequired,
      expectedAction: "security_disclosure",
    });
    if (!turnstile.ok) {
      return fail(
        turnstile.configured ? "security verification failed" : "security verification unavailable",
        origin,
        turnstile.configured ? 403 : 503,
        { turnstile_required: turnstile.required },
      );
    }

    const contactPreference = cleanText(body.contact_preference, 24);
    const contactEmail = cleanText(body.contact_email, 240).toLowerCase();
    const vulnerabilityClass = cleanText(body.vulnerability_class, 40);
    const reporterSeverity = cleanText(body.reporter_severity, 20);
    const disclosureStatus = cleanText(body.disclosure_status, 40);
    const consentToFollowUp = body.consent_to_follow_up === true;
    const confirmsNoSensitiveData = body.confirms_no_sensitive_data === true;

    if (!contactPreferences.has(contactPreference)) return fail("invalid contact preference", origin, 400);
    if (contactPreference === "email" && (!emailPattern.test(contactEmail) || !consentToFollowUp)) {
      return fail("a valid contact email and follow-up consent are required", origin, 400);
    }
    if (!vulnerabilityClasses.has(vulnerabilityClass)) return fail("invalid vulnerability class", origin, 400);
    if (!severities.has(reporterSeverity)) return fail("invalid severity", origin, 400);
    if (!disclosureStatuses.has(disclosureStatus)) return fail("invalid disclosure status", origin, 400);
    if (!confirmsNoSensitiveData) return fail("confirm that sensitive credentials and unrelated personal data are excluded", origin, 400);

    const affectedAsset = redactSensitiveText(body.affected_asset, 300);
    const summary = redactSensitiveText(body.summary, 500);
    const reproductionSteps = redactSensitiveText(body.reproduction_steps, 5000);
    const expectedBehavior = redactSensitiveText(body.expected_behavior, 1600);
    const actualBehavior = redactSensitiveText(body.actual_behavior, 1600);
    const impact = redactSensitiveText(body.impact, 2400);
    const minimalEvidence = redactSensitiveText(body.minimal_evidence, 3200);

    if (
      affectedAsset.length < 3 ||
      summary.length < 12 ||
      reproductionSteps.length < 20 ||
      expectedBehavior.length < 8 ||
      actualBehavior.length < 8 ||
      impact.length < 12
    ) {
      return fail("complete the required report details", origin, 400);
    }

    const publicReference = makePublicReference();
    const { data: report, error } = await supa
      .from("security_disclosure_reports")
      .insert({
        public_reference: publicReference,
        reporter_name: redactSensitiveText(body.reporter_name, 120) || null,
        contact_email: contactPreference === "email" ? contactEmail : null,
        contact_preference: contactPreference,
        consent_to_follow_up: contactPreference === "email" && consentToFollowUp,
        affected_asset: affectedAsset,
        vulnerability_class: vulnerabilityClass,
        reporter_severity: reporterSeverity,
        summary,
        reproduction_steps: reproductionSteps,
        expected_behavior: expectedBehavior,
        actual_behavior: actualBehavior,
        impact,
        minimal_evidence: minimalEvidence || null,
        disclosure_status: disclosureStatus,
        actor_hash: rateLimit.actorHash,
      })
      .select("id,public_reference,correlation_id,created_at")
      .single();
    if (error || !report) return fail("security report could not be recorded", origin, 500);

    const { error: eventError } = await supa.from("security_disclosure_events").insert({
      report_id: report.id,
      event_type: "submitted",
      actor_type: "public_intake",
      metadata: {
        source: "public_web",
        reporter_severity: reporterSeverity,
        vulnerability_class: vulnerabilityClass,
        redaction_applied: [reproductionSteps, actualBehavior, impact, minimalEvidence].some((value) => value.includes("[")),
      },
    });
    if (eventError) {
      await supa.from("security_disclosure_reports").delete().eq("id", report.id);
      return fail("security report could not be recorded", origin, 500);
    }

    return ok(
      {
        received: true,
        reference: report.public_reference,
        received_at: report.created_at,
      },
      origin,
      201,
    );
  } catch (error) {
    console.error("submit-security-report failed", error instanceof Error ? error.message : "unknown error");
    return fail("security report intake failed", origin, 500);
  }
});
