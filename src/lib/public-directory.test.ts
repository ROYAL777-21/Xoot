import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { publicDirectoryProfile, DIRECTORY_COLUMNS } from "../../supabase/functions/_shared/public-directory";

describe("public marketplace data", () => {
  it("omits private values even when the input contains a full contractor row", () => {
    const profile = publicDirectoryProfile({id:"profile-id",name:"Test profile",user_id:"private-auth-id",commission_rate:.35,bank_account:"private-bank",internal_notes:"private-notes",latitude:1,longitude:1});
    expect(Object.keys(profile)).toEqual(DIRECTORY_COLUMNS.split(","));
    expect(JSON.stringify(profile)).not.toMatch(/private-|bank_account|user_id|commission_rate|internal_notes|latitude|longitude/);
  });
  it("does not turn legacy defaults into a new Xooter's performance record", () => {
    const profile = publicDirectoryProfile({id:"profile-id",jobs_completed:0,rating:5,reliability_score:100,job_completion_rate:100});
    expect(profile.rating).toBeNull();
    expect(profile.reliability_score).toBeNull();
    expect(profile.job_completion_rate).toBeNull();
    expect(publicDirectoryProfile({jobs_completed:3,rating:4.5}).rating).toBe(4.5);
  });
  it("keeps the endpoint scoped to active, approved, unflagged profiles", () => {
    const endpoint = readFileSync("supabase/functions/public-xooter-directory/index.ts","utf8");
    expect(endpoint).toContain('.select(DIRECTORY_COLUMNS, {count: "exact"})');
    expect(endpoint).toContain('.eq("active", true)');
    expect(endpoint).toContain('.eq("background_check_status", "approved")');
    expect(endpoint).toContain('.eq("reliability_flagged", false)');
    expect(endpoint).toContain(".limit(24)");
  });
});
