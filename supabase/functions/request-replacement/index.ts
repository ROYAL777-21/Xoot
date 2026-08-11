import {
  assertBookingParticipant,
  cleanId,
  cleanText,
  fail,
  handlePreflight,
  insertNotification,
  insertOutbox,
  insertReviewQueue,
  ok,
  requireAuth,
  writeAuditLog,
} from "../_shared/action-utils.ts";
import { canTransition, normaliseBookingStatus } from "../_shared/booking-state-machine.ts";
import { MAX_TRAVEL_KM, distanceKmToCoverage, type SuburbCentroid } from "../_shared/geo.ts";

/**
 * Find someone to take over a job.
 *
 * ── Now shares one definition of "near" with `ai-match` ─────────────────────────
 * This used to do its own substring test — `address.includes(suburb)` — which had two problems the
 * shared helper fixes. It matched shortest-first, so an address in Hyde Park could be satisfied by
 * a Xooter covering Parkhurst; and it was binary, so among ten Xooters who all covered the suburb
 * it could not tell which was closest and fell back to reliability alone.
 *
 * A replacement is needed when something has already gone wrong, so the person who can actually get
 * there soonest matters more here than anywhere else in the product.
 */
const findReplacement = async (supa: any, booking: any) => {
  const address = String(booking.address ?? booking.launch_region ?? "");
  const { data } = await supa
    .from("zooters")
    .select("id,name,user_id,reliability_score,suburb_coverage,active,role")
    .eq("active", true)
    .neq("id", booking.zooter_id ?? "00000000-0000-0000-0000-000000000000")
    .limit(25);

  const { data: centroids } = await supa
    .from("suburb_centroids")
    .select("suburb,region,latitude,longitude")
    .eq("active", true);
  const suburbs = (centroids ?? []) as SuburbCentroid[];

  const candidates = (data ?? [])
    .map((zooter: any) => ({
      ...zooter,
      distanceKm: address ? distanceKmToCoverage(address, zooter.suburb_coverage, suburbs) : null,
    }))
    // Unknown distance stays in — an unlisted suburb must not leave a stranded customer with no
    // replacement at all. Only a Xooter provably too far is dropped.
    .filter((zooter: any) => zooter.distanceKm === null || zooter.distanceKm <= MAX_TRAVEL_KM)
    .sort((a: any, b: any) => {
      // Closest first, then most reliable. A known distance beats an unknown one, because
      // "definitely nearby" is worth more than "might be anywhere" when a job is already late.
      const aKm = a.distanceKm ?? Number.POSITIVE_INFINITY;
      const bKm = b.distanceKm ?? Number.POSITIVE_INFINITY;
      if (aKm !== bKm) return aKm - bKm;
      return Number(b.reliability_score ?? 0) - Number(a.reliability_score ?? 0);
    });

  return candidates[0] ?? null;
};

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const preflight = handlePreflight(req, origin);
  if (preflight) return preflight;

  const auth = await requireAuth(req, origin);
  if (auth.response) return auth.response;
  const { user, supa } = auth as { user: any; supa: any };

  try {
    const body = await req.json();
    const bookingId = cleanId(body.bookingId ?? body.booking_id);
    const reason = cleanText(body.reason, 500) || "Replacement requested";
    if (!bookingId) return fail("booking_id required", origin, 400);

    const { data: booking } = await supa
      .from("bookings")
      .select("id,user_id,zooter_id,status,address,launch_region,service_type,scheduled_at,replacement_count")
      .eq("id", bookingId)
      .maybeSingle();
    if (!booking?.id) return fail("booking not found", origin, 404);

    const participant = await assertBookingParticipant(supa, booking, user.id);
    if (participant.role !== "client" && participant.role !== "admin") return fail("booking access denied", origin, 403);
    const currentStatus = normaliseBookingStatus(booking.status);
    if (!currentStatus || !canTransition(currentStatus, "replacement_required")) {
      return fail("booking is not in a valid replacement state", origin, 409);
    }

    await supa.from("bookings").update({
      status: "replacement_required",
      replacement_status: "searching",
      at_risk: true,
      replacement_count: Number(booking.replacement_count ?? 0) + 1,
      updated_at: new Date().toISOString(),
    }).eq("id", booking.id);

    await supa.from("booking_status_events").insert({
      booking_id: booking.id,
      actor_id: user.id,
      status: "replacement_required",
      label: "Finding a replacement Xooter",
      meta: { reason, previous_status: currentStatus },
    });

    const replacement = await findReplacement(supa, booking);
    if (replacement?.id) {
      await supa.from("bookings").update({
        status: "replacement_offered",
        zooter_id: replacement.id,
        replacement_status: "offered",
        replacement_offered: true,
        was_reassigned: true,
        updated_at: new Date().toISOString(),
      }).eq("id", booking.id);
      await supa.from("booking_status_events").insert({
        booking_id: booking.id,
        actor_id: user.id,
        status: "replacement_offered",
        label: "Replacement Xooter found",
        meta: { replacement_zooter_id: replacement.id },
      });
      await supa.from("zooter_jobs").insert({ booking_id: booking.id, zooter_id: replacement.id, state: "offered" });
      await insertNotification(supa, {
        userId: booking.user_id,
        kind: "replacement_offered",
        title: "Replacement Xooter found",
        body: `${replacement.name ?? "A verified Xooter"} is available as a replacement for your booking.`,
        link: `/app/bookings/${booking.id}`,
      });
      if (replacement.user_id) {
        await insertNotification(supa, {
          userId: replacement.user_id,
          kind: "replacement_job_offer",
          title: "Replacement job available",
          body: "A replacement booking needs quick confirmation.",
          link: "/zooter/jobs",
        });
      }
    } else {
      await supa.from("bookings").update({
        replacement_status: "no_match",
        updated_at: new Date().toISOString(),
      }).eq("id", booking.id);
      await supa.from("zootcred_ledger").insert({
        user_id: booking.user_id,
        booking_id: booking.id,
        amount: 30,
        direction: "credit",
        reason: "no_show_compensation",
        status: "available",
        meta: { source: "replacement_unavailable" },
      });
      await insertReviewQueue(supa, {
        queueType: "replacement",
        subjectTable: "bookings",
        subjectId: booking.id,
        userId: booking.user_id,
        zooterId: booking.zooter_id,
        bookingId: booking.id,
        priority: "high",
        summary: "Replacement search found no available Xooter; reschedule support required",
      });
      await insertNotification(supa, {
        userId: booking.user_id,
        kind: "replacement_unavailable",
        title: "Replacement support needed",
        body: "We could not find a replacement immediately. Support will help reschedule and R30 XootCred has been queued.",
        link: `/app/support`,
      });
    }

    await insertOutbox(supa, {
      source_table: "bookings",
      source_id: booking.id,
      event_type: replacement?.id ? "urgent_replacement_confirmation" : "same_day_cancellation_replacement",
      channel: "whatsapp_urgent",
      owner: "Scheduling & Allocation Agent",
      stack_tool: "WhatsApp urgent queue",
      payload: { booking_id: booking.id, replacement_zooter_id: replacement?.id ?? null },
      status: "needs_approval",
      approval_required: true,
      failure_mode: "Support queue must manually contact client and available contractors if automation fails.",
      created_by: user.id,
    });

    await writeAuditLog(supa, {
      actorId: user.id,
      action: "request_replacement",
      targetTable: "bookings",
      targetId: booking.id,
      changes: { replacement_zooter_id: replacement?.id ?? null, status: replacement?.id ? "replacement_offered" : "replacement_required" },
      reason,
      ipAddress: req.headers.get("x-forwarded-for"),
    });

    return ok({
      booking_id: booking.id,
      status: replacement?.id ? "replacement_offered" : "replacement_required",
      replacement_zooter_id: replacement?.id ?? null,
      compensation_credit: replacement?.id ? 0 : 30,
    }, origin);
  } catch (error) {
    console.error("request-replacement failed", error);
    return fail("replacement request failed", origin, 500);
  }
});
