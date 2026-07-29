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
}

if (errors.length > 0) {
  console.error("Xoot lockfile validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Xoot lockfile validation passed for web and mobile.");
