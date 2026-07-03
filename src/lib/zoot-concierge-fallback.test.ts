import { describe, expect, it } from "vitest";

import { getLocalZootConciergeReply } from "./zoot-concierge-fallback";

describe("Zoot Concierge local knowledge fallback", () => {
  it("gives signed-in users protected next steps for common booking intents", () => {
    expect(getLocalZootConciergeReply("How long should I book for a deep clean?", true)?.cta).toEqual({
      label: "Choose service duration",
      to: "/app",
    });

    expect(getLocalZootConciergeReply("Where is my cleaner?", true)?.cta).toEqual({
      label: "Open bookings",
      to: "/app/bookings",
    });
  });

  it("routes guests to sign-in for protected flows", () => {
    expect(getLocalZootConciergeReply("Book a cleaner for tomorrow", false)?.cta).toEqual({
      label: "Sign in to continue",
      to: "/auth",
    });
  });

  it("covers Care+, business cleaning, property managers and voice assistant handoff", () => {
    const carePlusReply = getLocalZootConciergeReply("What does Care+ include?", false);
    expect(carePlusReply?.response).toContain("approved Care+ policy");
    expect(carePlusReply?.response).not.toContain("R99/month");
    expect(carePlusReply?.cta).toEqual({
      label: "View Care+ membership",
      to: "/care-plus",
    });
    expect(getLocalZootConciergeReply("I need my office cleaned weekly", true)?.cta?.to).toBe("/app/properties/office");
    expect(getLocalZootConciergeReply("Airbnb turnover", true)?.cta?.to).toBe("/app/properties/airbnb");
    expect(getLocalZootConciergeReply("I am a property manager with handovers", true)?.cta?.to).toBe("/app/properties");
    expect(getLocalZootConciergeReply("Can Siri book a cleaner for Monday?", true)?.response).toContain("Voice can start the handoff");
    expect(getLocalZootConciergeReply("How do I become a Zooter?", true)?.cta?.to).toBe("/zooter/apply");
  });

  it("keeps sensitive access data out of chat", () => {
    const response = getLocalZootConciergeReply("Can I send the gate code here?", true)?.response ?? "";

    expect(response).toContain("Do not put access codes");
    expect(response).not.toContain("/app");
  });
});
