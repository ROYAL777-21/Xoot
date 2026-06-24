import { describe, expect, it } from "vitest";
import {
  applyZootCredLedger,
  buildPendingPaymentRecord,
  canAccessSensitiveBookingData,
  calculateBookingQuote,
  getActivationReadiness,
  getSensitiveAccessAvailability,
  isApprovedLaunchRegion,
  routeNotificationChannel,
} from "./operations";

describe("Zoot operating rules", () => {
  it("validates launch geography against approved suburbs and nearby wording", () => {
    expect(isApprovedLaunchRegion("12 Alice Lane, Sandton")).toBe(true);
    expect(isApprovedLaunchRegion("Dainfern Valley Estate")).toBe(true);
    expect(isApprovedLaunchRegion("Cape Town CBD")).toBe(false);
  });

  it("calculates booking price with add-ons, booking cover, service fee, and high-demand premium", () => {
    expect(calculateBookingQuote({
      basePrice: 270,
      addOnCount: 2,
      frequency: "one_time",
      time: "17:00",
      bookingCoverOptIn: true,
    })).toEqual({
      basePrice: 270,
      addOnsTotal: 60,
      highDemandPremium: 50,
      serviceFee: 39,
      bookingCover: 21,
      total: 440,
      estimatedAddOnHours: 2,
    });
  });

  it("removes one-time service fee from recurring bookings", () => {
    expect(calculateBookingQuote({
      basePrice: 315,
      addOnCount: 1,
      frequency: "repeat",
      time: "09:00",
      bookingCoverOptIn: false,
    }).total).toBe(345);
  });

  it("routes notifications through the approved channel hierarchy", () => {
    expect(routeNotificationChannel("booking_confirmed")).toEqual(["in_app", "brevo_email"]);
    expect(routeNotificationChannel("contractor_on_the_way")).toEqual(["in_app", "whatsapp_urgent"]);
    expect(routeNotificationChannel("zootcred_update")).toEqual(["in_app"]);
    expect(routeNotificationChannel("payment_receipt")).toEqual(["brevo_email"]);
  });

  it("enforces sensitive data windows around active bookings", () => {
    const scheduledAt = "2026-05-18T10:00:00.000Z";
    expect(canAccessSensitiveBookingData({ scheduledAt, status: "confirmed", now: "2026-05-18T09:10:00.000Z" })).toBe(false);
    expect(canAccessSensitiveBookingData({ scheduledAt, status: "confirmed", now: "2026-05-18T09:20:00.000Z" })).toBe(true);
    expect(canAccessSensitiveBookingData({ scheduledAt, status: "confirmed", durationHours: 2, now: "2026-05-18T12:31:00.000Z" })).toBe(false);
    expect(canAccessSensitiveBookingData({ scheduledAt, status: "completed", completedAt: "2026-05-18T12:00:00.000Z", now: "2026-05-18T12:25:00.000Z" })).toBe(true);
    expect(canAccessSensitiveBookingData({ scheduledAt, status: "completed", completedAt: "2026-05-18T12:00:00.000Z", now: "2026-05-18T12:31:00.000Z" })).toBe(false);
    expect(canAccessSensitiveBookingData({ scheduledAt, status: "cancelled", cancelledAt: "2026-05-18T09:30:00.000Z", now: "2026-05-18T09:31:00.000Z" })).toBe(false);
  });

  it("explains when sensitive access will become available without exposing household data", () => {
    const scheduledAt = "2026-05-18T10:00:00.000Z";

    expect(getSensitiveAccessAvailability({
      scheduledAt,
      status: "assigned",
      now: "2026-05-18T09:10:00.000Z",
    })).toEqual({
      state: "locked",
      opensAt: "2026-05-18T09:15:00.000Z",
      minutesUntilOpen: 5,
    });

    expect(getSensitiveAccessAvailability({
      scheduledAt,
      status: "assigned",
      now: "2026-05-18T09:15:00.000Z",
    }).state).toBe("available");

    expect(getSensitiveAccessAvailability({
      scheduledAt,
      status: "cancelled",
      cancelledAt: "2026-05-18T09:12:00.000Z",
      now: "2026-05-18T09:15:00.000Z",
    }).state).toBe("closed");
  });

  it("builds pending payment records instead of claiming live provider payment", () => {
    expect(buildPendingPaymentRecord({
      bookingId: "booking-1",
      userId: "user-1",
      amount: 440,
      kind: "booking",
    })).toMatchObject({
      booking_id: "booking-1",
      user_id: "user-1",
      amount: 440,
      status: "pending",
      provider: "manual_pending",
      payment_kind: "booking",
    });
  });

  it("calculates ZootCred balance from immutable ledger entries", () => {
    expect(applyZootCredLedger([
      { amount: 100, direction: "credit" },
      { amount: 35, direction: "debit" },
      { amount: 20, direction: "credit" },
    ])).toBe(85);
  });

  it("requires all verification areas and training before activation", () => {
    expect(getActivationReadiness({
      verification: {
        id: "approved",
        selfie: "approved",
        address: "approved",
        banking: "approved",
        reference: "approved",
        background: "approved",
        thirdParty: "approved",
      },
      requiredTrainingPassed: true,
      backgroundCheckConsent: true,
    }).activationReady).toBe(true);

    expect(getActivationReadiness({
      verification: {
        id: "approved",
        selfie: "approved",
        address: "pending",
        banking: "approved",
        reference: "approved",
        background: "approved",
        thirdParty: "approved",
      },
      requiredTrainingPassed: true,
      backgroundCheckConsent: true,
    }).activationReady).toBe(false);
  });
});
