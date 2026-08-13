import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { BoostCelebration } from "./BoostCelebration";
import { STARTING_RATE_BPS } from "@/lib/xooter-commission";

const boost = {
  id: "boost-1",
  bps: 500,
  startsAt: new Date(Date.now() - 3600_000).toISOString(),
  endsAt: new Date(Date.now() + 13 * 86400_000).toISOString(),
  reason: "Three weeks without a late arrival.",
};

describe("BoostCelebration", () => {
  beforeEach(() => window.localStorage.clear());

  it("announces the boost with the exactly-true claim", async () => {
    render(<BoostCelebration boosts={[boost]} currentRateBps={STARTING_RATE_BPS} exampleSubtotalCents={29600} />);

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    expect(screen.getByText("You keep 5% more of every job.")).toBeInTheDocument();
    expect(screen.getByText("35% → 30%")).toBeInTheDocument();
    // The understated framing must not appear anywhere on the card.
    expect(screen.queryByText(/earnings.*up 5%/i)).not.toBeInTheDocument();
  });

  it("shows the reason the boost was granted", async () => {
    render(<BoostCelebration boosts={[boost]} currentRateBps={STARTING_RATE_BPS} />);
    await waitFor(() =>
      expect(screen.getByText(/Three weeks without a late arrival/)).toBeInTheDocument(),
    );
  });

  it("renders nothing when there is no active boost", () => {
    const { container } = render(<BoostCelebration boosts={[]} currentRateBps={STARTING_RATE_BPS} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("dismisses on Thanks and does not come back", async () => {
    // The property that keeps this a celebration rather than a fortnight-long banner.
    const { unmount } = render(
      <BoostCelebration boosts={[boost]} currentRateBps={STARTING_RATE_BPS} />,
    );
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Thanks" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    unmount();
    render(<BoostCelebration boosts={[boost]} currentRateBps={STARTING_RATE_BPS} />);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("is dismissible from the close button and the backdrop", async () => {
    render(<BoostCelebration boosts={[boost]} currentRateBps={STARTING_RATE_BPS} />);
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("carries the pop animation on a duration token, so reduced motion zeroes it", async () => {
    // `--xoot-dur-slow` is set to 0ms under `prefers-reduced-motion` in index.css. Hard-coding a
    // duration here would bypass that and spin for someone who asked it not to.
    render(<BoostCelebration boosts={[boost]} currentRateBps={STARTING_RATE_BPS} />);
    const card = await screen.findByRole("dialog");
    expect(card.className).toContain("xoot-pop");
    expect(card.className).toContain("var(--xoot-dur-slow");
  });
});
