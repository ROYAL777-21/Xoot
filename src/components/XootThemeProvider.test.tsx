import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTheme } from "next-themes";
import { XootThemeProvider } from "./XootThemeProvider";

let dark = false;
const listeners = new Set<(event: MediaQueryListEvent) => void>();
function deviceTheme(matches: boolean) {
  dark = matches;
  act(() => { for (const listener of listeners) listener({ matches } as MediaQueryListEvent); });
}
function Appearance() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  return <><output aria-label="Resolved appearance">{resolvedTheme}</output><select aria-label="Appearance" value={theme} onChange={event => setTheme(event.target.value)}><option value="system">Device default</option><option value="light">Light</option><option value="dark">Dark</option></select></>;
}
const mount = () => render(<XootThemeProvider><Appearance /></XootThemeProvider>);

beforeEach(() => {
  localStorage.clear(); listeners.clear(); dark = false;
  document.documentElement.className = "";
  vi.spyOn(window, "matchMedia").mockImplementation(query => ({
    media: query, get matches() { return dark; }, onchange: null,
    addListener: listener => { if (listener) listeners.add(listener); },
    removeListener: listener => { if (listener) listeners.delete(listener); },
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: () => true,
  }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); document.documentElement.className = ""; });

describe("website appearance", () => {
  it.each([false, true])("paints the device theme before React starts (dark=%s), even with storage unavailable", matches => {
    const source = readFileSync(`${process.cwd()}/public/theme-init.js`, "utf8");
    runInNewContext(source, { document, localStorage: { getItem: () => { throw new Error("Storage blocked"); } }, window: { matchMedia: () => ({ matches }) } });
    expect(document.documentElement).toHaveClass(matches ? "dark" : "light");
    expect(document.documentElement.style.colorScheme).toBe(matches ? "dark" : "light");
  });
  it("follows the device initially and when its setting changes", () => {
    dark = true; mount();
    expect(screen.getByLabelText("Appearance")).toHaveValue("system");
    expect(document.documentElement).toHaveClass("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    deviceTheme(false);
    expect(document.documentElement).toHaveClass("light");
    expect(document.documentElement).not.toHaveClass("dark");
    expect(screen.getByLabelText("Resolved appearance")).toHaveTextContent("light");
  });
  it("keeps a manual choice through device changes and reload, then can return to system", () => {
    const first = mount();
    fireEvent.change(screen.getByLabelText("Appearance"), { target: { value: "dark" } });
    expect(localStorage.getItem("xoot-theme")).toBe("dark");
    deviceTheme(true); deviceTheme(false);
    expect(document.documentElement).toHaveClass("dark");
    first.unmount(); mount();
    expect(screen.getByLabelText("Appearance")).toHaveValue("dark");
    expect(document.documentElement).toHaveClass("dark");
    fireEvent.change(screen.getByLabelText("Appearance"), { target: { value: "system" } });
    expect(localStorage.getItem("xoot-theme")).toBe("system");
    expect(document.documentElement).toHaveClass("light");
    deviceTheme(true); expect(document.documentElement).toHaveClass("dark");
  });
  it("applies the handoff surfaces and text with the root class used by the real provider", () => {
    const style = document.createElement("style");
    style.textContent = readFileSync(`${process.cwd()}/src/styles/kit-tokens.css`, "utf8");
    document.head.appendChild(style);
    try {
      const view = mount();
      expect(getComputedStyle(document.documentElement).getPropertyValue("--xoot-surface-page")).toBe("var(--xoot-neutral-25)");
      fireEvent.change(screen.getByLabelText("Appearance"), { target: { value: "dark" } });
      expect(getComputedStyle(document.documentElement).getPropertyValue("--xoot-surface-page")).toBe("#121110");
      expect(getComputedStyle(document.documentElement).getPropertyValue("--xoot-text-primary")).toBe("#F4F1EF");
      view.unmount();
    } finally { style.remove(); }
  });
});
