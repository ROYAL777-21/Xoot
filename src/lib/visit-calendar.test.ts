import { describe, expect, it } from "vitest";
import { visitCalendar } from "./visit-calendar";

const visit = { id: "00000000-0000-4000-8000-000000000001", scheduled_at: "2026-11-01T08:00:00+02:00", duration_hours: 5.5, service: "regular", status: "contractor_accepted" };
const now = new Date("2026-10-26T10:00:00Z");
describe("Private calendar export", () => {
  it("uses the saved SAST start and estimated duration in UTC", () => {
    const file = visitCalendar(visit, now);
    expect(file.content).toContain("DTSTART:20261101T060000Z\r\nDTEND:20261101T113000Z");
    expect(file.content).toContain("STATUS:CONFIRMED");
    expect(file.content).toContain(`UID:${visit.id}@xoot.co.za`);
    expect(file.content).toContain("CLASS:PRIVATE");
    expect(file.fileName).toBe(`xoot-visit-${visit.id}.ics`);
    for (const line of file.content.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });
  it("never promotes a payment or assignment request to confirmation", () => {
    for (const status of ["pending_payment", "payment_confirmed", "assigned", "replacement_required"]) {
      const content = visitCalendar({ ...visit, status }, now).content;
      expect(content).toContain("STATUS:TENTATIVE"); expect(content).toContain("Provisional visit");
    }
  });
  it("ignores all private extras and untrusted service text", () => {
    const content = visitCalendar({ ...visit, service: "evil\r\nATTENDEE:secret", address: "Private street", gate_code: "1234", notes: "Secret note", email: "person@example.invalid" } as typeof visit, now).content;
    for (const secret of ["Private street", "1234", "Secret note", "person@example.invalid", "ATTENDEE", "LOCATION:", "evil"]) expect(content).not.toContain(secret);
    expect(content).toContain("Home service");
  });
  it("rejects invalid schedules, identifiers, durations and terminal visits", () => {
    for (const patch of [{ id: "x\r\nATTENDEE:secret" }, { scheduled_at: "2026-11-01T08:00:00" }, { scheduled_at: "invalid" }, { duration_hours: 0 }, { duration_hours: Infinity }, { duration_hours: 25 }, { status: "unknown" }, { status: "draft" }, { status: "cancelled" }, { status: "completed" }, { status: "rated" }]) expect(() => visitCalendar({ ...visit, ...patch }, now)).toThrow("calendar-ready");
  });
});
