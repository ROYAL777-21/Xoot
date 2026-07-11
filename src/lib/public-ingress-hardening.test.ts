import { describe, expect, it } from "vitest";
import { verifyPaymentWebhook } from "../../supabase/functions/_shared/payment-webhook-auth.ts";
import {
  readJsonWithLimit,
  readRequestTextWithLimit,
} from "../../supabase/functions/_shared/request-body.ts";

const hmacHex = async (secret: string, body: string) => {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(body)));
  return Array.from(signature).map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

describe("public Edge Function ingress hardening", () => {
  it("rejects oversized streamed request bodies even without Content-Length", async () => {
    const request = new Request("https://example.test/functions/v1/support-respond", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: "x".repeat(512) }),
    });

    const result = await readRequestTextWithLimit(request, {
      maxBytes: 64,
      allowedContentTypes: ["application/json"],
    });

    expect(result).toEqual({ ok: false, status: 413, error: "request body too large" });
  });

  it("rejects unexpected media types and non-object JSON", async () => {
    const wrongType = await readJsonWithLimit(new Request("https://example.test", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "{}",
    }), 1024);
    expect(wrongType).toEqual({ ok: false, status: 415, error: "unsupported content type" });

    const arrayJson = await readJsonWithLimit(new Request("https://example.test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "[]",
    }), 1024);
    expect(arrayJson).toEqual({ ok: false, status: 400, error: "request body must be a JSON object" });
  });

  it("binds payment verification to the provider-specific signature header", async () => {
    const rawBody = JSON.stringify({ payment_reference: "test", status: "paid" });
    const ozowSignature = await hmacHex("ozow-secret", rawBody);
    const result = await verifyPaymentWebhook(
      rawBody,
      new Headers({ "x-ozow-signature": `sha256=${ozowSignature}` }),
      { stitch: "stitch-secret", ozow: "ozow-secret", internal: "internal-secret" },
    );

    expect(result).toEqual({ ok: true, provider: "ozow" });
  });

  it("rejects ambiguous payment signature headers", async () => {
    const result = await verifyPaymentWebhook(
      "{}",
      new Headers({ "x-stitch-signature": "a", "x-ozow-signature": "b" }),
      { stitch: "stitch-secret", ozow: "ozow-secret" },
    );

    expect(result).toEqual({
      ok: false,
      provider: null,
      reason: "ambiguous payment webhook signature headers",
    });
  });
});
