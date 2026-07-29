import * as Sentry from "@sentry/react";

let monitoringStarted = false;

type MonitoringContext = Record<string, unknown>;

const FILTERED = "[Filtered]";

const sensitiveKeyPattern =
  /(address|alarm|card|email|gate|identity|id_document|lockbox|otp|password|payment|phone|pin|token|secret|selfie|access[_-]?instructions)/i;

const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const phonePattern = /(?:\+?\d[\d\s().-]{6,}\d)\b/g;
const sensitivePhrasePattern =
  /\b(gate|access|alarm|lockbox|door|garage)\s*(code|pin|password)?\s*[:#-]?\s*[A-Z0-9-]{3,}\b/gi;

const appEnvironment = () => {
  const env = import.meta.env.VITE_APP_ENV?.trim();
  if (env) return env;
  return import.meta.env.PROD ? "production" : "development";
};

const scrubString = (value: string) =>
  value
    .replace(emailPattern, "[email redacted]")
    .replace(phonePattern, "[phone redacted]")
    .replace(sensitivePhrasePattern, "$1 code [redacted]")
    .slice(0, 1200);

const scrubUnknown = (value: unknown, depth = 0): unknown => {
  if (depth > 5) return FILTERED;
  if (typeof value === "string") return scrubString(value);
  if (typeof value !== "object" || value === null) return value;
  if (Array.isArray(value)) return value.map((item) => scrubUnknown(item, depth + 1));

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      sensitiveKeyPattern.test(key) ? FILTERED : scrubUnknown(item, depth + 1),
    ]),
  );
};

export const initMonitoring = () => {
  if (monitoringStarted || !import.meta.env.PROD || !import.meta.env.VITE_SENTRY_DSN) return;

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: appEnvironment(),
    enabled: true,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1,
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
    beforeSend(event) {
      event.tags = {
        ...event.tags,
        app: "zoot-web",
      };
      event.user = event.user?.id ? { id: String(event.user.id).slice(0, 80) } : undefined;
      event.contexts = scrubUnknown(event.contexts) as typeof event.contexts;
      event.extra = scrubUnknown(event.extra) as typeof event.extra;
      event.request = scrubUnknown(event.request) as typeof event.request;
      event.breadcrumbs = event.breadcrumbs?.map((breadcrumb) => ({
        ...breadcrumb,
        message: breadcrumb.message ? scrubString(breadcrumb.message) : breadcrumb.message,
        data: scrubUnknown(breadcrumb.data) as typeof breadcrumb.data,
      }));
      return event;
    },
  });

  monitoringStarted = true;
};

export const logError = (error: unknown, context?: MonitoringContext) => {
  if (monitoringStarted) {
    Sentry.withScope((scope) => {
      if (context) scope.setContext("zoot", context);
      Sentry.captureException(error);
    });
    return;
  }

  if (import.meta.env.DEV) {
    console.error("Xoot client error", error, context);
  }
};

export const reportClientError = logError;
