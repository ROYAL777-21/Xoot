import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";

/** A saved choice wins; new visitors follow the device, including later system changes. */
export function XootThemeProvider({ children }: { children: ReactNode }) {
  return <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange storageKey="xoot-theme">{children}</ThemeProvider>;
}
