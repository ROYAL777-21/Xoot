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

const pluginName = "withXootAssistantIntents";
const pluginVersion = "1.0.0";

const copyFileEnsuringDirectory = (from, to) => {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
};

const getNativeAssetPath = (projectRoot, ...segments) =>
  path.join(projectRoot, "..", "native", ...segments);

const ensureAndroidManifestEntry = (entries, name, createEntry) => {
  const existing = entries.find((entry) => entry.$?.["android:name"] === name);
  if (existing) return existing;
  const created = createEntry();
  entries.push(created);
  return created;
};

const hasXcodeFileReference = (project, fileName) => {
  const references = project.hash?.project?.objects?.PBXFileReference ?? {};
  return Object.values(references).some((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const pathValue = entry.path;
    return typeof pathValue === "string" && pathValue.includes(fileName);
  });
};

const getAppSourceGroup = (project, projectName) => {
  const appGroupKey =
    project.findPBXGroupKey({ name: projectName }) ??
    project.findPBXGroupKey({ path: projectName });

  if (appGroupKey) {
    return { groupKey: appGroupKey, sourcePath: "XootAppIntents.swift" };
  }

  const mainGroupKey = project.getFirstProject?.()?.firstProject?.mainGroup;
  return mainGroupKey
    ? { groupKey: mainGroupKey, sourcePath: "XootAppIntents.swift" }
    : null;
};

