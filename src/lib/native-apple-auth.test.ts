import { createHash } from "node:crypto";
import { expect, it, vi } from "vitest";
import { performAppleSignIn } from "../../mobile/src/lib/apple-auth-flow";

function fixture() {
  const random = vi.fn().mockResolvedValueOnce("synthetic-raw-nonce").mockResolvedValueOnce("synthetic-state");
  const authenticate = vi.fn(async () => ({ identityToken: "synthetic-id-token", state: "synthetic-state" }));
  const exchange = vi.fn(async () => ({ session: { user: "synthetic-user" }, error: null as unknown }));
  return { random, sha256: async (value: string) => createHash("sha256").update(value).digest("hex"), authenticate, exchange };
}
it("binds the Apple request with a digest, then exchanges the ID token with the original nonce", async () => {
  const f = fixture(); expect(await performAppleSignIn(f)).toEqual({ user: "synthetic-user" });
  expect(f.authenticate).toHaveBeenCalledWith({ nonce: createHash("sha256").update("synthetic-raw-nonce").digest("hex"), state: "synthetic-state" });
  expect(f.exchange).toHaveBeenCalledWith("synthetic-id-token", "synthetic-raw-nonce");
});
it.each(["different", null])("rejects a mismatched or missing response state before exchange", async state => {
  const f = fixture(); f.authenticate.mockResolvedValue({ identityToken: "synthetic-id-token", state: state as string });
  await expect(performAppleSignIn(f)).rejects.toThrow(/could not be verified/); expect(f.exchange).not.toHaveBeenCalled();
});
it("does not exchange a missing ID token", async () => {
  const f = fixture(); f.authenticate.mockResolvedValue({ identityToken: null as unknown as string, state: "synthetic-state" });
  await expect(performAppleSignIn(f)).rejects.toThrow(/identity token/); expect(f.exchange).not.toHaveBeenCalled();
});
it("preserves cancellation without exchanging or manufacturing a session", async () => {
  const f = fixture(); const cancel = { code: "ERR_REQUEST_CANCELED" }; f.authenticate.mockRejectedValue(cancel);
  await expect(performAppleSignIn(f)).rejects.toBe(cancel); expect(f.exchange).not.toHaveBeenCalled();
});
it("propagates an exchange failure", async () => {
  const f = fixture(); const error = new Error("Synthetic provider failure"); f.exchange.mockResolvedValue({ session: null as unknown as { user: string }, error });
  await expect(performAppleSignIn(f)).rejects.toBe(error);
});
