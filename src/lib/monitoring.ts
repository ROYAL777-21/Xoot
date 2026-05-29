type BrowserErrorReporter = {
  captureException?: (error: unknown, context?: Record<string, unknown>) => void;
};

declare global {
  interface Window {
    Sentry?: BrowserErrorReporter;
  }
}

export const reportClientError = (error: unknown, context?: Record<string, unknown>) => {
  if (typeof window !== "undefined" && window.Sentry?.captureException) {
    window.Sentry.captureException(error, context);
    return;
  }

  if (import.meta.env.DEV) {
    console.error("Zoot client error", error, context);
  }
};
