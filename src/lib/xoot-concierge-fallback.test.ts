import { describe, expect, it } from "vitest";

import { getLocalXootConciergeReply } from "./xoot-concierge-fallback";

describe("Xoot Concierge local knowledge fallback", () => {
  it("gives signed-in users protected next steps for common booking intents", () => {
    expect(getLocalXootConciergeReply("How long should I book for a deep clean?", true)?.cta).toEqual({
      label: "Choose service duration",
      to: "/app",
    });

    expect(getLocalXootConciergeReply("Where is my cleaner?", true)?.cta).toEqual({
      label: "Open bookings",
      to: "/app/bookings",
    });
  });

  it("routes guests to sign-in for protected flows", () => {
    expect(getLocalXootConciergeReply("Book a cleaner for tomorrow", false)?.cta).toEqual({
      label: "Sign in to continue",
      to: "/auth",
    });
  });

  it("covers Care+, business cleaning, property managers and voice assistant handoff", () => {
    const carePlusReply = getLocalXootConciergeReply("What does Care+ include?", false);
    expect(carePlusReply?.response).toContain("approved Care+ policy");
    expect(carePlusReply?.response).not.toContain("R99/month");
    expect(carePlusReply?.cta).toEqual({
      label: "View Care+ membership",
      to: "/care-plus",
    });
    expect(getLocalXootConciergeReply("I need my office cleaned weekly", true)?.cta?.to).toBe("/app/properties/office");
    expect(getLocalXootConciergeReply("Airbnb turnover", true)?.cta?.to).toBe("/app/properties/airbnb");
    expect(getLocalXootConciergeReply("I am a property manager with handovers", true)?.cta?.to).toBe("/app/properties");
    expect(getLocalXootConciergeReply("Can Siri book a cleaner for Monday?", true)?.response).toContain("Voice can start the handoff");
    expect(getLocalXootConciergeReply("How do I become a Xooter?", true)?.cta?.to).toBe("/xooter/apply");
  });

  it("keeps sensitive access data out of chat", () => {
    const response = getLocalXootConciergeReply("Can I send the gate code here?", true)?.response ?? "";

    expect(response).toContain("Do not put access codes");
    expect(response).not.toContain("/app");
  });
});
