import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AccessWindowTimeline } from "./AccessWindowTimeline";

describe("AccessWindowTimeline", () => {
  it("offers five discrete stages, not a slider", () => {
    // There is nothing between the states — a code is not 40% released. A range input would
    // imply intermediate values that do not exist, which is the handoff's own reasoning and
    // the reason this is a list of buttons.
    const { container } = render(<AccessWindowTimeline />);
    expect(container.querySelector('input[type="range"]')).toBeNull();
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
  });

  it("shows codes only while the window is open", () => {
    render(<AccessWindowTimeline />);
    // Opens on the released stage, so the sample codes are visible.
    expect(screen.getByText("1408#")).toBeInTheDocument();

    // Step back to before the release: locked, and nothing readable.
    fireEvent.click(screen.getByText("You save the details"));
    expect(screen.queryByText("1408#")).not.toBeInTheDocument();
    expect(screen.getByText(/Encrypted and unreadable/i)).toBeInTheDocument();

    // Step forward to deletion. Matched on panel-only wording: "Not archived" alone appears
    // in the stage list too, so it would pass for the wrong reason.
    fireEvent.click(screen.getByText("The codes are deleted"));
    expect(screen.queryByText("1408#")).not.toBeInTheDocument();
    expect(screen.getByText(/Deleted seven days after the visit/i)).toBeInTheDocument();
  });

  it("revokes from any stage, and says what revoking does not do", () => {
    render(<AccessWindowTimeline />);
    expect(screen.getByText("1408#")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /revoke access now/i }));

    // Codes gone immediately, and the label distinguishes revoked from the routine deletion.
    expect(screen.queryByText("1408#")).not.toBeInTheDocument();
    expect(screen.getByText("Revoked")).toBeInTheDocument();
    expect(screen.getByText(/withdrawn, not why/i)).toBeInTheDocument();

    // The three things a customer needs to know before they dare press it.
    const copy = document.body.textContent ?? "";
    expect(copy).toMatch(/takes effect at the next read/i);
    expect(copy).toMatch(/does not cancel the visit/i);
    expect(copy).toMatch(/does not charge you/i);
  });

  it("labels the panel as an illustration rather than a screenshot", () => {
    // The sample codes are obviously fake and must stay that way. A demo that reads as a
    // screenshot of a real customer's gate code is a worse problem than one nobody believes.
    render(<AccessWindowTimeline />);
    expect(screen.getByText(/illustration/i)).toBeInTheDocument();
  });
});
