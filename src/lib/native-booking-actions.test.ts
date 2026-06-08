import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildBookingDirectionsUrl,
  buildBookingEtaShareText,
  createNativeBookingActionPayload,
  sendNativeBookingAction,
} from "./native-booking-actions";

describe("native booking action helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds Apple Maps directions URLs from booking destination fields", () => {
    const url = buildBookingDirectionsUrl({
      bookingId: "booking-1",
      propertyName: "Rosebank apartment",
      address: "12 Bath Avenue",
      suburb: "Rosebank",
    });

    expect(url).toBeTruthy();
    expect(decodeURIComponent(url ?? "")).toContain("Rosebank apartment, 12 Bath Avenue, Rosebank, South Africa");
  });

  it("does not include raw street addresses in non-direction native actions", () => {
    const payload = createNativeBookingActionPayload("masked_call", {
      bookingId: "booking-2",
      status: "enroute",
      statusLabel: "On the way",
      serviceName: "Guest-ready clean",
      zooterName: "Nomsa",
      propertyName: "Rosebank apartment",
      address: "12 Bath Avenue, access code 1234",
      etaMinutes: 9,
      callSessionId: "call-session-1",
      updatedAt: "2026-06-08T12:00:00.000Z",
    });

    expect(payload.directionsUrl).toBeUndefined();
    expect(payload.destinationLabel).toBe("Rosebank apartment");
    expect(payload.callSessionId).toBe("call-session-1");
    expect(JSON.stringify(payload)).not.toContain("12 Bath Avenue");
    expect(JSON.stringify(payload)).not.toContain("1234");
  });

  it("falls back to the bookings list for unsafe booking ids", () => {
    const payload = createNativeBookingActionPayload("share_eta", {
      bookingId: "../../support",
      statusLabel: "On the way",
      updatedAt: "2026-06-08T12:00:00.000Z",
    });

    expect(payload.bookingId).toBe("booking");
    expect(payload.route).toBe("/app/bookings");
  });

  it("dispatches browser events and forwards safe payloads to native bridges", () => {
    const events: Array<{ type: string; detail: unknown }> = [];
    const messages: string[] = [];
    class TestCustomEvent {
      type: string;
      detail: unknown;

      constructor(type: string, init?: { detail?: unknown }) {
        this.type = type;
        this.detail = init?.detail;
      }
    }

    vi.stubGlobal("CustomEvent", TestCustomEvent);
    vi.stubGlobal("window", {
      dispatchEvent(event: { type: string; detail: unknown }) {
        events.push(event);
        return true;
      },
      ReactNativeWebView: {
        postMessage(message: string) {
          messages.push(message);
        },
      },
    });

    const payload = createNativeBookingActionPayload("share_eta", {
      bookingId: "booking-3",
      statusLabel: "On the way",
      etaMinutes: 7,
      updatedAt: "2026-06-08T12:00:00.000Z",
    });

    expect(sendNativeBookingAction(payload)).toBe(true);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("zoot:booking-action");
    expect(JSON.parse(messages[0])).toMatchObject({ type: "zoot.bookingAction", payload: { action: "share_eta" } });
  });

  it("creates concise ETA share text without destination details", () => {
    const payload = createNativeBookingActionPayload("share_eta", {
      bookingId: "booking-4",
      statusLabel: "On the way",
      zooterName: "Nomsa",
      address: "12 Bath Avenue",
      etaMinutes: 12,
      updatedAt: "2026-06-08T12:00:00.000Z",
    });

    expect(buildBookingEtaShareText(payload)).toBe("Zoot booking update - On the way - ETA 12 min - Nomsa assigned");
    expect(buildBookingEtaShareText(payload)).not.toContain("Bath Avenue");
  });
});
