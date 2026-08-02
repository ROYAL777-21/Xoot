import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  RECORDING_MODE,
  RECORDING_RETENTION_DAYS,
  SAFETY_READINESS,
  SA_EMERGENCY_NUMBER,
  SOS_AUDIBLE_BY_DEFAULT,
  SOS_COUNTDOWN_MS,
  canArmSos,
  canRecordVisit,
  sosCancelNeedsPin,
  sosSecondsRemaining,
} from "./safety";

const root = process.cwd();
const migration = readFileSync(
  join(root, "supabase/migrations/20260802160000_safety_sos_and_recording.sql"),
  "utf8",
);

/**
 * The migration with its `--` comments removed.
 *
 * Needed because the comments explain the rules the tests look for — "video is deliberately not
 * supported" contains "video", and the explanation of the encryption design contains "key".
 * Matching against prose would either fail a correct migration or pass an incorrect one.
 * `server-authority.test.ts` strips comments for the same reason.
 */
const sql = migration
  .replace(/^\s*--.*$/gm, "")
  // `comment on ... is '...'` is documentation too, but it is a string literal rather than a
  // `--` comment, so it survives the line strip and still carries the prose.
  .replace(/comment on [\s\S]*?';/g, "");

describe("SOS", () => {
  it("dials the number that works from any handset", () => {
    // 10111 is the SAPS landline number and depends on knowing which service you need. 112
    // routes from any network with no airtime.
    expect(SA_EMERGENCY_NUMBER).toBe("112");
  });

  it("gives five seconds to undo a false trigger", () => {
    expect(SOS_COUNTDOWN_MS).toBe(5_000);
    expect(sosSecondsRemaining(0)).toBe(5);
    expect(sosSecondsRemaining(2_400)).toBe(3);
    expect(sosSecondsRemaining(5_000)).toBe(0);
    expect(sosSecondsRemaining(9_999)).toBe(0);
  });

  it("makes cancelling free during the countdown and costly after dispatch", () => {
    // The threat model inverts at dispatch: before it, the likely canceller is the owner
    // undoing a pocket press; after it, it may be whoever the alert is about.
    expect(sosCancelNeedsPin(0)).toBe(false);
    expect(sosCancelNeedsPin(4_999)).toBe(false);
    expect(sosCancelNeedsPin(5_000)).toBe(true);
  });

  it("stays silent unless the user chooses otherwise", () => {
    // An audible alarm de-escalates some situations and escalates others. Not our call.
    expect(SOS_AUDIBLE_BY_DEFAULT).toBe(false);
  });

  it("keeps cancelled alerts rather than deleting them", () => {
    // A pattern of cancelled alerts at one address is a signal; deleting them erases it.
    expect(migration).toMatch(/'cancelled'/);
    expect(migration).not.toMatch(/delete from public\.safety_sos_alerts/);
  });

  it("accepts no client write to the alert table", () => {
    // The client cannot be trusted to report its own location or whether the dial succeeded.
    expect(migration).toMatch(
      /revoke insert, update, delete on public\.safety_sos_alerts from anon, authenticated/,
    );
  });
});

describe("visit recording", () => {
  it("is audio only", () => {
    expect(RECORDING_MODE).toBe("audio");
    // No video column, bucket or check may appear in the schema itself. The table comment says
    // why video is excluded, which is why this reads stripped SQL rather than the raw file.
    expect(sql).not.toMatch(/video/i);
  });

  it("expires unattached recordings", () => {
    expect(RECORDING_RETENTION_DAYS).toBe(30);
    expect(migration).toMatch(/purge_after/);
    expect(migration).toMatch(/purge_expired_recordings/);
  });

  it("only exposes a recording to the person who made it", () => {
    // Not the other party, and not an admin browsing the table. An admin reaches it through the
    // incident it is attached to, which leaves a trail.
    const policy = migration.slice(migration.indexOf('"recordings own readable"'));
    const using = policy.slice(0, policy.indexOf(";"));
    expect(using).toMatch(/recorder_id = \(select auth\.uid\(\)\)/);
    expect(using).not.toMatch(/has_role/);
  });

  it("records that both parties were notified, per recording", () => {
    // A settings-page toggle cannot prove notice for a specific visit; a column can.
    expect(migration).toMatch(/parties_notified_at timestamptz not null/);
  });

  it("never stores a decryption key beside the ciphertext", () => {
    // Client-side encryption buys nothing if the key rides along in the same row. Checks the
    // column names only — `primary key` and `foreign key` are structure, not secrets.
    const table = sql.slice(sql.indexOf("create table if not exists public.visit_recordings"));
    const columnNames = table
      .slice(0, table.indexOf(");"))
      .split("\n")
      .map((line) => line.trim().split(/\s+/)[0])
      .filter(Boolean);

    expect(columnNames.length).toBeGreaterThan(5);
    for (const name of columnNames) {
      expect(name).not.toMatch(/key|secret|passphrase|nonce/i);
    }
  });
});

describe("the cancel PIN", () => {
  const pinSql = readFileSync(join(root, "supabase/migrations/20260802170000_safety_pin.sql"), "utf8")
    .replace(/^\s*--.*$/gm, "")
    .replace(/comment on [\s\S]*?';/g, "");

  it("stores a hash, never the PIN", () => {
    expect(pinSql).toMatch(/pin_hash text not null/);
    expect(pinSql).toMatch(/gen_salt\('bf'/);
    // A column literally holding the PIN would defeat the whole table.
    expect(pinSql).not.toMatch(/\bpin text\b/);
  });

  it("lets nobody read the hash, including its owner", () => {
    // Four digits is trivially crackable offline, so a readable hash is a handed-over PIN.
    expect(pinSql).toMatch(/revoke all on public\.user_safety_pins from anon, authenticated/);
    expect(pinSql).not.toMatch(/create policy[\s\S]*user_safety_pins/);
  });

  it("only lets the server verify, and only the owner set", () => {
    // If a client could call verify directly it would bypass the attempt counter.
    expect(pinSql).toMatch(
      /revoke all on function public\.verify_safety_pin\(uuid, text\) from public, anon, authenticated/,
    );
    expect(pinSql).toMatch(/grant execute on function public\.verify_safety_pin\(uuid, text\) to service_role/);
    expect(pinSql).toMatch(/grant execute on function public\.set_safety_pin\(text\) to authenticated/);
  });

  it("refuses to set a PIN without an authenticated caller", () => {
    // A service session setting someone's PIN would destroy the property that makes it useful:
    // that only the account holder has ever seen it.
    expect(pinSql).toMatch(/if caller is null then[\s\S]{0,120}raise exception/);
  });

  it("locks out after repeated failures", () => {
    expect(pinSql).toMatch(/failed_attempts \+ 1 >= 5/);
    expect(pinSql).toMatch(/interval '15 minutes'/);
  });

  it("leaves an alert cancellable when no PIN has been set", () => {
    // Otherwise the first accidental alert is uncancellable by the person who raised it, which
    // is worse than the risk the PIN removes.
    expect(pinSql).toMatch(/if not found then[\s\S]{0,60}return true/);
  });

  it("computes elapsed time server-side when deciding if the PIN is needed", () => {
    const sos = readFileSync(join(root, "supabase/functions/raise-sos-alert/index.ts"), "utf8");
    // A client that could assert "still counting down" could cancel without the PIN.
    expect(sos).toMatch(/new Date\(alert\.triggered_at\)/);
    expect(sos).not.toMatch(/body\.elapsed|body\.phase|body\.needsPin/);
  });
});

describe("safety claims are gated", () => {
  it("cannot arm SOS before the whole path is verified", () => {
    // A button labelled SOS that does nothing is worse than no button. `canArmSos` only opens
    // at "live", which means dialling and the ops alert have both been tested end to end.
    expect(SAFETY_READINESS).toBe("schema_pending");
    expect(canArmSos()).toBe(false);
    expect(canRecordVisit()).toBe(false);
  });

  it("opens each capability at the right stage, not the same one", () => {
    // Recording only needs the server; SOS needs the whole chain including a real dial. If
    // these ever collapse into one gate, SOS ships the moment the tables exist.
    expect(canRecordVisit("server_ready")).toBe(true);
    expect(canArmSos("server_ready")).toBe(false);
    expect(canArmSos("live")).toBe(true);
    expect(canRecordVisit("schema_pending")).toBe(false);
  });
});
