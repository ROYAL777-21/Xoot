import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const targetIndex = args.indexOf("--target");
const targetDir = targetIndex >= 0 && args[targetIndex + 1] ? args[targetIndex + 1] : "public";
const root = process.cwd();
const wellKnownDir = join(root, targetDir, ".well-known");

const envText = (name, fallback = "") => {
  const value = process.env[name]?.trim();
  return value || fallback;
};

const splitList = (value = "") =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const writeJson = (filename, payload) => {
  mkdirSync(wellKnownDir, { recursive: true });
  const destination = join(wellKnownDir, filename);
  writeFileSync(destination, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Wrote ${targetDir}/.well-known/${filename}`);
};

const skipJson = (filename, reason) => {
  rmSync(join(wellKnownDir, filename), { force: true });
  console.log(`Skipped ${filename}: ${reason}`);
};

const defaultAppLinkPaths = [
  "/app/*",
  "/auth/callback*",
  "/auth/reset*",
  "/care-plus/*",
  "/install",
  "/trust-centre",
  "/legal/*",
  "/xooter/*",
];

const appleTeamId = envText("XOOT_APPLE_TEAM_ID");
const iosBundleId = envText("XOOT_IOS_BUNDLE_ID", "za.co.xoot.app");
const iosAppId = envText("XOOT_IOS_APP_ID", appleTeamId ? `${appleTeamId}.${iosBundleId}` : "");
const configuredAppLinkPaths = splitList(process.env.XOOT_APP_LINK_PATHS);
const appLinkPaths = configuredAppLinkPaths.length ? configuredAppLinkPaths : defaultAppLinkPaths;

if (iosAppId) {
  writeJson("apple-app-site-association", {
    applinks: {
      apps: [],
      details: [
        {
          appID: iosAppId,
          paths: appLinkPaths,
        },
      ],
    },
  });
} else {
  skipJson("apple-app-site-association", "set XOOT_APPLE_TEAM_ID or XOOT_IOS_APP_ID.");
}

const androidPackageName = envText("XOOT_ANDROID_PACKAGE_NAME", "za.co.xoot.app");
const androidFingerprints = splitList(process.env.XOOT_ANDROID_SHA256_CERT_FINGERPRINTS);

if (androidPackageName && androidFingerprints.length > 0) {
  writeJson("assetlinks.json", [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: androidPackageName,
        sha256_cert_fingerprints: androidFingerprints,
      },
    },
  ]);
} else {
  skipJson("assetlinks.json", "set XOOT_ANDROID_SHA256_CERT_FINGERPRINTS.");
}
