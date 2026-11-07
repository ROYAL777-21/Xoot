import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

/**
 * Light/dark switch for the signed-in web-app ONLY.
 *
 * Renders nothing when a forced theme is active — i.e. on the public website,
 * where light mode is the standard and cannot be customised (see
 * `src/lib/theme-scope.ts`). That guard is deliberate: even if this component
 * is ever mounted on a public page by mistake, no theme control appears there.
 *
 * The choice persists in localStorage under the key shared with the
 * ThemeProvider in App.tsx, so it survives reloads of /app, /xooter and
 * /admin routes, and is silently ignored on every public route.
 */
export const ThemeToggle = ({ className }: { className?: string }) => {
  const { resolvedTheme, setTheme, forcedTheme } = useTheme();

  if (forcedTheme) return null;

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`interactive-press w-full justify-start rounded-2xl ${className ?? ""}`}
    >
      {isDark ? (
        <>
          <Sun className="h-4 w-4 mr-2" /> Light mode
        </>
      ) : (
        <>
          <Moon className="h-4 w-4 mr-2" /> Dark mode
        </>
      )}
    </Button>
  );
};
