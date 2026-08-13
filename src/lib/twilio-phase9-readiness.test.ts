import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const readRepoFile = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf8");

describe("Phase 9 Twilio Verify and masked voice readiness", () => {
  const migration = readRepoFile("supabase/migrations/20260630102715_phase9_twilio_verify_masked_voice.sql");
  const maskedCallFunction = readRepoFile("supabase/functions/create-masked-call/index.ts");
  const opsWorkflowFunction = readRepoFile("supabase/functions/ops-workflow/index.ts");
  const supabaseConfig = readRepoFile("supabase/config.toml");

  it("keeps Twilio channels behind disabled operational controls", () => {
    expect(migration).toContain("twilio.verify_otp");
    expect(migration).toContain("twilio.masked_voice");
    expect(migration).toContain("twilio.whatsapp_urgent");
    expect(migration).toMatch(/'twilio\.masked_voice'[\s\S]*false/);
    expect(migration).toMatch(/'twilio\.verify_otp'[\s\S]*false/);
  });

  it("records Verify attempts without raw OTP or destination values", () => {
    expect(migration).toContain("create table if not exists public.twilio_verify_attempts");
    expect(migration).toContain("to_hash text not null");
    expect(migration).toContain("OTP code is never returned or stored");
    expect(migration).toContain("twilio_verify_attempts_admin_read");
  });

  it("forces masked calls through a service-role eligibility helper", () => {
    expect(migration).toContain("private.can_create_masked_call");
    expect(migration).toContain("not_booking_participant");
    expect(migration).toContain("masked_voice_requires_accepted_active_booking");
    expect(migration).toContain("grant execute on function private.can_create_masked_call(uuid, uuid) to service_role");
    expect(migration).toContain("revoke insert, update, delete on table public.masked_call_sessions from authenticated");
  });

  it("prohibits recording and transcription in masked voice flows", () => {
    expect(migration).toContain("masked_call_sessions_no_recording");
    expect(migration).toContain("check (recording_consent = false)");
    expect(maskedCallFunction).toContain("recording_enabled: false");
    expect(maskedCallFunction).toContain("transcription_enabled: false");
    expect(opsWorkflowFunction).toContain("recording_enabled: false");
    expect(opsWorkflowFunction).toContain("transcription_enabled: false");
  });

  it("requires rate limits, eligibility and provider gates before provider calls", () => {
    expect(maskedCallFunction).toContain("consumeRateLimit");
    expect(maskedCallFunction).toContain("can_create_masked_call");
    expect(maskedCallFunction).toContain("twilio.operational_messages");
    expect(maskedCallFunction).toContain("twilio.masked_voice");
    expect(maskedCallFunction).toMatch(/if \(providerAllowed && clientPhone && xooterPhone\)/);
    expect(opsWorkflowFunction).toContain("can_create_masked_call");
    expect(opsWorkflowFunction).toContain("twilio.masked_voice");
  });

  it("keeps provider webhooks public but app actions authenticated", () => {
    expect(supabaseConfig).toMatch(/\[functions\.create-masked-call\]\s+verify_jwt = true/);
    expect(supabaseConfig).toMatch(/\[functions\.ops-workflow\]\s+verify_jwt = true/);
    expect(supabaseConfig).toMatch(/\[functions\.twilio-message-webhook\]\s+verify_jwt = false/);
    expect(supabaseConfig).toMatch(/\[functions\.twilio-voice-webhook\]\s+verify_jwt = false/);
    expect(supabaseConfig).toMatch(/\[functions\.twilio-verify-webhook\]\s+verify_jwt = false/);
  });
});
