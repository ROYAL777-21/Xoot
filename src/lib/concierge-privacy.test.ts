import { describe, expect, it } from "vitest";

import { redactConciergeClientText } from "./concierge-privacy";

describe("Concierge client privacy redaction", () => {
  it("redacts sensitive account, payment, access and provider values before support feedback is sent", () => {
    const redacted = redactConciergeClientText(
      [
        "Email me at client@example.com",
        "phone +27 82 123 4567",
        "card 4111 1111 1111 1111",
        "gate code is 1234",
        "OTP is 882211",
        "api key is sk-123456789abcdef",
        "token is cfat_verysecretvalue",
      ].join(" "),
    );

    expect(redacted).not.toContain("client@example.com");
    expect(redacted).not.toContain("+27 82 123 4567");
    expect(redacted).not.toContain("4111 1111 1111 1111");
    expect(redacted).not.toContain("1234");
    expect(redacted).not.toContain("882211");
    expect(redacted).not.toContain("sk-123456789abcdef");
    expect(redacted).not.toContain("cfat_verysecretvalue");
    expect(redacted).toContain("[redacted]");
  });

  it("strips unsafe markup-like characters and enforces the requested length cap", () => {
    const redacted = redactConciergeClientText("<script>`bad`\\value</script> ".repeat(100), 80);

    expect(redacted).not.toMatch(/[<>`\\]/);
    expect(redacted.length).toBeLessThanOrEqual(80);
  });
});
