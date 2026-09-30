import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConciergeOmnibox } from "./ConciergeOmnibox";

const harness = vi.hoisted(() => ({ open: vi.fn(), onAction: vi.fn() }));
vi.mock("@/contexts/ConciergeContext", () => ({ useConcierge: () => ({ openConcierge: harness.open }) }));
vi.mock("@/hooks/useConciergeConfig", () => ({ useConciergeConfig: () => ({ webEnabled: true }) }));
vi.mock("@/lib/haptics", () => ({ haptic: vi.fn() }));
function Location() { return <output hidden data-testid="destination">{useLocation().pathname}</output>; }
function mount() { return render(<MemoryRouter initialEntries={["/app"]}><ConciergeOmnibox onAction={harness.onAction} /><button>Outside</button><Location /></MemoryRouter>); }
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.useRealTimers(); });

describe("app search activation", () => {
  it("retains results when focus moves into them and activates through click", () => {
    vi.useFakeTimers(); mount();
    const input = screen.getByRole("textbox"); act(() => input.focus());
    fireEvent.change(input, { target: { value: "support" } });
    const result = screen.getByRole("button", { name: "Support Talk to a human" });
    act(() => result.focus()); act(() => vi.advanceTimersByTime(250));
    expect(result).toBeInTheDocument(); expect(result).toHaveFocus();
    // Keyboard button activation produces click without a preceding mousedown.
    fireEvent.click(result);
    expect(screen.getByTestId("destination")).toHaveTextContent("/app/support");
    expect(harness.onAction).toHaveBeenCalledOnce();
  });
  it("opens Concierge with unsent text from an activated result", () => {
    mount(); const input = screen.getByRole("textbox"); act(() => input.focus());
    fireEvent.change(input, { target: { value: "how do I prepare?" } });
    const result = screen.getByRole("button", { name: /Ask the Concierge/ });
    act(() => result.focus()); fireEvent.click(result);
    expect(harness.open).toHaveBeenCalledWith("how do I prepare?");
    expect(harness.onAction).toHaveBeenCalledOnce();
  });
  it("closes results only when focus leaves the search group", () => {
    mount(); const input = screen.getByRole("textbox"); act(() => input.focus());
    fireEvent.change(input, { target: { value: "support" } });
    act(() => screen.getByRole("button", { name: "Outside" }).focus());
    expect(screen.queryByRole("group", { name: "Search results" })).not.toBeInTheDocument();
  });
});
