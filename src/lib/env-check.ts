import { getPublicConfigIssueForEnv } from "@/lib/env";

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
  message.textContent = "VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be set for production. Contact support.";
  shell.append(heading, message);
  document.body.append(shell);
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
