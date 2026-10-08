import { describe, expect, it } from "vitest";
import { nativeSplitInviteUrl } from "../../mobile/src/lib/split-fare-invite";

describe("Native environment-specific invitations", () => {
  it("keeps staging and production distinct and encodes the same token", () => {
    expect(nativeSplitInviteUrl("https://staging.xoot.co.za/", "token/?#é")).toBe("https://staging.xoot.co.za/split/token%2F%3F%23%C3%A9");
    expect(nativeSplitInviteUrl("https://xoot.co.za", "token/?#é")).toBe("https://xoot.co.za/split/token%2F%3F%23%C3%A9");
  });
  it.each(["", "bad-url", "http://xoot.co.za", "javascript:alert(1)", "https://user:secret@xoot.co.za", "https://xoot.co.za/path", "https://xoot.co.za?query", "https://xoot.co.za#hash", " https://xoot.co.za"]) ("fails closed for site configuration %s", site => {
    expect(nativeSplitInviteUrl(site, "token")).toBeNull();
  });
  it("allows explicit local development origins and rejects missing tokens", () => {
    expect(nativeSplitInviteUrl("http://localhost:5173", "local")).toBe("http://localhost:5173/split/local");
    expect(nativeSplitInviteUrl("https://xoot.co.za", "")).toBeNull();
    expect(nativeSplitInviteUrl("https://xoot.co.za", "bad\nvalue")).toBeNull();
  });
});
