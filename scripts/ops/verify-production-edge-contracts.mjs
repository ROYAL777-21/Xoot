#!/usr/bin/env node
/**
 * Read-only external check that the three website-critical Xoot Edge Functions
 * are actually deployed and enforce the expected public/unauthenticated boundary.
 *
 * Usage:
 *   node scripts/ops/verify-production-edge-contracts.mjs
 *   node scripts/ops/verify-production-edge-contracts.mjs --self-test
 *   node scripts/ops/verify-production-edge-contracts.mjs --directory-only
 *
 * NEVER submits a booking, triggers payments, fetches private records, or uses a
 * service-role key.  The one public response is checked for a fixed safe shape;
 * no Xooter profile fields are printed.
 */
import { readFileSync } from "node:fs";

const PROD_REF = "mvlrkelahhsyjrwgsxaf";
const PROD_API_ORIGIN = "https://mvlrkelahhsyjrwgsxaf.supabase.co";
const PROD_ORIGIN = "https://xoot.co.za";

export const validatePublicDirectory = (status, value) => {
  if (status !== 200) return `public directory returned HTTP ${status}, expected 200`;
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      !Number.isInteger(value.total) || value.total < 0 ||
      !Array.isArray(value.xooters) || value.xooters.length > 24 ||
      value.total < value.xooters.length) {
    return "public directory payload violates the count/list contract";
  }
  const forbidden = new Set(["user_id", "email", "phone", "phone_number", "bank_details", "id_number", "password", "address", "access_code"]);
  for (const row of value.xooters) {
    if (!row || typeof row !== "object" || Array.isArray(row) ||
        typeof row.id !== "string" || typeof row.name !== "string") {
      return "public directory contains an invalid projected row";
    }
    if (Object.keys(row).some(key => forbidden.has(key))) {
      return "public directory exposed a private field";
    }
  }
  return null;
};

export const validateAuthenticatedGate = (name, status) => {
  if (status === 401 || status === 403) return null;
  if (status === 404) return `${name} is missing (HTTP 404)`;
  return `${name} did not reject an unauthenticated request as expected (HTTP ${status})`;
};

const test = () => {
  const valid = { total: 0, xooters: [] };
  if (validatePublicDirectory(200, valid) !== null) throw new Error("zero-roster positive control failed");
  if (validatePublicDirectory(404, valid) === null) throw new Error("directory 404 negative control failed");
  if (validatePublicDirectory(200, { total: 1, xooters: [{ id: "a", name: "X", user_id: "private" }] }) === null) {
    throw new Error("private data leakage negative control failed");
  }
  if (validateAuthenticatedGate("quote", 401) !== null) throw new Error("private-gate positive control failed");
  if (validateAuthenticatedGate("quote", 404) === null) throw new Error("private-gate missing-function negative control failed");
  if (validateAuthenticatedGate("quote", 200) === null) throw new Error("private-gate unauthorised-access negative control failed");
  console.log("PASS: backend read-only preflight guard fixtures reject 404, private data leakage and unauthorised access");
};

if (process.argv.includes("--self-test")) {
  test();
} else {
  const publicConfig = JSON.parse(readFileSync(new URL("../../config/public-environments.json", import.meta.url), "utf8"));
  const env = publicConfig.production ?? {};
  const apiUrl = env.VITE_SUPABASE_URL;
  const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  // Never let a preview or typo silently point this production verifier at staging.
  if (apiUrl !== `https://${PROD_REF}.supabase.co` || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey || "")) {
    throw new Error("Approved production public configuration is missing or has the wrong project reference");
  }
  const call = async (name, method) => {
    const headers = {
      apikey: publishableKey,
      Origin: PROD_ORIGIN,
      "Content-Type": "application/json",
    };
    try {
      return await fetch(`${PROD_API_ORIGIN}/functions/v1/${name}`, {
        method,
        headers,
        body: method === "POST" ? "{}" : undefined,
        signal: AbortSignal.timeout(15000),
        redirect: "error",
      });
    } catch {
      throw new Error(`${name} endpoint could not be reached; live check is unverified`);
    }
  };

  const problems = [];
  const directoryResponse = await call("public-xooter-directory", "POST");
  let directoryJson;
  try { directoryJson = await directoryResponse.json(); } catch { directoryJson = null; }
  const directoryIssue = validatePublicDirectory(directoryResponse.status, directoryJson);
  if (directoryIssue) problems.push(directoryIssue);
  else console.log(`PASS: public directory responded with a safe roster contract (total ${directoryJson.total})`);

  // The public roster can be promoted independently of the crew/checklist and quote
  // migrations. --directory-only verifies that narrow safe release without giving
  // the incomplete marketplace a false all-functions GREEN result.
  const directoryOnly = process.argv.includes("--directory-only");
  for (const name of (directoryOnly ? [] : ["get-booking-quote", "xooter-job-checklist"])) {
    const response = await call(name, "POST");
    const issue = validateAuthenticatedGate(name, response.status);
    if (issue) problems.push(issue);
    else console.log(`PASS: ${name} exists and denies unauthenticated requests (HTTP ${response.status})`);
  }
  if (problems.length) {
    for (const issue of problems) console.error("FAIL: " + issue);
    process.exitCode = 1;
  }
}
