import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SensitiveFieldReveal } from "./SensitiveFieldReveal";

const invoke = vi.hoisted(() => vi.fn());

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke },
  },
}));

vi.mock("@/lib/haptics", () => ({
  haptic: vi.fn(),
}));

describe("SensitiveFieldReveal", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("reveals a sensitive field through the Edge Function and clears it after the timer", async () => {
    invoke.mockResolvedValue({
      data: {
        success: true,
        data: {
          value: "Gate 42",
          expires_in_seconds: 1,
        },
      },
      error: null,
    });

    render(<SensitiveFieldReveal bookingId="booking-1" field="gate_code" label="Gate code" withinWindow />);

    fireEvent.click(screen.getByRole("button", { name: /reveal gate code/i }));

    await waitFor(() => expect(screen.getByText("Gate 42")).toBeInTheDocument());
    expect(invoke).toHaveBeenCalledWith("get-sensitive-access", {
      body: { booking_id: "booking-1", field: "gate_code" },
    });

    await waitFor(() => expect(screen.queryByText("Gate 42")).not.toBeInTheDocument(), { timeout: 1_500 });
    expect(screen.getByText("••••••")).toBeInTheDocument();
  });
});
