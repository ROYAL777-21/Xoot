import { getClientVisibleStatus, normaliseBookingStatus } from "@/lib/booking-state-machine";
import type { NativeBookingActionInput } from "@/lib/native-booking-actions";
import type { XootBookingLiveActivityPayload, XootBookingLiveActivityStatus } from "@/lib/native-live-activity";
import type { VisitData } from "./visit-data";

/** Only recorded facts enter share/native channels; scheduled time is never an arrival estimate. */
export function visitNativeInput(data: VisitData): NativeBookingActionInput {
  const status = normaliseBookingStatus(data.booking.status);
  return { bookingId: data.booking.id, serviceName: data.booking.service_type,
    statusLabel: status ? getClientVisibleStatus(status) : "Status unavailable",
    ...(data.booking.crew_size === 1 && data.xooter?.name ? { xooterName: data.xooter.name } : {}),
  };
}
export function visitLiveActivity(data: VisitData, recordedStatus: string): XootBookingLiveActivityPayload {
  const canonical = normaliseBookingStatus(recordedStatus);
  const mapped: Partial<Record<NonNullable<typeof canonical>, XootBookingLiveActivityStatus>> = {contractor_accepted:"confirmed",en_route:"enroute",in_progress:"in_progress",completed:"completed",cancelled:"cancelled",reassigned:"reassigned"};
  const input = visitNativeInput(data);
  return {bookingId:data.booking.id,status:recordedStatus === "arrived" ? "arrived" : canonical && mapped[canonical] || "pending",
    statusLabel:recordedStatus === "arrived" ? "Xooter arrived" : canonical ? getClientVisibleStatus(canonical) : "Status unavailable",
    serviceName:data.booking.service_type,...(input.xooterName ? {xooterName:input.xooterName} : {}),scheduledAt:data.booking.scheduled_at,updatedAt:new Date().toISOString()};
}
