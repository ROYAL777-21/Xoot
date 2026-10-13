import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AccessWindowTimeline } from "./AccessWindowTimeline";

describe("AccessWindowTimeline explanation", () => {
  it("offers five discrete stages with a selected step and linked preview", () => {
    render(<AccessWindowTimeline />);
    const steps = screen.getAllByRole("listitem");
    expect(steps).toHaveLength(5);
    const opened = within(steps[1]).getByRole("button");
    expect(opened).toHaveAttribute("aria-current", "step");
    expect(document.getElementById(opened.getAttribute("aria-controls") ?? "")).toHaveAttribute("aria-live", "polite");
  });

  it("only shows example details in the open stages", () => {
    render(<AccessWindowTimeline />);
    expect(screen.getByText("EXAMPLE#")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /you save the details/i }));
    expect(screen.queryByText("EXAMPLE#")).not.toBeInTheDocument();
    expect(screen.getByText("In this explanation, the window is closed.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /access stays limited/i }));
    expect(screen.getByText("EXAMPLE#")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /codes are removed/i }));
    expect(screen.queryByText("EXAMPLE#")).not.toBeInTheDocument();
    expect(screen.getByText("In this explanation, the codes have been removed.")).toBeInTheDocument();
  });

  it("withdraws the illustration and resets when selecting another stage", () => {
    render(<AccessWindowTimeline />);
    const control = screen.getByRole("switch", { name: /illustrate withdrawn access/i });
    fireEvent.click(control);
    expect(control).toBeChecked();
    expect(screen.queryByText("EXAMPLE#")).not.toBeInTheDocument();
    expect(screen.getByText("Withdrawn")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /the window opens/i }));
    expect(control).not.toBeChecked();
    expect(screen.getByText("EXAMPLE#")).toBeInTheDocument();
  });

  it("does not impersonate a connected booking or a live access action", () => {
    render(<AccessWindowTimeline />);
    expect(screen.getByText(/sharing and scheduled deletion are not available yet/i)).toBeInTheDocument();
    expect(screen.getByText(/no home or booking connected/i)).toBeInTheDocument();
    expect(screen.getByText("Changes this explanation only.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /revoke access now/i })).not.toBeInTheDocument();
  });
});
