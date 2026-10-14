import { getPublicConfigIssueForEnv, getPublicSecretLeaks, isSupabasePublicConfigComplete } from "@/lib/env";
import { resolvePublicEnv } from "@/lib/public-environment";

const renderFatalConfigError = () => {
  if (typeof document === "undefined" || !document.body) return;

  document.body.replaceChildren();
  const shell = document.createElement("div");
  shell.style.fontFamily = "sans-serif";
  shell.style.padding = "2rem";
  shell.style.textAlign = "center";
  const heading = document.createElement("h1");
  heading.textContent = "Configuration Error";
  const message = document.createElement("p");
  message.textContent = "VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be set for this environment. Contact support.";
  shell.append(heading, message);
  document.body.append(shell);
};

export function assertProductionEnv() {
  // Match the Supabase client: production defaults apply when host variables are blank.
  // Previews have no committed defaults and remain isolated from production.
  const resolvedEnv = resolvePublicEnv(import.meta.env);
  const issue = getPublicConfigIssueForEnv(resolvedEnv, {
    prod: import.meta.env.PROD,
    dev: import.meta.env.DEV,
  });

  if (!issue) return;

  const localStaticPreview =
    typeof window !== "undefined" &&
    ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname) &&
    !isSupabasePublicConfigComplete(resolvedEnv) &&
    getPublicSecretLeaks(resolvedEnv).length === 0 &&
    resolvedEnv.VITE_ENABLE_DEMO_MODE !== "true";

  if (localStaticPreview) {
    console.warn(`[Xoot] Local static preview is running without live Supabase config. Backend/auth actions remain disabled. ${issue}`);
    return;
  }

  renderFatalConfigError();
  throw new Error(`[Xoot] FATAL: ${issue}`);
}
