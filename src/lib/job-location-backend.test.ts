import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  canPublishJobPosition, canReadJobPosition, freshLivePosition, isActiveLocationJob,
  validWorkerLocation, type LiveBooking, type LiveJob, type LiveWorker,
} from "../../supabase/functions/_shared/job-location-policy";

const booking: LiveBooking = {
  id: "booking-id", user_id: "customer-one", xooter_id: "worker-record",
  status: "en_route", cancelled_at: null, sensitive_data_revoked_at: null,
};
const job: LiveJob = { id: "job-id", booking_id: booking.id, xooter_id: "worker-record", state: "accepted" };
const worker: LiveWorker = {
  id: "worker-record", user_id: "xooter-one", active: true, background_check_status: "approved",
};

describe("JWT-derived job-scoped location authorisation", () => {
  it("allows an assigned approved worker to publish and the same booking customer to read", () => {
    expect(isActiveLocationJob(booking, job, worker)).toBe(true);
    expect(canPublishJobPosition("xooter-one", booking, job, worker)).toBe(true);
    expect(canReadJobPosition("customer-one", booking, job, worker)).toBe(true);
    expect(canReadJobPosition("xooter-one", booking, job, worker)).toBe(true);
  });

  it("denies other customers, non-worker accounts and even admin-like unknown identities", () => {
    for (const stranger of ["customer-two", "xooter-two", "admin", "", "anon"]) {
      expect(canReadJobPosition(stranger, booking, job, worker)).toBe(false);
      expect(canPublishJobPosition(stranger, booking, job, worker)).toBe(false);
    }
    expect(canPublishJobPosition("customer-one", booking, job, worker)).toBe(false);
  });

  it("immediately rejects cancelled, reassigned, completed, revoked and unapproved jobs", () => {
    const bad = [
      [{...booking, status: "completed"}, job, worker],
      [{...booking, status: "in_progress"}, job, worker],
      [{...booking, status: "cancelled"}, job, worker],
      [{...booking, cancelled_at: "2026-10-16T12:00:00Z"}, job, worker],
      [{...booking, sensitive_data_revoked_at: "2026-10-16T12:00:00Z"}, job, worker],
      [{...booking, xooter_id: "another-xooter"}, job, worker],
      [booking, {...job, state: "declined"}, worker],
      [booking, {...job, xooter_id: "another-xooter"}, worker],
      [booking, {...job, booking_id: "other-booking"}, worker],
      [booking, job, {...worker, active: false}],
      [booking, job, {...worker, background_check_status: "pending"}],
    ] as const;
    for (const [b,j,w] of bad) {
      expect(canReadJobPosition("customer-one", b, j, w)).toBe(false);
      expect(canPublishJobPosition("xooter-one", b, j, w)).toBe(false);
    }
  });
});

describe("GPS payload and retention controls", () => {
  const good = { latitude: -26.107, longitude: 28.056, accuracy_m: 18, sharingConsent: true };
  it("accepts only explicit consent and valid bounded SA coordinates", () => {
    expect(validWorkerLocation(good)).toBe(true);
    expect(validWorkerLocation({...good, sharingConsent: false})).toBe(false);
    for (const point of [{...good, latitude: NaN}, {...good, latitude: -40},
      {...good, longitude: 181}, {...good, longitude: 0}, {...good, accuracy_m: 201},
      {...good, accuracy_m: Infinity}, {...good, accuracy_m: "20"},
      {...good, sharingConsent: "true"}]) {
      expect(validWorkerLocation(point)).toBe(false);
    }
  });
  it("rejects expired or stale server positions, not just any row", () => {
    const now = new Date("2026-10-16T12:00:00Z").getTime();
    const ts = (ms: number) => new Date(ms).toISOString();
    expect(freshLivePosition(ts(now-15000), ts(now+20000), now)).toBe(true);
    expect(freshLivePosition(ts(now-65000), ts(now+20000), now)).toBe(false);
    expect(freshLivePosition(ts(now-2000), ts(now-1), now)).toBe(false);
    expect(freshLivePosition(ts(now+10000), ts(now+20000), now)).toBe(false);
    expect(freshLivePosition("not-date", "not-date", now)).toBe(false);
  });
});

describe("back-end fail-closed implementation guards", () => {
  const sql = readFileSync(join(process.cwd(), "supabase/migrations/20261016170000_job_scoped_live_positions.sql"), "utf8");
  const edge = readFileSync(join(process.cwd(), "supabase/functions/job-live-location/index.ts"), "utf8");
  const config = readFileSync(join(process.cwd(), "supabase/config.toml"), "utf8");
  it("withholds exposed table grants, uses no anon RLS policies, and purges on all exits", () => {
    expect(sql).toContain("alter table public.job_live_positions enable row level security");
    expect(sql).toContain("revoke all on public.job_live_positions from public, anon, authenticated");
    expect(sql).toContain("grant select, insert, update, delete on public.job_live_positions to service_role");
    expect(sql).not.toMatch(/create policy .* on public\.job_live_positions/i);
    expect(sql).toContain("purge_live_job_position_on_booking_change");
    expect(sql).toContain("purge_live_job_position_on_job_change");
    expect(sql).toContain("for update of j, b");
    expect(sql).toContain("location rate too high");
    expect(sql).toContain("location job no longer eligible");
  });
  it("authenticates on every request, defers to current DB job and defaults feature off", () => {
    expect(config).toContain("[functions.job-live-location]\nverify_jwt = true");
    expect(edge).toContain("await requireAuth(req, origin)");
    expect(edge).toContain('Deno.env.get("XOOT_ENABLE_LIVE_LOCATION") !== "true"');
    expect(edge).toContain("canReadJobPosition(actorId");
    expect(edge).toContain("canPublishJobPosition(actorId");
    expect(edge).toContain('sharingConsent: true').toBe(false);
    expect(edge).toContain("validWorkerLocation(position)");
    expect(edge).not.toMatch(/\.from\("user_roles"\).*\.select\("\*"\)/);
    expect(edge).not.toMatch(/console\.log\([^)]*(position|latitude|longitude)/);
    expect(edge).toContain('const now = Date.now();');
  });
});
