import { describe, expect, it } from "vitest";
import {
  buildLifecycleTriggers,
  buildReadyModes,
  buildServiceRecoverySignals,
  getHomeMemoryReadinessScore,
  getPropertyReadinessScore,
  mapPropertyAccountToProfile,
  type BookingSnapshot,
  type HomeMemorySnapshot,
} from "./useHouseholdOperatingLayer";

describe("household operating layer helpers", () => {
  it("scores Home Memory from real saved profile fields", () => {
    expect(getHomeMemoryReadinessScore({
      id: "home",
      label: "Home",
      pet_notes: "Cat stays inside",
      parking_instructions: "Basement bay",
      cleaning_preferences: "Low scent",
      fragile_areas: "Dining cabinet",
      favourite_products: "Client supplies",
      has_access_notes: true,
    })).toBe(100);
  });

  it("maps property accounts into display profiles without fake history", () => {
    const profile = mapPropertyAccountToProfile({
      id: "office",
      account_type: "office_estate",
      name: "Rosebank office",
      default_service_type: "office_clean",
      preferred_days: ["Tuesday"],
      notes: "Boardroom first",
      status: "active",
    });

    expect(profile.type).toBe("small_office");
    expect(profile.name).toBe("Rosebank office");
    expect(profile.cleaningHistoryCount).toBe(0);
    expect(profile.readinessScore).toBe(getPropertyReadinessScore({
      id: "office",
      account_type: "office_estate",
      name: "Rosebank office",
      default_service_type: "office_clean",
      preferred_days: ["Tuesday"],
      notes: "Boardroom first",
      status: "active",
    }));
  });

  it("builds lifecycle reminders from real booking cadence", () => {
    const reminders = buildLifecycleTriggers("2026-06-01T08:00:00.000Z", 1, 50, new Date("2026-06-29T08:00:00.000Z"));

    expect(reminders.map((reminder) => reminder.id)).toContain("rebook-gap");
    expect(reminders.map((reminder) => reminder.id)).toContain("complete-home-memory");
    expect(reminders.map((reminder) => reminder.id)).toContain("property-ops");
  });

  it("surfaces ready modes from Home Memory, host properties, and booking history", () => {
    const homeMemory: HomeMemorySnapshot = {
      id: "home",
      label: "Home",
      petNotes: "No pets",
      parkingInstructions: "Street",
      cleaningPreferences: "Low scent",
      fragileAreas: "None",
      favouriteProducts: "None",
      hasAccessNotes: false,
      readinessScore: 80,
      updatedAt: null,
    };
    const bookings: BookingSnapshot[] = [{
      id: "booking",
      scheduledAt: "2026-06-28T08:00:00.000Z",
      status: "completed",
      service: "Cleaning",
      durationHours: 3,
    }];

    const modes = buildReadyModes(homeMemory, [{
      id: "host",
      name: "Guest loft",
      type: "airbnb",
      suburb: "Host property",
      defaultService: "Airbnb",
      readinessScore: 75,
      cleaningHistoryCount: 0,
    }], bookings);

    expect(modes.map((mode) => mode.id)).toEqual(["home-memory", "guest-ready", "one-tap-rebook"]);
    expect(modes.every((mode) => mode.readinessScore >= 75)).toBe(true);
  });

  it("creates service recovery signals from open tickets and disrupted bookings", () => {
    const signals = buildServiceRecoverySignals([{
      id: "booking",
      scheduledAt: "2026-06-28T08:00:00.000Z",
      status: "replacement_required",
      service: "Cleaning",
      durationHours: 3,
    }], [{
      id: "ticket",
      subject: "Need help with yesterday",
      status: "open",
      created_at: "2026-06-28T09:00:00.000Z",
    }]);

    expect(signals).toHaveLength(2);
    expect(signals[0].title).toBe("Support follow-up open");
    expect(signals[1].priority).toBe("high");
  });
});
