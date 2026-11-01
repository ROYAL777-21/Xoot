import { useLayoutEffect, type ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { useLocation } from "react-router-dom";

/** Only account workspaces honour appearance preferences. Never overwrite that preference on the website. */
export function XootThemeProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const app = /^\/(?:app|xooter|admin)(?:\/|$)/.test(pathname) && !/^\/xooter\/apply(?:\/|$)/.test(pathname);
  useLayoutEffect(() => {
    document.documentElement.dataset.xootThemeScope = app ? "app" : "website";
  }, [app]);
  return <ThemeProvider attribute="class" defaultTheme="system" forcedTheme={app ? undefined : "light"} enableSystem disableTransitionOnChange storageKey="xoot-theme">{children}</ThemeProvider>;
}
