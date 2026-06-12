import { getPublicConfigIssueForEnv } from "@/lib/env";

const renderFatalConfigError = () => {
  if (typeof document === "undefined" || !document.body) return;

  document.body.innerHTML = [
    '<div style="font-family:sans-serif;padding:2rem;text-align:center">',
    "<h1>Configuration Error</h1>",
    "<p>VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be set for production. Contact support.</p>",
    "</div>",
  ].join("");
};

export function assertProductionEnv() {
  const issue = getPublicConfigIssueForEnv(import.meta.env, {
    prod: import.meta.env.PROD,
    dev: import.meta.env.DEV,
  });

  if (!issue) return;

  renderFatalConfigError();
  throw new Error(`[Zoot] FATAL: ${issue}`);
}
