import {
  cleanId,
  cleanText,
  fail,
  getServiceClient,
  handlePreflight,
  ok,
  readJson,
  requireAuth,
} from "../_shared/action-utils.ts";
import { commissionRateBps } from "../_shared/pricing.ts";

/**
 * Accept or decline an offered job.
 *
 * `20260802120000_client_write_surface_lockdown.sql` revoked the client's write on
 * `zooter_jobs`, because `state` was directly settable: a Xooter could accept a job never
 * offered to them, or un-decline one after seeing something better. This is the replacement.
 *
 * The legal transitions live in `public.zooter_job_transition_allowed`, not here, so the rule
 * survives a rewrite of this function and can be asserted in SQL.
 */

/** How long an offer stays live. Past this the job is expired regardless of what the row says. */
const OFFER_TTL_MINUTES = 30;

const ACTIONS = {
  accept: "accepted",
  decline: "declined",
} as const;

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const preflight = handlePreflight(req, origin);
  if (preflight) return preflight;

  const auth = await requireAuth(req, origin);
  if (auth.response) return auth.response;
  const { user } = auth as { user: { id: string } };

  const supa = getServiceClient();

  try {
    const body = await readJson(req);
    const jobId = cleanId(body.jobId ?? body.job_id);
    const action = cleanText(body.action, 20) as keyof typeof ACTIONS;
    const declineReason = cleanText(body.declineReason ?? body.decline_reason, 200);

    if (!jobId) return fail("job_id required", origin, 400);
    if (!(action in ACTIONS)) return fail("action must be accept or decline", origin, 400);

    const { data: job, error: jobError } = await supa
      .from("zooter_jobs")
      .select("id,booking_id,zooter_id,state,offered_at")
      .eq("id", jobId)
      .maybeSingle();

    if (jobError || !job?.id) return fail("job not found", origin, 404);

    // Ownership comes from the JWT, never the payload. The zooter row is looked up from the
    // caller and compared to the job — not the other way round, which would let a caller name
    // someone else's zooter_id.
    const { data: zooter } = await supa
      .from("zooters")
      .select("id,reliability_score,jobs_completed")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!zooter?.id || zooter.id !== job.zooter_id) {
      // Same response as a missing job. Telling a caller that a job exists but is not theirs
      // confirms the ID, which is enough to enumerate the dispatch queue.
      return fail("job not found", origin, 404);
    }

    const offeredAt = job.offered_at ? new Date(job.offered_at).getTime() : 0;
    const expired = offeredAt > 0 && Date.now() - offeredAt > OFFER_TTL_MINUTES * 60 * 1000;

    if (expired && job.state === "offered") {
      await supa.from("zooter_jobs").update({ state: "expired" }).eq("id", job.id);
      return fail("offer expired", origin, 409, { state: "expired" });
    }

    const nextState = ACTIONS[action];

    const { data: allowed, error: ruleError } = await supa.rpc("zooter_job_transition_allowed", {
      current_state: job.state,
      next_state: nextState,
    });

    // A rule that cannot be evaluated is not a rule that passed.
    if (ruleError) return fail("could not evaluate transition", origin, 500);
    if (allowed !== true) {
      return fail("job is no longer open", origin, 409, { state: job.state });
    }

    // Conditional on the state we read, so two devices racing produce one winner rather than a
    // last-write-wins overwrite of an accept by a decline.
    const { data: updated, error: updateError } = await supa
      .from("zooter_jobs")
      .update({
        state: nextState,
        responded_at: new Date().toISOString(),
        decline_reason: action === "decline" ? declineReason || null : null,
      })
      .eq("id", job.id)
      .eq("state", job.state)
      .select("id,state")
      .maybeSingle();

    if (updateError) return fail("could not update job", origin, 500);
    if (!updated?.id) return fail("job is no longer open", origin, 409, { state: job.state });

    /*
     * Strike the commission rate on acceptance, if it was not struck at booking time.
     *
     * `create-booking` records the rate when the customer chose a Xooter up front. When nobody
     * was chosen it inserts `commission_rate_bps` null, and this is the moment the Xooter
     * becomes known — so this is where the rate is agreed.
     *
     * Conditional on the column still being null, so a rate struck at booking time is never
     * overwritten here. That guard is the whole point: a rank moves, and a Xooter must not be
     * paid at a rate that changed after they agreed the job.
     */
    if (nextState === "accepted") {
      await supa
        .from("bookings")
        .update({
          commission_rate_bps: commissionRateBps({
            reliabilityScore: zooter.reliability_score,
            completedJobs: zooter.jobs_completed,
          }),
        })
        .eq("id", job.booking_id)
        .is("commission_rate_bps", null);
    }

    // The booking's own trail, not the admin audit log — this is a participant acting on their
    // own job, and `admin_audit_log.admin_id` would misdescribe them as an admin. The
    // `enforce_status_event_actor` trigger leaves `actor_id` alone for service sessions, so the
    // event is attributed to the Xooter who actually responded.
    await supa.from("booking_status_events").insert({
      booking_id: job.booking_id,
      actor_id: user.id,
      status: `job_${nextState}`,
      label: action === "decline" ? "Xooter declined the job" : "Xooter accepted the job",
      meta: { job_id: job.id, from: job.state, to: nextState },
    });

    return ok({ id: updated.id, state: updated.state }, origin);
  } catch (_error) {
    return fail("job response failed", origin, 500);
  }
});
