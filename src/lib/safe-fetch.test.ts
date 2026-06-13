import { describe, expect, it, vi } from "vitest";
import { isAllowedUrl, safeFetch } from "./safe-fetch";

describe("safe fetch", () => {
  it("allows only approved https provider domains", () => {
    expect(isAllowedUrl("https://api.twilio.com/2010-04-01/Accounts")).toBe(true);
    expect(isAllowedUrl("https://foo.supabase.co/functions/v1/test")).toBe(true);
    expect(isAllowedUrl("http://api.twilio.com")).toBe(false);
    expect(isAllowedUrl("https://localhost/internal")).toBe(false);
    expect(isAllowedUrl("https://127.0.0.1/internal")).toBe(false);
    expect(isAllowedUrl("https://192.168.1.20/internal")).toBe(false);
    expect(isAllowedUrl("https://169.254.169.254/latest/meta-data")).toBe(false);
    expect(isAllowedUrl("https://example.com/callback")).toBe(false);
  });

  it("blocks disallowed requests before fetch is called", async () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(safeFetch("https://example.com")).rejects.toThrow("Blocked request");
    expect(fetchMock).not.toHaveBeenCalled();

    globalThis.fetch = originalFetch;
  });
});
