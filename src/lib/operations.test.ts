import { describe, expect, it } from "vitest";
import {
  applyXootCredLedger,
  buildXootBlackLineItem,
  buildPendingPaymentRecord,
  buildPaymentReconciliationReference,
  canAccessSensitiveBookingData,
  canCreateProviderCheckout,
  canOfferXootBlack,
  canReleaseXooterPayout,
  calculateBookingQuote,
  getActivationReadiness,
  getAcceptedXooterJobAddress,
  getSensitiveAccessAvailability,
  isApprovedLaunchRegion,
  resolveLaunchRegion,
  routeNotificationChannel,
} from "./operations";

describe("Xoot operating rules", () => {
  it("validates launch geography against approved suburbs and nearby wording", () => {
    expect(isApprovedLaunchRegion("12 Alice Lane, Sandton")).toBe(true);
    expect(isApprovedLaunchRegion("Dainfern Valley Estate")).toBe(true);
    expect(isApprovedLaunchRegion("Cape Town CBD")).toBe(false);
  });

  it("rejects embedded or spoofed launch-area names, but accepts full suburb tokens", () => {
    for (const bad of [
      "12 Example Lane, NotSandton",
      "Sandtonville, Cape Town",
      "Somewhere near Fourwaysville",
      "Rosebanking Street, Durban",
      "UnderHyde Park Avenue",
      "Mymidrand Address",
      "",
    ]) {
      expect(isApprovedLaunchRegion(bad), bad).toBe(false);
      expect(resolveLaunchRegion(bad), bad).toBe("");
    }
    for (const [address, expected] of [
      ["14 Fredman Drive, Sandton, Gauteng", "sandton"],
      ["Unit 3, Hyde Park, Johannesburg", "hyde park"],
      ["6 My Road, Dainfern Valley Estate", "dainfern"],
      ["12 road, Rosebank", "rosebank"],
      ["Suite, Braamfontein, Johannesburg", "braamfontein"],
    ]) {
      expect(resolveLaunchRegion(address)).toBe(expected);
    }
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
      bookingCover: 22,
      total: 441,
      estimatedAddOnHours: 2,
    });
  });

  /*
   * The booking fee follows membership, not frequency (founder decision 2026-08-12).
   *
   * This test used to assert the opposite — that a recurring booking had the fee removed. Both
   * halves are asserted here rather than just the member case, because the recurring-non-member
   * total is the one that changed and the one a "tidying" edit would quietly revert.
   */
  it("charges the booking fee on recurring bookings and waives it for Care+ members", () => {
    const recurring = {
      basePrice: 315,
      addOnCount: 1,
      frequency: "repeat" as const,
      time: "09:00",
      bookingCoverOptIn: false,
    };
    expect(calculateBookingQuote(recurring).serviceFee).toBe(39);
    expect(calculateBookingQuote(recurring).total).toBe(384);

    const member = calculateBookingQuote({ ...recurring, carePlusMember: true });
    expect(member.serviceFee).toBe(0);
    expect(member.total).toBe(345);
  });

  it("routes notifications through the approved channel hierarchy", () => {
    expect(routeNotificationChannel("booking_confirmed")).toEqual(["in_app", "brevo_email"]);
    expect(routeNotificationChannel("contractor_on_the_way")).toEqual(["in_app", "whatsapp_urgent"]);
    expect(routeNotificationChannel("xootcred_update")).toEqual(["in_app"]);
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

  it("reveals the destination only after a Xooter accepts the job", () => {
    const address = "12 Alice Lane, Sandton";

    expect(getAcceptedXooterJobAddress({ jobState: "offered", address })).toBeNull();
    expect(getAcceptedXooterJobAddress({ jobState: "accepted", address })).toBe(address);
    expect(getAcceptedXooterJobAddress({ jobState: "completed", address })).toBeNull();
    expect(getAcceptedXooterJobAddress({ jobState: "accepted", address: "   " })).toBeNull();
  });

  it("keeps Xoot Black unavailable unless every approval and eligibility gate passes", () => {
    const eligible = {
      featureEnabled: true,
      explicitOptIn: true,
      xooterTier: "elite_verified",
      xooterVerified: true,
      equipmentEvidenceApproved: true,
      areaPilotApproved: true,
      legalApproved: true,
    };

    expect(canOfferXootBlack(eligible)).toBe(true);
    expect(canOfferXootBlack({ ...eligible, featureEnabled: false })).toBe(false);
    expect(canOfferXootBlack({ ...eligible, explicitOptIn: false })).toBe(false);
    expect(canOfferXootBlack({ ...eligible, xooterTier: "standard" })).toBe(false);
    expect(canOfferXootBlack({ ...eligible, equipmentEvidenceApproved: false })).toBe(false);
    expect(canOfferXootBlack({ ...eligible, areaPilotApproved: false })).toBe(false);
    expect(canOfferXootBlack({ ...eligible, legalApproved: false })).toBe(false);
  });

  it("builds an explicit Xoot Black line item only from a positive backend amount", () => {
    expect(buildXootBlackLineItem(175.555)).toEqual({
      item_key: "xoot_black_service",
      label: "Xoot Black service",
      quantity: 1,
      unit_amount: 175.56,
      total_amount: 175.56,
      currency: "ZAR",
    });
    expect(buildXootBlackLineItem(0)).toBeNull();
    expect(buildXootBlackLineItem(Number.NaN)).toBeNull();
  });

  it("keeps hosted payment checkout disabled until every provider gate is proven", () => {
    const ready = {
      provider: "payfast" as const,
      providerGateEnabled: true,
      hostedCheckoutConfigured: true,
      webhookSignatureVerified: true,
      callbackUrlsVerified: true,
      reconciliationVerified: true,
      approvalStatus: "approved" as const,
      frontendSuccessTrusted: false,
    };

    expect(canCreateProviderCheckout(ready)).toBe(true);
    expect(canCreateProviderCheckout({ ...ready, providerGateEnabled: false })).toBe(false);
    expect(canCreateProviderCheckout({ ...ready, webhookSignatureVerified: false })).toBe(false);
    expect(canCreateProviderCheckout({ ...ready, reconciliationVerified: false })).toBe(false);
    expect(canCreateProviderCheckout({ ...ready, approvalStatus: "pending" })).toBe(false);
    expect(canCreateProviderCheckout({ ...ready, frontendSuccessTrusted: true })).toBe(false);
  });

  it("builds non-secret payment reconciliation references", () => {
    expect(buildPaymentReconciliationReference({
      provider: "payfast",
      bookingId: "booking-123456789",
      paymentId: "payment-abcdefghi",
    })).toBe("XOOT-PAYFAST-BOOKING1-PAYMENTA");

    expect(buildPaymentReconciliationReference({
      provider: "payfast",
      bookingId: "abc",
      paymentId: "payment-abcdefghi",
    })).toBeNull();
  });

  it("blocks payout release when verification, step-up or hold gates are not clean", () => {
    const ready = {
      payoutsEnabled: true,
      verifiedPayoutAccount: true,
      stepUpRequiredForAccountChanges: true,
      pendingPayoutAccountChange: false,
      activeHold: false,
      trustOrDisputeReviewOpen: false,
    };

    expect(canReleaseXooterPayout(ready)).toBe(true);
    expect(canReleaseXooterPayout({ ...ready, payoutsEnabled: false })).toBe(false);
    expect(canReleaseXooterPayout({ ...ready, verifiedPayoutAccount: false })).toBe(false);
    expect(canReleaseXooterPayout({ ...ready, stepUpRequiredForAccountChanges: false })).toBe(false);
    expect(canReleaseXooterPayout({ ...ready, pendingPayoutAccountChange: true })).toBe(false);
    expect(canReleaseXooterPayout({ ...ready, activeHold: true })).toBe(false);
    expect(canReleaseXooterPayout({ ...ready, trustOrDisputeReviewOpen: true })).toBe(false);
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

  it("calculates XootCred balance from immutable ledger entries", () => {
    expect(applyXootCredLedger([
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
