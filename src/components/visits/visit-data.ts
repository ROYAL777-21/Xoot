import { supabase } from "@/integrations/supabase/client";
import type { Tables, Database, Json } from "@/integrations/supabase/types";
import { normaliseBookingStatus } from "@/lib/booking-state-machine";

export const VISIT_FIELDS = "id,user_id,xooter_id,crew_size,service,service_type,scheduled_at,duration_hours,status,price,service_fee,booking_cover_amount,high_demand_premium,payment_status,completion_photo_required,arrived_at,job_started_at,job_completed_at,completed_at,cancelled_at,address";
export type VisitBooking = Pick<Tables<"bookings">, "id" | "user_id" | "xooter_id" | "crew_size" | "service" | "service_type" | "scheduled_at" | "duration_hours" | "status" | "price" | "service_fee" | "booking_cover_amount" | "high_demand_premium" | "payment_status" | "completion_photo_required" | "arrived_at" | "job_started_at" | "job_completed_at" | "completed_at" | "cancelled_at" | "address">;
export type VisitXooter = Pick<Database["public"]["Views"]["booking_xooter_profiles"]["Row"], "id" | "name" | "user_id" | "photo_url" | "rating" | "verified" | "role" | "jobs_completed">;
export type VisitReview = Pick<Tables<"post_job_reviews">, "id" | "rating" | "notes">;
export type VisitPayment = Pick<Tables<"payment_records">, "id" | "amount" | "currency" | "status" | "payment_kind" | "meta" | "paid_at">;
export type VisitData = {
  booking: VisitBooking; xooter: VisitXooter | null;
  events: Pick<Tables<"booking_status_events">, "id" | "status" | "label" | "created_at">[];
  photos: Pick<Tables<"booking_completion_photos">, "id" | "photo_type" | "created_at">[];
  jobs: Pick<Tables<"xooter_jobs">, "id" | "xooter_id" | "state">[];
  tasks: Pick<Tables<"xooter_job_checklist">, "id" | "job_id" | "label" | "completed_at" | "position">[];
  messages: (Pick<Tables<"messages">, "id" | "sender_type" | "body" | "created_at"> & Partial<Pick<Tables<"messages">, "sender_user_id" | "client_message_id">>)[];
  review: VisitReview | null; payments: VisitPayment[];
  more?: { events: boolean; photos: boolean; tasks: boolean; messages: boolean };
};

export async function loadVisit(id: string, owner: string): Promise<VisitData | null> {
  const [bookingResult, xooterResult] = await Promise.all([
    supabase.from("bookings").select(VISIT_FIELDS).eq("id", id).maybeSingle(),
    supabase.from("booking_xooter_profiles").select("id,name,user_id,photo_url,rating,verified,role,jobs_completed").eq("booking_id", id).maybeSingle(),
  ]);
  if (bookingResult.error || xooterResult.error) throw new Error("Visit lookup failed");
  const booking = bookingResult.data, xooter = xooterResult.data;
  // RLS is authoritative. This additional boundary also prevents displaying an admin-visible
  // customer's visit through the customer route without a booking participant identity.
  if (!booking || (booking.user_id !== owner && xooter?.user_id !== owner)) return null;
  const results = await Promise.all([
    supabase.from("booking_status_events").select("id,status,label,created_at").eq("booking_id", id).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(101),
    supabase.from("booking_completion_photos").select("id,photo_type,created_at").eq("booking_id", id).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(41),
    supabase.from("xooter_jobs").select("id,xooter_id,state").eq("booking_id", id).in("state", ["accepted", "completed"]).limit(5),
    supabase.from("xooter_job_checklist").select("id,job_id,label,completed_at,position").eq("booking_id", id).order("position").order("id").limit(161),
    supabase.from("messages").select("id,sender_type,sender_user_id,client_message_id,body,created_at").eq("booking_id", id).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(101),
    supabase.from("post_job_reviews").select("id,rating,notes").eq("booking_id", id).eq("user_id", booking.user_id).limit(2),
    booking.user_id === owner ? supabase.from("payment_records").select("id,amount,currency,status,payment_kind,meta,paid_at").eq("booking_id", id).eq("user_id", owner).order("created_at", { ascending: false }).limit(21) : Promise.resolve({ data: [], error: null }),
  ]);
  if (results.some(result => result.error)) throw new Error("Visit records failed");
  const [events, photos, jobs, tasks, messages, reviews, payments] = results.map(result => result.data ?? []) as [VisitData["events"], VisitData["photos"], VisitData["jobs"], VisitData["tasks"], VisitData["messages"], VisitReview[], VisitPayment[]];
  if (photos.length > 40 || jobs.length > 4 || reviews.length > 1 || payments.length > 20) throw new Error("Visit records need support review");
  return { booking, xooter, events: events.slice(0,100), photos: photos.slice(0,40), jobs, tasks: tasks.slice(0,160).filter(task => jobs.some(job => job.id === task.job_id)), messages: messages.slice(0,100).reverse(), review: reviews[0] ?? null, payments,
    more: { events: events.length>100, photos: photos.length>40, tasks: tasks.length>160, messages: messages.length>100 } };
}

