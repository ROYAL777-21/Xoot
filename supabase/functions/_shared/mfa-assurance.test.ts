import { describe, expect, it } from "vitest";
import { mfaSessionFromVerifiedBearer } from "./mfa-assurance";
const user = "11111111-1111-4111-8111-111111111111";
const session = "22222222-2222-4222-8222-222222222222";
// Decoder tests only. Authentication is a prerequisite in the route, not provided by this fixture.
const bearer = (claims: Record<string, unknown>) => `Bearer e30.${btoa(JSON.stringify(claims))}.synthetic_signature`;
describe("assurance on a previously verified bearer", () => {
  it.each([null, "Bearer broken", bearer({ sub: user, aal: "aal1", session_id: session }), bearer({ sub: "another-user", aal: "aal2", session_id: session }), bearer({ sub: user, aal: "aal2" }), bearer({ sub: user, aal: "aal2", session_id: "malformed" })])("refuses absent/lower/different/invalid assurance %s", authorization => {
    expect(mfaSessionFromVerifiedBearer(authorization, user)).toBeNull();
  });
  it("extracts the matching AAL2 session for the database to recheck", () => {
    expect(mfaSessionFromVerifiedBearer(bearer({ sub: user, aal: "aal2", session_id: session }), user)).toBe(session);
  });
});
