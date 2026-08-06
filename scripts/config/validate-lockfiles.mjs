import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const workspaces = [
  { name: "web", dir: "." },
  { name: "mobile", dir: "mobile" },
];

const errors = [];
const bannedPackagePrefixes = ["@capacitor/"];

const readJson = (filePath) => JSON.parse(readFileSync(filePath, "utf8"));

/**
 * `bun.lock` is JSONC — Bun writes trailing commas, so `JSON.parse` rejects it. Strip only the
 * commas that sit directly before a closing brace or bracket, and only when outside a string, so
 * a comma inside a version range or an integrity hash is never touched.
 */
const readBunLock = (filePath) => {
  const source = readFileSync(filePath, "utf8");
  let out = "";
  let inString = false;
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (inString) {
      out += char;
      if (char === "\\") {
        out += source[i + 1] ?? "";
        i += 1;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
      out += char;
      continue;
    }
    if (char === ",") {
      const next = source.slice(i + 1).match(/^\s*([}\]])/);
      if (next) continue;
    }
    out += char;
  }
  return JSON.parse(out);
};

const dependencyNames = (manifest) => [
  ...Object.keys(manifest.dependencies ?? {}),
  ...Object.keys(manifest.devDependencies ?? {}),
  ...Object.keys(manifest.optionalDependencies ?? {}),
  ...Object.keys(manifest.peerDependencies ?? {}),
];

for (const workspace of workspaces) {
  const packagePath = path.join(root, workspace.dir, "package.json");
  const lockPath = path.join(root, workspace.dir, "package-lock.json");

  if (!existsSync(packagePath)) {
    errors.push(`${workspace.name}: missing package.json at ${path.relative(root, packagePath)}`);
    continue;
  }

  if (!existsSync(lockPath)) {
    errors.push(`${workspace.name}: missing package-lock.json at ${path.relative(root, lockPath)}`);
    continue;
  }

  const manifest = readJson(packagePath);
  const lockfile = readJson(lockPath);
  const rootLockPackage = lockfile.packages?.[""];

  if (!rootLockPackage) {
    errors.push(`${workspace.name}: package-lock.json is missing packages[""] metadata.`);
    continue;
  }

  if (rootLockPackage.name !== manifest.name) {
    errors.push(`${workspace.name}: package-lock root package name does not match package.json.`);
  }

  if (rootLockPackage.version !== manifest.version) {
    errors.push(`${workspace.name}: package-lock root package version does not match package.json.`);
  }

  const expectedDependencySections = ["dependencies", "devDependencies", "optionalDependencies"];
  for (const section of expectedDependencySections) {
    const expected = manifest[section] ?? {};
    const actual = rootLockPackage[section] ?? {};
    for (const [name, version] of Object.entries(expected)) {
      if (actual[name] !== version) {
        errors.push(`${workspace.name}: package-lock ${section}.${name} is out of sync with package.json.`);
      }
    }
  }

  for (const name of dependencyNames(manifest)) {
    if (bannedPackagePrefixes.some((prefix) => name.startsWith(prefix))) {
      errors.push(`${workspace.name}: ${name} belongs to the legacy Capacitor mobile path. Xoot mobile uses Expo.`);
    }
  }

  const lockedNames = new Set([
    ...Object.keys(lockfile.dependencies ?? {}),
    ...Object.keys(lockfile.packages ?? {}).map((name) => name.replace(/^node_modules\//, "")),
  ]);
  for (const name of lockedNames) {
    if (bannedPackagePrefixes.some((prefix) => name.startsWith(prefix))) {
      errors.push(`${workspace.name}: package-lock contains legacy Capacitor package ${name}.`);
    }
  }

  // The check that actually matters for CI. Everything above audits package-lock.json, which the
  // workflow never reads — it installs with `bun install --frozen-lockfile`. So this validator
  // passed cleanly while CI failed on mobile/bun.lock missing expo-apple-authentication and
  // react-native-svg (PR #26). A lockfile gate that ignores the lockfile CI enforces is worse
  // than no gate, because it reads as assurance.
  const bunLockPath = path.join(root, workspace.dir, "bun.lock");
  if (!existsSync(bunLockPath)) {
    errors.push(
      `${workspace.name}: missing bun.lock at ${path.relative(root, bunLockPath)}. CI installs with bun.`,
    );
    continue;
  }

  let bunLock;
  try {
    bunLock = readBunLock(bunLockPath);
  } catch (error) {
    errors.push(`${workspace.name}: bun.lock could not be parsed (${error.message}).`);
    continue;
  }

  const bunWorkspace = bunLock.workspaces?.[""];
  if (!bunWorkspace) {
    errors.push(`${workspace.name}: bun.lock is missing workspaces[""] metadata.`);
    continue;
  }

  for (const section of expectedDependencySections) {
    const expected = manifest[section] ?? {};
    const actual = bunWorkspace[section] ?? {};
    for (const [name, version] of Object.entries(expected)) {
      if (actual[name] !== version) {
        errors.push(
          `${workspace.name}: bun.lock ${section}.${name} is out of sync with package.json ` +
            `(lock has ${actual[name] ?? "nothing"}, package.json wants ${version}). ` +
            `Run \`bun install\` in ${workspace.dir === "." ? "the repo root" : workspace.dir} and commit bun.lock.`,
        );
      }
    }
    for (const name of Object.keys(actual)) {
      if (!(name in expected)) {
        errors.push(
          `${workspace.name}: bun.lock ${section}.${name} is no longer in package.json. ` +
            `Run \`bun install\` in ${workspace.dir === "." ? "the repo root" : workspace.dir} and commit bun.lock.`,
        );
      }
    }
  }
}

if (errors.length > 0) {
  console.error("Xoot lockfile validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Xoot lockfile validation passed for web and mobile.");
