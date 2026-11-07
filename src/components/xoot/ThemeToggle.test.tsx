import { fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ThemeToggle } from "./ThemeToggle";
import { WEB_APP_THEME_STORAGE_KEY } from "@/lib/theme-scope";

describe("ThemeToggle", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("dark", "light");
  });

  afterEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("dark", "light");
  });

  it("renders nothing on the forced-light website surface", () => {
    // forcedTheme is what App.tsx sets on every public route. The toggle must
    // not appear there at all — light mode is the standard on the website and
    // is not customisable (founder rule, 2026-10-28).
    render(
      <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" enableSystem={false} storageKey={WEB_APP_THEME_STORAGE_KEY}>
        <ThemeToggle />
      </ThemeProvider>,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("switches the web-app surface to dark and persists the choice", () => {
    // No forcedTheme = the signed-in web-app surface, where customisation IS allowed.
    render(
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey={WEB_APP_THEME_STORAGE_KEY}>
        <ThemeToggle />
      </ThemeProvider>,
    );

    const button = screen.getByRole("button", { name: "Switch to dark mode" });
    fireEvent.click(button);

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(window.localStorage.getItem(WEB_APP_THEME_STORAGE_KEY)).toBe("dark");

    // The label flips so the same control switches back.
    fireEvent.click(screen.getByRole("button", { name: "Switch to light mode" }));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(window.localStorage.getItem(WEB_APP_THEME_STORAGE_KEY)).toBe("light");
  });
});
