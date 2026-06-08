import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const targetIndex = args.indexOf("--target");
const targetDir = targetIndex >= 0 && args[targetIndex + 1] ? args[targetIndex + 1] : "public";
const root = process.cwd();
const wellKnownDir = join(root, targetDir, ".well-known");

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

const defaultAppLinkPaths = [
  "/app/*",
  "/auth/callback*",
  "/auth/reset*",
  "/care-plus/*",
  "/install",
  "/trust-centre",
  "/zooter/*",
];

const iosBundleId = process.env.ZOOT_IOS_BUNDLE_ID ?? "za.co.zoot.app";
const iosAppId =
  process.env.ZOOT_IOS_APP_ID ??
  (process.env.ZOOT_APPLE_TEAM_ID ? `${process.env.ZOOT_APPLE_TEAM_ID}.${iosBundleId}` : "");
const appLinkPaths = splitList(process.env.ZOOT_APP_LINK_PATHS).length
  ? splitList(process.env.ZOOT_APP_LINK_PATHS)
  : defaultAppLinkPaths;

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
  console.log("Skipped apple-app-site-association: set ZOOT_APPLE_TEAM_ID or ZOOT_IOS_APP_ID.");
}

const androidPackageName = process.env.ZOOT_ANDROID_PACKAGE_NAME ?? "za.co.zoot.app";
const androidFingerprints = splitList(process.env.ZOOT_ANDROID_SHA256_CERT_FINGERPRINTS);

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
  console.log("Skipped assetlinks.json: set ZOOT_ANDROID_SHA256_CERT_FINGERPRINTS.");
}
