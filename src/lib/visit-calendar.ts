import { normaliseBookingStatus } from "./booking-state-machine";

export type CalendarVisit = { id: string; scheduled_at: string; duration_hours: number; service: string; status: string; updated_at?: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const text = (value: string) => value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
const serviceNames: Record<string, string> = { regular: "Regular cleaning", residential: "Home cleaning", express: "Express cleaning", airbnb: "Airbnb clean", office: "Office clean", moving: "Moving clean", premium: "Home cleaning" };

/** RFC5545 folds at 75 UTF-8 octets, never in the middle of a character. */
function fold(line: string) {
  const encoder = new TextEncoder();
  let result = "", width = 0;
  for (const char of line) {
    const length = encoder.encode(char).length;
    if (width + length > 75) { result += "\r\n "; width = 1; }
    result += char; width += length;
  }
  return result;
}

/** Whitelist only the fields deliberately shared with the customer's calendar. */
export function visitCalendar(visit: CalendarVisit, now = new Date()) {
  const status = normaliseBookingStatus(visit.status);
  const start = new Date(visit.scheduled_at);
  if (!uuid.test(visit.id) || !status || ["draft", "cancelled", "completed", "rated"].includes(status)
      || !/T.*(?:Z|[+-]\d\d:\d\d)$/.test(visit.scheduled_at) || !Number.isFinite(start.getTime())
      || !Number.isFinite(visit.duration_hours) || visit.duration_hours <= 0 || visit.duration_hours > 24
      || !Number.isFinite(now.getTime())) throw new Error("This visit does not have a calendar-ready schedule.");
  const end = new Date(start.getTime() + visit.duration_hours * 3_600_000);
  const confirmed = ["contractor_accepted", "en_route", "in_progress"].includes(status);
  const updated = new Date(visit.updated_at ?? "");
  const revision = Number.isFinite(updated.getTime()) ? updated : now;
  const url = `https://xoot.co.za/app/bookings/${visit.id}`;
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Xoot//Visits//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT",
    `UID:${visit.id}@xoot.co.za`, `DTSTAMP:${stamp(now)}`, `LAST-MODIFIED:${stamp(revision)}`,
    `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`, `SUMMARY:${text(`Xoot · ${serviceNames[visit.service] ?? "Home service"}`)}`,
    `DESCRIPTION:${text(`${confirmed ? "Xooter confirmed." : "Provisional visit; check Xoot for confirmation."} End time is an estimate. Open Xoot for current details: ${url}`)}`,
    `URL:${url}`, `STATUS:${confirmed ? "CONFIRMED" : "TENTATIVE"}`, "CLASS:PRIVATE", "TRANSP:OPAQUE", "END:VEVENT", "END:VCALENDAR"];
  return { content: lines.map(fold).join("\r\n") + "\r\n", fileName: `xoot-visit-${visit.id}.ics` };
}

export function downloadVisitCalendar(visit: CalendarVisit) {
  const file = visitCalendar(visit);
  const url = URL.createObjectURL(new Blob([file.content], { type: "text/calendar;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = file.fileName;
  document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
