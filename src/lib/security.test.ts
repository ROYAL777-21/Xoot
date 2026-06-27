import { describe, expect, it } from "vitest";
import { isAllowedOutboundUrl, isPrivateHost, sanitiseCacheKey, sanitisePlainText } from "./security";

describe("security helpers", () => {
  it("blocks private and metadata hosts", () => {
    expect(isPrivateHost("localhost")).toBe(true);
    expect(isPrivateHost("127.0.0.1")).toBe(true);
    expect(isPrivateHost("10.0.0.5")).toBe(true);
    expect(isPrivateHost("172.16.10.2")).toBe(true);
    expect(isPrivateHost("192.168.1.10")).toBe(true);
    expect(isPrivateHost("169.254.169.254")).toBe(true);
  });

  it("allows only approved browser-safe https outbound hosts", () => {
    expect(isAllowedOutboundUrl("https://x.supabase.co/rest/v1/bookings")).toBe(true);
    expect(isAllowedOutboundUrl("https://api.mapbox.com/geocoding/v5/mapbox.places/Sandton.json")).toBe(true);
    expect(isAllowedOutboundUrl("https://api.twilio.com/2010-04-01/Accounts")).toBe(false);
    expect(isAllowedOutboundUrl("https://api.brevo.com/v3/smtp/email")).toBe(false);
    expect(isAllowedOutboundUrl("http://api.twilio.com")).toBe(false);
    expect(isAllowedOutboundUrl("https://169.254.169.254/latest/meta-data")).toBe(false);
    expect(isAllowedOutboundUrl("https://evil.example/fetch")).toBe(false);
  });

  it("sanitises user-facing plain text", () => {
    expect(sanitisePlainText("<script>alert('x')</script> Gate\\code", 20)).toBe("scriptalert(x)/scrip");
  });

  it("keeps cache keys to known safe params", () => {
    const params = new URLSearchParams("service=airbnb<script>&role=admin&page=2&address=Sandton%20%23A");
    expect(sanitiseCacheKey(params)).toBe("service=airbnbscript&page=2&address=Sandton+A");
  });
});
