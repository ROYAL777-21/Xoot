import type { ReactNode } from "react";
import posthog from "posthog-js";
import type { PostHogConfig } from "posthog-js";
import { PostHogProvider } from "posthog-js/react";

export type AnalyticsEventName =
  | "booking_flow_started"
  | "care_plus_cta_clicked"
  | "concierge_answer_reported"
  | "xooter_training_module_completed";

type AnalyticsValue = string | number | boolean | null | undefined;
type AnalyticsProperties = Record<string, AnalyticsValue>;

const allowedProperties: Record<AnalyticsEventName, readonly string[]> = {
  booking_flow_started: ["service_category", "launch_area", "source", "device_type"],
  care_plus_cta_clicked: ["cta_location", "membership_state", "device_type"],
  concierge_answer_reported: ["source", "reason", "signed_in", "role"],
  xooter_training_module_completed: ["module_category", "score_band", "badge_awarded"],
};

const token = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN?.trim() ?? "";
const host = import.meta.env.VITE_POSTHOG_HOST?.trim() || "https://us.i.posthog.com";

export const isPostHogEnabled = token.startsWith("phc_");

const options: Partial<PostHogConfig> = {
  api_host: host,
  autocapture: false,
  capture_pageview: false,
  capture_pageleave: false,
  disable_session_recording: true,
  person_profiles: "identified_only",
  persistence: "localStorage+cookie",
  loaded: (client) => {
    client.register({
      app: "xoot-web",
      app_env: import.meta.env.VITE_APP_ENV || "development",
    });
  },
};

const sanitiseProperties = (name: AnalyticsEventName, properties: AnalyticsProperties) => {
  const allowed = new Set(allowedProperties[name]);
  return Object.fromEntries(
    Object.entries(properties).filter(([key, value]) => allowed.has(key) && value !== undefined),
  );
};

export const getAnalyticsDeviceType = () => {
  if (typeof navigator === "undefined") return "unknown";
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? "mobile_browser" : "desktop_browser";
};

export const captureAnalyticsEvent = (name: AnalyticsEventName, properties: AnalyticsProperties = {}) => {
  if (!isPostHogEnabled) return;
  posthog.capture(name, sanitiseProperties(name, properties));
};

export function XootAnalyticsProvider({ children }: { children: ReactNode }) {
  if (!isPostHogEnabled) return <>{children}</>;

  return (
    <PostHogProvider apiKey={token} options={options}>
      {children}
    </PostHogProvider>
  );
}
