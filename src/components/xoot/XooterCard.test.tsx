import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { XooterCard, resolvePhoto, type Xooter } from "./XooterCard";

vi.mock("@/hooks/useFavorites", () => ({
  useFavorites: () => ({ isFavorite: () => false, toggleFavorite: vi.fn() }),
}));

describe("Xooter profile evidence", () => {
  it("uses a neutral placeholder when a profile has no photo or references old demo artwork", () => {
    expect(resolvePhoto(null)).toBe("/images/avatar-placeholder.svg");
    expect(resolvePhoto("/src/assets/worker-1.jpg")).toBe("/images/avatar-placeholder.svg");
    expect(resolvePhoto("https://example.test/profile.jpg")).toBe("https://example.test/profile.jpg");
  });

  it("does not invent verification, performance, experience or preferences", () => {
    const profile: Xooter = {
      id: "test-profile", name: "Profile without details", role: "cleaning", rating: 5,
      jobs_completed: 0, hourly_rate: 0, photo_url: null, tags: [], is_zotm: false,
    };
    render(<XooterCard z={profile} />);
    expect(screen.getByText("Not yet reviewed")).toBeInTheDocument();
    expect(screen.queryByLabelText("Verified profile")).not.toBeInTheDocument();
    expect(screen.queryByText(/Own transport|Pet friendly|3\+ yrs|98%/)).not.toBeInTheDocument();
    expect(screen.getByText("Transport not provided")).toBeInTheDocument();
  });
});
