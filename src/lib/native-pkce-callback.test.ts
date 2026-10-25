import { expect, it, vi } from "vitest";
import { createPkceCallbackConsumer } from "../../mobile/src/lib/pkce-callback";
const redirect = "xoot://auth/callback";
const code = "synthetic-pkce-code-123";
it("exchanges a PKCE code once when the browser and deep-link handler both receive it", async () => {
  const exchange = vi.fn(async () => {}); const consume = createPkceCallbackConsumer(exchange);
  expect(await Promise.all([consume(`${redirect}?code=${code}`, redirect), consume(`${redirect}?code=${code}`, redirect)])).toEqual([true, true]);
  expect(exchange).toHaveBeenCalledTimes(1); expect(exchange).toHaveBeenCalledWith(code);
});
it.each(["xoot://auth/other", "evil://auth/callback", "xoot://evil/callback", "xoot://user:password@auth/callback"])("ignores an unrelated destination without consuming the code: %s", async url => {
  const exchange = vi.fn(); expect(await createPkceCallbackConsumer(exchange)(`${url}?code=${code}`, redirect)).toBeNull(); expect(exchange).not.toHaveBeenCalled();
});
it.each(["?error=access_denied", "?code=short", `?code=${code}&code=${code}`, "#access_token=synthetic&refresh_token=synthetic", "?access_token=synthetic&refresh_token=synthetic"])("does not accept an error, ambiguous code or unbound token link: %s", async suffix => {
  const exchange = vi.fn(); await expect(createPkceCallbackConsumer(exchange)(redirect + suffix, redirect)).rejects.toThrow(); expect(exchange).not.toHaveBeenCalled();
});
it("preserves PKCE exchange errors instead of reporting completion", async () => {
  const exchange = vi.fn(async () => { throw new Error("Synthetic bad verifier"); });
  await expect(createPkceCallbackConsumer(exchange)(`${redirect}?code=${code}`, redirect)).rejects.toThrow("Synthetic bad verifier");
});
it("keeps a slow exchange coalesced instead of evicting it while it is still pending", async () => {
  let clock = 0; let finish!: () => void;
  const exchange = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
  const consume = createPkceCallbackConsumer(exchange, () => clock);
  const first = consume(`${redirect}?code=${code}`, redirect);
  await Promise.resolve(); clock = 121_000;
  const second = consume(`${redirect}?code=${code}`, redirect);
  await Promise.resolve(); expect(exchange).toHaveBeenCalledTimes(1);
  finish(); expect(await Promise.all([first, second])).toEqual([true, true]);
});
