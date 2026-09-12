#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadEnv } from "vite";
import {
  getPublicConfigIssue,
  resolvePublicEnvironment,
} from "../../config/public-environment.mjs";

const root = process.cwd();
const defaultsFile = join(root, "config", "public-environments.json");

let defaults;
try {
  defaults = JSON.parse(readFileSync(defaultsFile, "utf8"));
} catch (error) {
  console.error(`Xoot environment configuration error: config/public-environments.json is unavailable or invalid (${error.message})`);
  process.exit(1);
}

const sourceEnvironment = { ...loadEnv("production", root, ""), ...process.env };
const resolution = resolvePublicEnvironment(sourceEnvironment, defaults);
const issue = getPublicConfigIssue(resolution.env, {
  ci: Boolean(sourceEnvironment.CI),
  prod: true,
  requireReal: sourceEnvironment.XOOT_REQUIRE_REAL_PUBLIC_ENV === "true",
});

if (issue) {
  console.error(`Xoot environment configuration error: ${issue}`);
  process.exit(1);
}

const provenance = resolution.derived ? ` (derived from ${resolution.derived.source})` : "";
const filled = resolution.appliedDefaults.length
  ? `; filled from config/public-environments.json: ${resolution.appliedDefaults.join(", ")}`
  : "";
console.log(`Xoot public environment check passed for ${resolution.env.VITE_APP_ENV || "local"}${provenance}${filled}.`);
