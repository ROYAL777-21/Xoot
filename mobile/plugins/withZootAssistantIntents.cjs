const fs = require("node:fs");
const path = require("node:path");
const {
  AndroidConfig,
  createRunOncePlugin,
  withAndroidManifest,
  withDangerousMod,
  withInfoPlist,
  withXcodeProject,
} = require("expo/config-plugins");

const pluginName = "withZootAssistantIntents";
const pluginVersion = "1.0.0";

const copyFileEnsuringDirectory = (from, to) => {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
};

const getNativeAssetPath = (projectRoot, ...segments) =>
  path.join(projectRoot, "..", "native", ...segments);

const hasXcodeFileReference = (project, fileName) => {
  const references = project.hash?.project?.objects?.PBXFileReference ?? {};
  return Object.values(references).some((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const pathValue = entry.path;
    return typeof pathValue === "string" && pathValue.includes(fileName);
  });
};

const withZootAssistantIntents = (config) => {
  config = withInfoPlist(config, (config) => {
    const existingActivities = Array.isArray(config.modResults.NSUserActivityTypes)
      ? config.modResults.NSUserActivityTypes
      : [];

    config.modResults.NSUserActivityTypes = Array.from(
      new Set([
        ...existingActivities,
        "NSUserActivityTypeBrowsingWeb",
        "za.co.zoothome.app.book",
        "za.co.zoothome.app.concierge",
        "za.co.zoothome.app.care-plus",
      ]),
    );
    config.modResults.NSSupportsLiveActivities = true;
    config.modResults.ZootAssistantIntents = {
      version: pluginVersion,
      policy: "open-app-safe-routes-only",
    };
    return config;
  });

  config = withAndroidManifest(config, (config) => {
    const mainActivity = AndroidConfig.Manifest.getMainActivityOrThrow(config.modResults);
    mainActivity["meta-data"] = mainActivity["meta-data"] ?? [];

    const shortcutMetadata = mainActivity["meta-data"].find(
      (entry) => entry.$?.["android:name"] === "android.app.shortcuts",
    );

    if (shortcutMetadata) {
      shortcutMetadata.$["android:resource"] = "@xml/zoot_assistant_shortcuts";
    } else {
      mainActivity["meta-data"].push({
        $: {
          "android:name": "android.app.shortcuts",
          "android:resource": "@xml/zoot_assistant_shortcuts",
        },
      });
    }

    return config;
  });

  config = withDangerousMod(config, [
    "android",
    async (config) => {
      const { platformProjectRoot, projectRoot } = config.modRequest;
      copyFileEnsuringDirectory(
        getNativeAssetPath(projectRoot, "android", "res", "xml", "shortcuts.xml"),
        path.join(platformProjectRoot, "app", "src", "main", "res", "xml", "zoot_assistant_shortcuts.xml"),
      );
      copyFileEnsuringDirectory(
        getNativeAssetPath(projectRoot, "android", "res", "values", "strings.xml"),
        path.join(platformProjectRoot, "app", "src", "main", "res", "values", "zoot_assistant_strings.xml"),
      );
      return config;
    },
  ]);

  config = withDangerousMod(config, [
    "ios",
    async (config) => {
      const { platformProjectRoot, projectName, projectRoot } = config.modRequest;
      copyFileEnsuringDirectory(
        getNativeAssetPath(projectRoot, "ios", "ZootLiveActivities", "ZootAppIntents.swift"),
        path.join(platformProjectRoot, projectName, "ZootAppIntents.swift"),
      );
      return config;
    },
  ]);

  config = withXcodeProject(config, (config) => {
    const project = config.modResults;
    const target = project.getFirstTarget();
    const projectName = config.modRequest.projectName;
    const appIntentsPath = `${projectName}/ZootAppIntents.swift`;

    if (target?.uuid && !hasXcodeFileReference(project, "ZootAppIntents.swift")) {
      project.addSourceFile(appIntentsPath, { target: target.uuid });
    }

    return config;
  });

  return config;
};

module.exports = createRunOncePlugin(withZootAssistantIntents, pluginName, pluginVersion);
