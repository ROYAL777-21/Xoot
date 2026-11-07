import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyPrePaintThemeClass,
  isWebAppRoute,
  WEB_APP_THEME_STORAGE_KEY,
} from "./theme-scope";

const navigate = (pathname: string) => {
  window.history.pushState({}, "", pathname);
};

const setStoredTheme = (value: string | null) => {
  if (value === null) window.localStorage.removeItem(WEB_APP_THEME_STORAGE_KEY);
  else window.localStorage.setItem(WEB_APP_THEME_STORAGE_KEY, value);
};

describe("isWebAppRoute", () => {
  it("classifies the signed-in surfaces as theme-customisable", () => {
    // Every route behind AppShell / XooterShell / RequireRole.
    expect(isWebAppRoute("/app")).toBe(true);
    expect(isWebAppRoute("/app/bookings")).toBe(true);
    expect(isWebAppRoute("/app/bookings/00000000-0000-0000-0000-000000000000")).toBe(true);
    expect(isWebAppRoute("/xooter")).toBe(true);
    expect(isWebAppRoute("/xooter/jobs")).toBe(true);
    expect(isWebAppRoute("/xooter/apply")).toBe(true);
    expect(isWebAppRoute("/admin/ops")).toBe(true);
  });

  it("classifies every public website route as forced-light", () => {
    expect(isWebAppRoute("/")).toBe(false);
    expect(isWebAppRoute("/welcome")).toBe(false);
    expect(isWebAppRoute("/onboarding")).toBe(false);
    expect(isWebAppRoute("/auth")).toBe(false);
    expect(isWebAppRoute("/care-plus")).toBe(false);
    expect(isWebAppRoute("/articles")).toBe(false);
    expect(isWebAppRoute("/legal/terms")).toBe(false);
    expect(isWebAppRoute("/split/abc123")).toBe(false);
    expect(isWebAppRoute("/book/confirm")).toBe(false);
    expect(isWebAppRoute("/install")).toBe(false);
  });

  it("does not confuse lookalike public paths with the /app prefix", () => {
    // Segment-aware matching: "/applications" is NOT "/app". A startsWith("/")
    // implementation would flip these public pages into the customisable
    // surface and leak the dark preference onto the website.
    expect(isWebAppRoute("/applications")).toBe(false);
    expect(isWebAppRoute("/applied")).toBe(false);
    expect(isWebAppRoute("/apple")).toBe(false);
    expect(isWebAppRoute("/applicants")).toBe(false);
  });
});

describe("applyPrePaintThemeClass", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("dark", "light");
  });

  afterEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("dark", "light");
    vi.restoreAllMocks();
  });

  it("honours a stored dark choice on web-app routes", () => {
    navigate("/app");
    setStoredTheme("dark");
    applyPrePaintThemeClass();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("strips a stored dark choice on public website routes", () => {
    navigate("/");
    document.documentElement.classList.add("dark");
    setStoredTheme("dark");
    applyPrePaintThemeClass();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("stays light on web-app routes when nothing is stored", () => {
    navigate("/xooter/earnings");
    setStoredTheme(null);
    applyPrePaintThemeClass();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("treats any stored value other than 'dark' as light", () => {
    navigate("/app");
    setStoredTheme("light");
    applyPrePaintThemeClass();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("does not throw when storage is unavailable", () => {
    // Private browsing / storage disabled: the pre-paint step must degrade to
    // light silently, not block the app from booting.
    navigate("/app");
    vi.spyOn(window.localStorage, "getItem").mockImplementation(() => {
      throw new DOMException("Storage is disabled", "SecurityError");
    });
    expect(() => applyPrePaintThemeClass()).not.toThrow();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});

describe("theme storage key wiring", () => {
  it("is the key App.tsx passes to the ThemeProvider", () => {
    // The pre-paint step, the provider and the toggle all write the same
    // localStorage key. If App.tsx ever goes back to a bare "xoot-theme"
    // literal that drifts from WEB_APP_THEME_STORAGE_KEY, a dark choice made
    // in the app would flash light on the next hard load of /app — the exact
    // defect this wiring prevents, guarded the same way the design-token
    // tests guard their surface.
    const appSource = readFileSync(join(__dirname, "../App.tsx"), "utf8");
    expect(appSource).toContain("storageKey={WEB_APP_THEME_STORAGE_KEY}");
    expect(appSource).not.toContain('storageKey="xoot-theme"');
  });
});
