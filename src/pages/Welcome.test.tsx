import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import Welcome from "./Welcome";
import * as appleReadiness from "@/lib/apple-auth-readiness";

vi.mock("@/components/SEO", () => ({ SEO: () => null }));
vi.mock("@/lib/haptics", () => ({ haptic: vi.fn() }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function Location() {
  const location = useLocation();
  return <output aria-label="Destination">{location.pathname}{location.search}</output>;
}

it("does not route new users into unready Apple and preserves Google and email entry", () => {
  render(<MemoryRouter><Welcome /><Location /></MemoryRouter>);
  expect(screen.queryByRole("button", { name: "Continue with Apple" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
  expect(screen.getByLabelText("Destination")).toHaveTextContent("/auth?provider=google");
  fireEvent.click(screen.getByRole("button", { name: "Continue with Email" }));
  expect(screen.getByLabelText("Destination")).toHaveTextContent("/auth?method=email");
});

it("retains the Apple entry route only for a future reviewed ready release", () => {
  vi.spyOn(appleReadiness, "isAppleSignInReady").mockReturnValue(true);
  render(<MemoryRouter><Welcome /><Location /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Continue with Apple" }));
  expect(screen.getByLabelText("Destination")).toHaveTextContent("/auth?provider=apple");
});

it("does not advertise an unsupported phone sign-in route", () => {
  render(<MemoryRouter><Welcome /></MemoryRouter>);
  expect(screen.queryByRole("button", { name: /continue with phone/i })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Continue with Email" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Continue with Google" })).toBeInTheDocument();
});

it("does not invent a local completed-home activity count", () => {
  render(<MemoryRouter><Welcome /></MemoryRouter>);
  expect(screen.queryByText(/\d+ homes cleaned/i)).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /handle your home/ })).toBeInTheDocument();
});
