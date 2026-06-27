import {
  fail,
  handlePreflight,
  ok,
  requireAuth,
} from "../_shared/action-utils.ts";

type ZooterJobCardRow = {
  job_id: string;
  booking_id: string;
  zooter_id: string;
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

  const { data, error } = await supa.rpc("get_zooter_job_cards_for_user", {
    p_user_id: user.id,
  });

  if (error) {
    console.warn("get-zooter-job-cards failed", { error: error.message });
    return fail("zooter jobs unavailable", origin, 500);
  }

  return ok({ jobs: (data ?? []) as ZooterJobCardRow[] }, origin);
});
