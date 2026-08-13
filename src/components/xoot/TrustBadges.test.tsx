import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TrustBadges } from "./TrustBadges";

describe("TrustBadges", () => {
  it("renders visible contractor trust signals and overflow count", () => {
    render(<TrustBadges badges={["verified", "background_checked", "top_rated", "airbnb_specialist"]} limit={3} />);

    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(screen.getByText("Background Checked")).toBeInTheDocument();
    expect(screen.getByText("Top Rated")).toBeInTheDocument();
    expect(screen.getByText("+1")).toBeInTheDocument();
  });
});
