import * as Sentry from "@sentry/react";

let monitoringStarted = false;

type MonitoringContext = Record<string, unknown>;

const appEnvironment = () => {
  const env = import.meta.env.VITE_APP_ENV?.trim();
  if (env) return env;
  return import.meta.env.PROD ? "production" : "development";
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
    console.error("Zoot client error", error, context);
  }
};

export const reportClientError = logError;
