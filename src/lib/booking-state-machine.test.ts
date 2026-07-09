import { describe, expect, it } from "vitest";

import {
  assertTransition,
  canTransition,
  getClientVisibleStatus,
  normaliseBookingStatus,
  type BookingStatus,
} from "./booking-state-machine";

describe("booking state machine", () => {
  it("allows only explicit booking transitions", () => {
    expect(canTransition("draft", "payment_confirmed")).toBe(true);
    expect(canTransition("draft", "completed")).toBe(false);
    expect(canTransition("cancelled", "assigned")).toBe(false);
    expect(canTransition("completed", "cancelled")).toBe(false);
  });

  it("throws when a booking tries to skip states", () => {
    expect(() => assertTransition("draft", "completed")).toThrow("Invalid booking transition");
  });

  it("keeps terminal states closed", () => {
    const terminalStates: BookingStatus[] = ["rated", "cancelled"];
    for (const state of terminalStates) {
      expect(canTransition(state, "assigned")).toBe(false);
      expect(canTransition(state, "in_progress")).toBe(false);
    }
  });

  it("normalises legacy statuses for old booking rows", () => {
    expect(normaliseBookingStatus("pending")).toBe("pending_payment");
    expect(normaliseBookingStatus("confirmed")).toBe("contractor_accepted");
    expect(normaliseBookingStatus("enroute")).toBe("en_route");
    expect(normaliseBookingStatus("in_progress")).toBe("in_progress");
  });

  it("returns premium client-facing labels", () => {
    expect(getClientVisibleStatus("awaiting_assignment")).toBe("Finding your Zooter");
    expect(getClientVisibleStatus("replacement_required")).toBe("Finding a replacement Zooter");
  });
});
