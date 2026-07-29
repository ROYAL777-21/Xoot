import { describe, expect, it } from "vitest";

import {
  buildPersonalizedNotificationDecision,
  containsSensitiveNotificationText,
  sanitizeNotificationText,
} from "./notification-personalization";

describe("notification personalization", () => {
  it("sanitizes sensitive text before it can leave the app", () => {
    expect(containsSensitiveNotificationText("Gate code is 1234")).toBe(true);
    expect(sanitizeNotificationText("Gate code is 1234")).toBe("Open Xoot to view this securely.");
  });

  it("keeps sensitive access notifications on safe app channels only", () => {
    const decision = buildPersonalizedNotificationDecision({
      category: "sensitive_access",
      urgency: "high",
      title: "Access details are ready",
      body: "Gate code is 1234. Open the booking.",
      route: "/zooter/jobs/job-123",
      profile: {
        role: "zooter",
        preferredChannels: ["in_app", "expo_push", "brevo_email", "whatsapp_urgent"],
        behaviorSignals: ["zooter_active_today"],
      },
    });

    expect(decision.status).toBe("send");
    expect(decision.channels).toEqual(["in_app", "expo_push"]);
    expect(decision.body).toBe("Open Xoot to view this securely.");
    expect(decision.reasonCodes).toContain("sensitive_access_app_required");
    expect(decision.reasonCodes).toContain("sensitive_text_sanitized");
  });

  it("suppresses marketing without consent", () => {
    const decision = buildPersonalizedNotificationDecision({
      category: "marketing",
      title: "Care+ can make the next clean easier",
      body: "Join Care+ when you are ready.",
      route: "/care-plus",
      profile: {
        role: "customer",
        marketingConsent: false,
        behaviorSignals: ["care_plus_candidate"],
      },
    });

    expect(decision.status).toBe("suppress");
    expect(decision.reasonCodes).toEqual(["marketing_consent_missing"]);
  });

  it("uses in-app only during quiet hours for non-urgent nudges", () => {
    const decision = buildPersonalizedNotificationDecision({
      category: "care_plus",
      urgency: "low",
      title: "Your Sunday reset can be easier",
      body: "Open Xoot to save your home preferences.",
      route: "/care-plus",
      profile: {
        role: "customer",
        localHour: 23,
        preferredChannels: ["in_app", "expo_push", "brevo_email"],
        behaviorSignals: ["repeat_customer"],
      },
    });

    expect(decision.status).toBe("send");
    expect(decision.channels).toEqual(["in_app"]);
    expect(decision.reasonCodes).toContain("quiet_hours");
  });

  it("allows job-day booking pushes when behavior signals show time sensitivity", () => {
    const decision = buildPersonalizedNotificationDecision({
      category: "booking",
      urgency: "normal",
      title: "Your booking needs a quick check",
      body: "Open Xoot for the latest status.",
      route: "/app/bookings/booking-123",
      profile: {
        role: "customer",
        localHour: 22,
        preferredChannels: ["in_app", "expo_push"],
        behaviorSignals: ["job_day"],
      },
    });

    expect(decision.status).toBe("send");
    expect(decision.channels).toEqual(["in_app", "expo_push"]);
    expect(decision.personalizationTags).toContain("booking_operations");
  });

  it("keeps recently opened low-priority routes in the app instead of pushing again", () => {
    const decision = buildPersonalizedNotificationDecision({
      category: "booking",
      urgency: "low",
      title: "Finish your cleaning booking",
      body: "Your selected service is waiting.",
      route: "/app",
      profile: {
        role: "customer",
        recentlyOpenedRoutes: ["/app"],
        behaviorSignals: ["abandoned_booking_15m"],
      },
    });

    expect(decision.status).toBe("route_only");
    expect(decision.channels).toEqual(["in_app"]);
    expect(decision.reasonCodes).toEqual(["recent_route_opened"]);
    expect(decision.personalizationTags).toContain("booking_recovery");
  });

  it("removes fatigued external channels without losing the in-app record", () => {
    const decision = buildPersonalizedNotificationDecision({
      category: "support",
      urgency: "normal",
      title: "Support has an update",
      body: "Open Xoot for the next step.",
      route: "/app/support",
      profile: {
        role: "customer",
        preferredChannels: ["in_app", "expo_push", "brevo_email"],
        channelFatigue: { expo_push: 3, brevo_email: 4 },
        behaviorSignals: ["support_waiting"],
      },
    });

    expect(decision.status).toBe("send");
    expect(decision.channels).toEqual(["in_app"]);
    expect(decision.reasonCodes).toContain("channel_fatigue");
    expect(decision.personalizationTags).toContain("support_followup");
  });

  it("handles inactive re-engagement conservatively", () => {
    const decision = buildPersonalizedNotificationDecision({
      category: "marketing",
      urgency: "low",
      title: "Xoot can help with your next reset",
      body: "Open Xoot when you are ready.",
      route: "/care-plus",
      profile: {
        role: "customer",
        localHour: 12,
        marketingConsent: true,
        preferredChannels: ["in_app", "expo_push", "brevo_email"],
        behaviorSignals: ["inactive_14d"],
      },
    });

    expect(decision.status).toBe("send");
    expect(decision.channels).toEqual(["in_app", "brevo_email"]);
    expect(decision.reasonCodes).toContain("inactive_reengagement_conservative");
    expect(decision.personalizationTags).toContain("inactive_reengagement");
  });

  it("allows urgent support WhatsApp only when it is explicitly preferred", () => {
    const decision = buildPersonalizedNotificationDecision({
      category: "support",
      urgency: "urgent",
      title: "Urgent support update",
      body: "Open Xoot for the next safe step.",
      route: "/support",
      profile: {
        role: "customer",
        preferredChannels: ["in_app", "expo_push", "whatsapp_urgent"],
        behaviorSignals: ["support_waiting"],
      },
    });

    expect(decision.status).toBe("send");
    expect(decision.channels).toEqual(["in_app", "expo_push", "whatsapp_urgent"]);
  });

  it("rejects role-inappropriate notification categories", () => {
    const decision = buildPersonalizedNotificationDecision({
      category: "zooter_jobs",
      title: "New job offer",
      body: "Open Xoot.",
      route: "/zooter/jobs",
      profile: { role: "customer" },
    });

    expect(decision.status).toBe("suppress");
    expect(decision.reasonCodes).toEqual(["role_category_denied"]);
  });
});
