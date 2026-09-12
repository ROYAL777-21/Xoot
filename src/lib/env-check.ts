import { getPublicConfigIssueForEnv, getPublicSecretLeaks, isSupabasePublicConfigComplete } from "@/lib/env";
import { resolvedPublicEnv } from "@/lib/public-environment";

export const renderFatalConfigError = () => {
  if (typeof document === "undefined" || !document.body) return;

  document.body.replaceChildren();
  const shell = document.createElement("div");
  shell.style.fontFamily = "sans-serif";
  shell.style.padding = "2rem";
  shell.style.textAlign = "center";
  const heading = document.createElement("h1");
  shell.setAttribute("role", "alert");
  shell.setAttribute("aria-live", "assertive");
  heading.textContent = "Xoot is temporarily unavailable";
  const message = document.createElement("p");
  message.textContent = "This release has an invalid public configuration. Please try again later or contact support.";
  shell.append(heading, message);
  document.body.append(shell);
};

export function assertProductionEnv() {
  const issue = getPublicConfigIssueForEnv(resolvedPublicEnv, {
    prod: import.meta.env.PROD,
    dev: import.meta.env.DEV,
  });

  if (!issue) return;

  const localStaticPreview =
    typeof window !== "undefined" &&
    ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname) &&
    !isSupabasePublicConfigComplete(resolvedPublicEnv) &&
    getPublicSecretLeaks(resolvedPublicEnv).length === 0 &&
    resolvedPublicEnv.VITE_ENABLE_DEMO_MODE !== "true";

  if (localStaticPreview) {
    console.warn(`[Xoot] Local static preview is running without live Supabase config. Backend/auth actions remain disabled. ${issue}`);
    return;
  }

  renderFatalConfigError();
  throw new Error(`[Xoot] FATAL: ${issue}`);
}
