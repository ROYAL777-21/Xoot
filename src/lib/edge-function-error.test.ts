import { describe, expect, it } from "vitest";

import { describeInvokeError } from "./edge-function-error";

const functionsError = (body: unknown, message = "Edge Function returned a non-2xx status code") => ({
  message,
  context: new Response(JSON.stringify(body), { status: 400, headers: { "Content-Type": "application/json" } }),
});

describe("describeInvokeError", () => {
  it("extracts the function's own error message from the response body", async () => {
    const detail = await describeInvokeError(
      functionsError({ success: false, error: "application is missing required fields" }),
    );
    expect(detail).toBe("application is missing required fields");
  });

  it("appends the missing field list in human-readable form", async () => {
    const detail = await describeInvokeError(
      functionsError({
        success: false,
        error: "application is missing required fields",
        missing: ["date_of_birth", "document_selfie", "approved_launch_suburb"],
      }),
    );
    expect(detail).toContain("Missing: date of birth, document selfie, approved launch suburb");
  });

  it("falls back to the reason field when error is absent", async () => {
    const detail = await describeInvokeError(functionsError({ success: false, reason: "provider not ready" }));
    expect(detail).toBe("provider not ready");
  });

  it("keeps the original message for network errors with no response context", async () => {
    const detail = await describeInvokeError(new Error("fetch failed"));
    expect(detail).toBe("fetch failed");
  });

  it("returns a readable sentence when there is nothing to unpack", async () => {
    expect(await describeInvokeError(null)).toContain("Something went wrong");
    expect(await describeInvokeError({})).toContain("Something went wrong");
  });
});
