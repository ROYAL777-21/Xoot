import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, it } from "vitest";
import { SuburbPicker } from "./SuburbPicker";
afterEach(cleanup);
it("offers a visible native choice and preserves entry for another suburb", () => {
  function Place() { const [value, setValue] = useState(""); return <><SuburbPicker value={value} onChange={setValue} /><output aria-label="Selected suburb">{value}</output></>; }
  render(<Place />);
  const picker = screen.getByRole("combobox", { name: "Suburb" });
  expect(screen.getByRole("option", { name: "Choose your suburb" })).toBeInTheDocument();
  fireEvent.change(picker, { target: { value: "Sandton" } });
  expect(screen.getByLabelText("Selected suburb")).toHaveTextContent("Sandton");
  fireEvent.change(picker, { target: { value: "other" } });
  const other = screen.getByRole("textbox", { name: "Your suburb" });
  fireEvent.change(other, { target: { value: "Centurion" } });
  expect(screen.getByLabelText("Selected suburb")).toHaveTextContent("Centurion");
  fireEvent.change(picker, { target: { value: "Bryanston" } });
  expect(screen.queryByRole("textbox", { name: "Your suburb" })).not.toBeInTheDocument();
  expect(screen.getByLabelText("Selected suburb")).toHaveTextContent("Bryanston");
});
