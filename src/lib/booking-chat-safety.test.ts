import { describe, expect, it } from "vitest";

import { getBookingChatSafety } from "./booking-chat-safety";

describe("booking chat safety", () => {
  it("allows ordinary booking coordination text", () => {
    expect(getBookingChatSafety("I am running five minutes late but still on the way.")).toEqual({
      allowed: true,
      flags: [],
    });
  });

  it("blocks direct phone numbers", () => {
    const result = getBookingChatSafety("Call me on +27 82 123 4567");
    expect(result.allowed).toBe(false);
    expect(result.flags).toContain("phone_number");
  });

  it("blocks access code sharing", () => {
    const result = getBookingChatSafety("The gate code is 1234");
    expect(result.allowed).toBe(false);
    expect(result.flags).toContain("access_code");
  });

  it("blocks off-platform payment and messaging prompts", () => {
    const result = getBookingChatSafety("WhatsApp me and I can take cash next time");
    expect(result.allowed).toBe(false);
    expect(result.flags).toContain("off_platform");
  });
});
