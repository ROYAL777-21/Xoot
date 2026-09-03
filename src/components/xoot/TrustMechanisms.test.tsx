import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TrustMechanisms } from "./TrustMechanisms";
import { SAFETY_READINESS, canArmSos } from "@/lib/safety";

describe("TrustMechanisms", () => {
  it("does not advertise SOS as available while the readiness gate is closed", () => {
    // The single most dangerous claim on the site. `SAFETY_READINESS` is "schema_pending",
    // so the button does not arm — and a person in trouble pressing something that does
    // nothing is worse than no button.
    expect(SAFETY_READINESS).toBe("schema_pending");
    expect(canArmSos()).toBe(false);

    render(<TrustMechanisms />);
    const sos = screen.getByText(/SOS — for both sides/).closest("div.rounded-3xl");
    expect(sos).not.toBeNull();
    expect(sos?.textContent).toContain("Not switched on yet");
    expect(sos?.textContent).not.toContain("Live now");
  });

  it("keeps the reason the SOS gate exists, rather than a coming-soon teaser", () => {
    render(<TrustMechanisms />);
    // If this sentence is ever softened, the card stops explaining a deliberate safety
    // decision and starts reading like a roadmap item.
    expect(
      screen.getByText(/pressing something that does nothing is worse than no button/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/112 has been dialled from a real handset/i)).toBeInTheDocument();
  });

  it("keeps the honest limits the handoff volunteered", () => {
    render(<TrustMechanisms />);
    const copy = document.body.textContent ?? "";
    // iOS detects capture, it does not prevent it. Claiming prevention on both platforms
    // would be the easiest and least noticeable overstatement in this section.
    expect(copy).toMatch(/iOS: capture is detected and logged/i);
    expect(copy).toMatch(/no software stops a second phone photographing a screen/i);
    // The access-code encryption is deployed but unproven end to end.
    expect(copy).toMatch(/not yet proven by a code stored and read back/i);
    // Nobody has been through screening yet.
    expect(copy).toMatch(/No Xooter has been through it yet/i);
  });

  it("claims no completed screening record and no testimonial", () => {
    render(<TrustMechanisms />);
    const copy = document.body.textContent ?? "";
    expect(copy).not.toMatch(/\bevery Xooter has\b/i);
    expect(copy).not.toMatch(/\bthousands\b/i);
    expect(copy).not.toMatch(/\bMIE\b/);
    expect(copy).not.toMatch(/R\s?\d/);
  });
});