/** Numeric database rands become cents once; never round a fractional cent or reprice history. */
export function storedCents(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  const cents = value * 100, rounded = Math.round(cents);
  return Number.isSafeInteger(rounded) && Math.abs(cents - rounded) < 0.000001 ? rounded : null;
}
export const money = (cents: number) => `R${(cents / 100).toFixed(2)}`;
const object = (value: Json): Record<string, Json | undefined> | null => value && typeof value === "object" && !Array.isArray(value) ? value : null;
export function paymentSummary(booking: VisitBooking, payments: VisitPayment[]) {
  const service = storedCents(booking.price), fee = storedCents(booking.service_fee), cover = storedCents(booking.booking_cover_amount), premium = storedCents(booking.high_demand_premium);
  const records = payments.filter(payment => payment.payment_kind === "booking");
  const valid = [service,fee,cover,premium].every(amount => amount !== null) && records.every(payment => payment.currency === "ZAR" && storedCents(payment.amount) !== null);
  const unsplit = records.filter(record => !object(record.meta)?.fare_split_id);
  const whole = valid && unsplit.length === 1 ? unsplit[0] : null;
  const total = whole ? storedCents(whole.amount) : null;
  const lines: { label: string; cents: number }[] = [];
  if (service !== null && fee !== null && cover !== null && premium !== null) {
    lines.push({ label: "Visit · stored service amount", cents: service }, { label: "Booking fee", cents: fee });
    if (cover) lines.push({ label: "Booking Cover by Genric", cents: cover });
    if (premium) lines.push({ label: "High-demand premium", cents: premium });
  }
  // A legacy multi-row writer stored an aggregate breakdown on each solo record. Only use
  // its named discounts when the complete stored breakdown reconciles to this exact visit.
  const breakdown = whole && object(object(whole.meta)?.breakdown ?? null);
  const keys = ["subtotal", "highDemandPremium", "serviceFee", "bookingCover", "carePlusDiscount", "referralCredit", "xootcredRedemption"];
  const amounts = breakdown && keys.map(key => storedCents(breakdown[key] ?? 0));
  let itemized = false;
  if (amounts && amounts.every(amount => amount !== null) && amounts[0] === service && amounts[0]! + amounts[1]! + amounts[2]! + amounts[3]! - amounts[4]! - amounts[5]! - amounts[6]! === total) {
    lines.splice(0, lines.length, ...["Visit & add-ons", "High-demand premium", "Booking fee", "Booking Cover by Genric", "Care+ discount", "Referral credit", "XootCred"].map((label, index) => ({ label, cents: amounts[index]! * (index >= 4 ? -1 : 1) })).filter(line => line.cents !== 0));
    itemized = true;
  }
  const paid = valid ? records.filter(record => record.status === "paid").reduce((sum, record) => sum + storedCents(record.amount)!, 0) : null;
  const pending = valid ? records.find(record => record.status === "pending") ?? null : null;
  return { total, service, lines, itemized, valid, paid, pending, pendingShare: Boolean(pending && object(pending.meta)?.fare_split_id), records };
}
export function reviewEligible(booking: VisitBooking, owner: string, review: VisitReview | null): boolean {
  return booking.user_id === owner && Boolean(booking.xooter_id) && booking.crew_size === 1 && !booking.cancelled_at && normaliseBookingStatus(booking.status) === "completed" && !review;
}
export function visitService(booking: VisitBooking): "regular" | "airbnb" | "express" | "office" | "moving" | "laundry" | "lux" {
  const service = booking.service_type || booking.service;
  return ["airbnb", "express", "office", "moving", "laundry", "lux"].includes(service) ? service as ReturnType<typeof visitService> : "regular";
}
export function scheduledLabel(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(date) : "Time to confirm";
}
