import {
  fail,
  handlePreflight,
  ok,
  requireAuth,
} from "../_shared/action-utils.ts";

type XooterJobCardRow = {
  job_id: string;
  booking_id: string;
  xooter_id: string;
  state: string;
  offered_at: string;
  responded_at: string | null;
  decline_reason: string | null;
  service: string | null;
  service_type: string | null;
  scheduled_at: string | null;
  price: number | null;
  duration_hours: number | null;
  status: string | null;
  job_completed_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  sensitive_data_revoked_at: string | null;
  sensitive_access_available_notified_at: string | null;
  user_id: string | null;
  destination_address: string | null;
};

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const preflight = handlePreflight(req, origin);
  if (preflight) return preflight;

  const { response, user, supa } = await requireAuth(req, origin);
  if (response || !user || !supa) return response;

  // The service-role client bypasses RLS. The SQL RPC is user-ID scoped but
  // does not itself check active/background-check approval. Enforce worker
  // eligibility BEFORE any job, address or personal assignment is retrieved.
  const { data: profile, error: profileError } = await supa
    .from("xooters")
    .select("id,active,background_check_status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    console.warn("get-xooter-job-cards eligibility lookup failed", { error: profileError.message });
    return fail("Xooter verification unavailable", origin, 503);
  }
  if (!profile?.active || profile.background_check_status !== "approved") {
    return fail("active verified Xooter account required", origin, 403);
  }

  const { data, error } = await supa.rpc("get_xooter_job_cards_for_user", {
    p_user_id: user.id,
  });

  if (error) {
    console.warn("get-xooter-job-cards failed", { error: error.message });
    return fail("xooter jobs unavailable", origin, 500);
  }

  return ok({ jobs: (data ?? []) as XooterJobCardRow[] }, origin);
});