const withXootAssistantIntents = (config) => {
  config = withInfoPlist(config, (config) => {
    const existingActivities = Array.isArray(config.modResults.NSUserActivityTypes)
      ? config.modResults.NSUserActivityTypes
      : [];

    config.modResults.NSUserActivityTypes = Array.from(
      new Set([
        ...existingActivities,
        "NSUserActivityTypeBrowsingWeb",
        "za.co.xoothome.app.book",
        "za.co.xoothome.app.concierge",
        "za.co.xoothome.app.care-plus",
      ]),
    );
    config.modResults.NSSupportsLiveActivities = true;
    config.modResults.XootAssistantIntents = {
      version: pluginVersion,
      policy: "open-app-safe-routes-only",
    };
    return config;
  });

  config = withAndroidManifest(config, (config) => {
    const mainActivity = AndroidConfig.Manifest.getMainActivityOrThrow(config.modResults);
    mainActivity["meta-data"] = mainActivity["meta-data"] ?? [];
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    application.receiver = application.receiver ?? [];

    const shortcutMetadata = mainActivity["meta-data"].find(
      (entry) => entry.$?.["android:name"] === "android.app.shortcuts",
    );

    if (shortcutMetadata) {
      shortcutMetadata.$["android:resource"] = "@xml/xoot_assistant_shortcuts";
    } else {
      mainActivity["meta-data"].push({
        $: {
          "android:name": "android.app.shortcuts",
          "android:resource": "@xml/xoot_assistant_shortcuts",
        },
      });
    }

    const widgetReceiver = ensureAndroidManifestEntry(
      application.receiver,
      "za.co.xoothome.widgets.XootStatusWidgetProvider",
      () => ({
        $: {
          "android:name": "za.co.xoothome.widgets.XootStatusWidgetProvider",
          "android:exported": "false",
          "android:label": "@string/xoot_widget_name",
        },
      }),
    );
    widgetReceiver["intent-filter"] = widgetReceiver["intent-filter"] ?? [];
    const widgetIntentFilter = widgetReceiver["intent-filter"][0] ?? { action: [] };
    widgetIntentFilter.action = widgetIntentFilter.action ?? [];
    if (!widgetIntentFilter.action.some((entry) => entry.$?.["android:name"] === "android.appwidget.action.APPWIDGET_UPDATE")) {
      widgetIntentFilter.action.push({
        $: {
          "android:name": "android.appwidget.action.APPWIDGET_UPDATE",
        },
      });
    }
    widgetReceiver["intent-filter"][0] = widgetIntentFilter;
    widgetReceiver["meta-data"] = widgetReceiver["meta-data"] ?? [];
    ensureAndroidManifestEntry(
      widgetReceiver["meta-data"],
      "android.appwidget.provider",
      () => ({
        $: {
          "android:name": "android.appwidget.provider",
          "android:resource": "@xml/xoot_status_widget_info",
        },
      }),
    );

    return config;
  });

  config = withDangerousMod(config, [
    "android",
    async (config) => {
      const { platformProjectRoot, projectRoot } = config.modRequest;
      copyFileEnsuringDirectory(
        getNativeAssetPath(projectRoot, "android", "res", "xml", "shortcuts.xml"),
        path.join(platformProjectRoot, "app", "src", "main", "res", "xml", "xoot_assistant_shortcuts.xml"),
      );
      copyFileEnsuringDirectory(
        getNativeAssetPath(projectRoot, "android", "res", "values", "strings.xml"),
        path.join(platformProjectRoot, "app", "src", "main", "res", "values", "xoot_assistant_strings.xml"),
      );
      copyFileEnsuringDirectory(
        getNativeAssetPath(projectRoot, "android", "res", "xml", "xoot_status_widget_info.xml"),
        path.join(platformProjectRoot, "app", "src", "main", "res", "xml", "xoot_status_widget_info.xml"),
      );
      copyFileEnsuringDirectory(
        getNativeAssetPath(projectRoot, "android", "res", "layout", "xoot_status_widget.xml"),
        path.join(platformProjectRoot, "app", "src", "main", "res", "layout", "xoot_status_widget.xml"),
      );
      copyFileEnsuringDirectory(
        getNativeAssetPath(projectRoot, "android", "res", "drawable", "xoot_widget_glass_background.xml"),
        path.join(platformProjectRoot, "app", "src", "main", "res", "drawable", "xoot_widget_glass_background.xml"),
      );
      copyFileEnsuringDirectory(
        getNativeAssetPath(projectRoot, "android", "res", "drawable", "xoot_widget_action_background.xml"),
        path.join(platformProjectRoot, "app", "src", "main", "res", "drawable", "xoot_widget_action_background.xml"),
      );
      copyFileEnsuringDirectory(
        getNativeAssetPath(projectRoot, "android", "res", "drawable", "xoot_widget_mark_background.xml"),
        path.join(platformProjectRoot, "app", "src", "main", "res", "drawable", "xoot_widget_mark_background.xml"),
      );
      copyFileEnsuringDirectory(
        getNativeAssetPath(projectRoot, "android", "src", "main", "java", "za", "co", "xoothome", "widgets", "XootStatusWidgetProvider.java"),
        path.join(platformProjectRoot, "app", "src", "main", "java", "za", "co", "xoothome", "widgets", "XootStatusWidgetProvider.java"),
      );
      return config;
    },
  ]);

  config = withDangerousMod(config, [
    "ios",
    async (config) => {
      const { platformProjectRoot, projectRoot } = config.modRequest;
      copyFileEnsuringDirectory(
        getNativeAssetPath(projectRoot, "ios", "XootLiveActivities", "XootAppIntents.swift"),
        path.join(platformProjectRoot, "XootAppIntents.swift"),
      );
      return config;
    },
  ]);

  config = withXcodeProject(config, (config) => {
    const project = config.modResults;
    const target = project.getFirstTarget();
    const projectName = config.modRequest.projectName;
    const appSourceGroup = getAppSourceGroup(project, projectName);

    if (target?.uuid && appSourceGroup && !hasXcodeFileReference(project, "XootAppIntents.swift")) {
      project.addSourceFile(
        appSourceGroup.sourcePath,
        { target: target.uuid, lastKnownFileType: "sourcecode.swift" },
        appSourceGroup.groupKey,
      );
    }

    return config;
  });

  return config;
};

module.exports = createRunOncePlugin(withXootAssistantIntents, pluginName, pluginVersion);
