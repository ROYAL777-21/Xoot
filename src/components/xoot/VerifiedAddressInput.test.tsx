import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.hoisted(() => { vi.stubEnv("VITE_MAPBOX_ADDRESS_SUGGESTIONS_ENABLED", "true"); vi.stubEnv("VITE_MAPBOX_PUBLIC_TOKEN", "pk.synthetic-test-token"); });
import { VerifiedAddressInput } from "./VerifiedAddressInput";

const found = "14 Synthetic Test Road, Sandton, South Africa";
const feature = (type = "address") => ({ features: [{ properties: { mapbox_id: "synthetic-address-id", feature_type: type,
  full_address: found, context: { country: { country_code: "ZA" } } } }] });
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const fetchDouble = vi.fn();
function mount() {
  function Place() { const [value, setValue] = useState(""); return <><VerifiedAddressInput value={value} onChange={setValue} /><output aria-label="Booking address">{value}</output></>; }
  render(<Place />);
  return screen.getByRole("combobox", { name: "Service address" });
}
beforeEach(() => { fetchDouble.mockReset(); vi.stubGlobal("fetch", fetchDouble); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("explicit address lookup (provider doubles, not live Mapbox acceptance)", () => {
  it("keeps a single input focus usable and sends no queries while typing", async () => {
    const input = mount();
    input.focus();
    fireEvent.change(input, { target: { value: "14 Test" } });
    fireEvent.change(input, { target: { value: "14 Test Road" } });
    expect(input).toHaveFocus();
    expect(fetchDouble).not.toHaveBeenCalled();
    fetchDouble.mockImplementation(async () => response(feature()));
    fireEvent.click(screen.getByRole("button", { name: "Find address" }));
    expect(await screen.findByRole("option", { name: found })).toBeInTheDocument();
    expect(fetchDouble).toHaveBeenCalledTimes(1);
    const url = new URL(fetchDouble.mock.calls[0][0]);
    expect(url.searchParams.get("autocomplete")).toBe("false");
    expect(url.searchParams.get("permanent")).toBe("false");
    expect(url.searchParams.get("types")).toBe("address");
  });
  it("does not save a temporary result when licensed confirmation fails", async () => {
    const input = mount();
    fireEvent.change(input, { target: { value: "14 Test Road" } });
    fetchDouble.mockResolvedValueOnce(response(feature())).mockResolvedValueOnce(response({}, 403));
    fireEvent.click(screen.getByRole("button", { name: "Find address" }));
    fireEvent.click(await screen.findByRole("option", { name: found }));
    await screen.findByText(/lookup or confirmation is unavailable/);
    expect(screen.getByLabelText("Booking address")).toHaveTextContent("14 Test Road");
    expect(new URL(fetchDouble.mock.calls[1][0]).searchParams.get("permanent")).toBe("true");
    expect(screen.queryByText(/Address found/)).not.toBeInTheDocument();
  });
  it("accepts the address only after permanent confirmation succeeds", async () => {
    const input = mount();
    fireEvent.change(input, { target: { value: "14 Test Road" } });
    fetchDouble.mockImplementation(async () => response(feature()));
    fireEvent.click(screen.getByRole("button", { name: "Find address" }));
    fireEvent.click(await screen.findByRole("option", { name: found }));
    await waitFor(() => expect(screen.getByLabelText("Booking address")).toHaveTextContent(found));
    expect(fetchDouble).toHaveBeenCalledTimes(2);
  });
  it("rejects town-only results and discards a lookup after the address changes", async () => {
    const input = mount();
    fireEvent.change(input, { target: { value: "Sandton" } });
    fetchDouble.mockResolvedValueOnce(response(feature("place")));
    fireEvent.click(screen.getByRole("button", { name: "Find address" }));
    await screen.findByText(/No suggestions found/);
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    let finish: (result: Response) => void = () => {};
    fetchDouble.mockImplementationOnce(() => new Promise<Response>(resolve => { finish = resolve; }));
    fireEvent.click(screen.getByRole("button", { name: "Find address" }));
    fireEvent.change(input, { target: { value: "A different address" } });
    await act(async () => { finish(response(feature())); });
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Booking address")).toHaveTextContent("A different address");
  });
});
