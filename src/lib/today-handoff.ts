import { normaliseBookingStatus } from "@/lib/booking-state-machine";

export type TodayBooking = { id: string; service: string; service_type: string | null; scheduled_at: string; status: string };
export type TodaySlot = "anytime" | "morning" | "afternoon" | "evening";

const dayFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Johannesburg", year: "numeric", month: "2-digit", day: "2-digit" });
const hourFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Johannesburg", hour: "2-digit", hourCycle: "h23" });

export function sastDay(value: Date): string {
  const parts = Object.fromEntries(dayFormatter.formatToParts(value).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function calendarWeek(day: string): string[] {
  const date = new Date(`${day}T12:00:00Z`);
  const start = -date.getUTCDay(); // The original app/data.js calendar is Sunday-first.
  return Array.from({ length: 7 }, (_, index) => {
    const value = new Date(date);
    value.setUTCDate(value.getUTCDate() + start + index);
    return value.toISOString().slice(0, 10);
  });
}

export function bookingSlot(value: string): TodaySlot {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "anytime";
  const hour = Number(hourFormatter.format(date));
  return hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
}

export function visibleTodayBookings(bookings: TodayBooking[], day: string): TodayBooking[] {
  return bookings.filter(booking => {
    const date = new Date(booking.scheduled_at);
    const status = normaliseBookingStatus(booking.status);
    return !Number.isNaN(date.getTime()) && sastDay(date) === day && status !== "cancelled" && status !== "draft";
  }).sort((a, b) => Date.parse(a.scheduled_at) - Date.parse(b.scheduled_at));
}

export function todayService(booking: TodayBooking): string {
  const service = booking.service_type?.trim() || booking.service.trim();
  return ["residential", "deep", "premium"].includes(service) ? "regular" : service;
}

const validServices = new Set(["regular", "airbnb", "express", "office", "moving", "residential", "deep", "premium"]);
export function bookingEntrySearch(search: string): string | null {
  const input = new URLSearchParams(search);
  const output = new URLSearchParams();
  const service = input.get("service");
  if (service && validServices.has(service)) output.set("service", ["residential", "deep", "premium"].includes(service) ? "regular" : service);
  const frequency = input.get("frequency");
  if (frequency && ["once", "weekly", "fortnightly"].includes(frequency)) output.set("frequency", frequency);
  const intent = input.get("intent");
  if (intent === "book_clean") output.set("intent", intent);
  const date = input.get("date");
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const parsed = new Date(`${date}T12:00:00Z`);
    if (!Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date) output.set("date", date);
  }
  const xooter = input.get("xooter");
  if (xooter && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(xooter)) output.set("xooter", xooter);
  for (const key of ["address", "area"] as const) {
    const value = input.get(key)?.trim();
    if (value && value.length <= 240 && [...value].every(char => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127)) output.set(key, value);
  }
  return output.size ? output.toString() : null;
}
