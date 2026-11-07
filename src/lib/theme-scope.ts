/**
 * Website-vs-web-app theme scoping.
 *
 * Product rule (founder, 2026-10-28): the public website is light mode, always.
 * Light/dark customisation exists only inside the signed-in web-app surfaces
 * (`/app/*` customers, `/xooter/*` helpers, `/admin/*` internal ops).
 *
 * How the rule is enforced, layer by layer:
 *
 * 1. `applyPrePaintThemeClass()` runs in `main.tsx` before React renders, so a
 *    stored dark preference can never flash onto a public page while the bundle
 *    loads. It must live in a same-origin module — the CSP
 *    (`script-src 'self'`, see `public/_headers`) blocks inline `<script>`
 *    snippets in index.html, which is the usual next-themes recipe for this.
 * 2. `App.tsx` mounts `next-themes` with `forcedTheme="light"` on public routes
 *    and no forcing on web-app routes, so the class also tracks the rule after
 *    mount, on every client-side navigation, and after `setTheme()` calls.
 * 3. `ThemeToggle` renders nothing when a forced theme is active, so the
 *    customisation control cannot even appear on the website by accident.
 *
 * The storage key MUST stay in sync with the `storageKey` passed to
 * `ThemeProvider` in `App.tsx`; `theme-scope.test.ts` pins the two together.
 */

/** Signed-in web-app route prefixes where the theme may be customised. */
const WEB_APP_ROUTE_PREFIXES = ["/app", "/xooter", "/admin"] as const;

/** Must match the `storageKey` prop of the `ThemeProvider` in `App.tsx`. */
export const WEB_APP_THEME_STORAGE_KEY = "xoot-theme";

/**
 * True when the path belongs to the signed-in web-app (theme customisable),
 * false for every public website route (forced light).
 *
 * Prefix matching is segment-aware on purpose: `/applications` or `/applied`
 * are public pages and must NOT be treated as `/app`.
 */
export function isWebAppRoute(pathname: string): boolean {
  return WEB_APP_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Apply the correct theme class to `<html>` before first paint.
 *
 * Called once from `main.tsx` before `createRoot().render()`. On web-app routes
 * a stored `dark` choice is honoured; everywhere else `dark` is stripped so the
 * website always paints light. next-themes takes over after mount and keeps the
 * class in sync; this function only closes the load-time gap.
 */
export function applyPrePaintThemeClass(): void {
  if (typeof window === "undefined") return;
  try {
    const stored = window.localStorage.getItem(WEB_APP_THEME_STORAGE_KEY);
    const dark = isWebAppRoute(window.location.pathname) && stored === "dark";
    document.documentElement.classList.toggle("dark", dark);
  } catch {
    // Storage unavailable (private mode, disabled): fall through with whatever
    // classes <html> already has — next-themes re-applies the right one after
    // mount, and the default is light.
  }
}
