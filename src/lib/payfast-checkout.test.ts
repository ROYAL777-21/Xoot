import { beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } },
}));

const { requestCheckoutSession, submitCheckout } = await import("./payfast-checkout");

/**
 * These cover the two things that can go wrong on the client half of checkout:
 *
 *   1. A refusal is shown as the wrong refusal. "Payment is switched off" and "we could not reach
 *      the provider" are different facts, and a customer told the wrong one either waits for a call
 *      that is not coming or calls support about a switch nobody has flipped.
 *   2. The field order is lost. PayFast signs the fields in the order sent, so a form built in any
 *      other order carries a signature that can never verify — and the symptom is every payment
 *      failing with what reads as a credentials problem.
 */

const SESSION = {
  process_url: "https://sandbox.payfast.co.za/eng/process",
  fields: [
    { name: "merchant_id", value: "10000100" },
    { name: "merchant_key", value: "46f0cd694581a" },
    { name: "m_payment_id", value: "xoot_booking_abc_1" },
    { name: "amount", value: "387.00" },
    { name: "item_name", value: "Xoot deep clean booking" },
    { name: "signature", value: "abc123" },
  ],
  amount: 387,
  currency: "ZAR",
  booking_id: "abc",
  payment_record_id: "pay-1",
};

beforeEach(() => invoke.mockReset());

describe("requestCheckoutSession maps each refusal to its own outcome", () => {
  it("returns a ready session on success", async () => {
    invoke.mockResolvedValue({ data: SESSION, error: null });
    const outcome = await requestCheckoutSession("abc");
    expect(outcome).toEqual({ kind: "ready", session: SESSION });
  });

  it("unwraps a data-envelope response", async () => {
    invoke.mockResolvedValue({ data: { data: SESSION }, error: null });
    const outcome = await requestCheckoutSession("abc");
    expect(outcome.kind).toBe("ready");
  });

  it("reports already_paid rather than sending someone to pay twice", async () => {
    invoke.mockResolvedValue({ data: { already_paid: true, booking_id: "abc" }, error: null });
    expect(await requestCheckoutSession("abc")).toEqual({ kind: "already_paid" });
  });

  it.each([
    ["control_disabled", "disabled"],
    ["provider_not_configured", "not_configured"],
    ["multi_record_checkout_unsupported", "multi_record"],
  ])("maps the %s refusal to %s", async (reason, kind) => {
    invoke.mockResolvedValue({
      data: null,
      error: { message: "failed", context: { body: JSON.stringify({ error: "nope", reason }) } },
    });
    expect((await requestCheckoutSession("abc")).kind).toBe(kind);
  });

  it("falls back to a generic error rather than guessing a reason", async () => {
    invoke.mockResolvedValue({ data: null, error: { message: "boom", context: { body: "not json" } } });
    const outcome = await requestCheckoutSession("abc");
    expect(outcome).toEqual({ kind: "error", message: "boom" });
  });

  it("treats a response with no fields as an error, not as a payable session", async () => {
    invoke.mockResolvedValue({ data: { process_url: "https://x", fields: [] }, error: null });
    expect((await requestCheckoutSession("abc")).kind).toBe("error");
  });

  it("sends only the booking id — never an amount", async () => {
    invoke.mockResolvedValue({ data: SESSION, error: null });
    await requestCheckoutSession("abc");
    // An endpoint that accepts a price from the payer is an endpoint where the payer picks the price.
    expect(invoke).toHaveBeenCalledWith("create-payment-session", { body: { bookingId: "abc" } });
  });
});

describe("submitCheckout", () => {
  const makeDoc = () => {
    const submit = vi.fn();
    const doc = document.implementation.createHTMLDocument("t");
    const created = doc.createElement.bind(doc);
    vi.spyOn(doc, "createElement").mockImplementation((tag: string) => {
      const el = created(tag);
      if (tag === "form") (el as HTMLFormElement).submit = submit;
      return el;
    });
    return { doc, submit };
  };

  it("POSTs to the process url", () => {
    const { doc, submit } = makeDoc();
    submitCheckout(SESSION, doc);
    const form = doc.querySelector("form")!;
    expect(form.method.toUpperCase()).toBe("POST");
    expect(form.getAttribute("action")).toBe(SESSION.process_url);
    expect(submit).toHaveBeenCalledOnce();
  });

  it("preserves the exact field order PayFast signed", () => {
    const { doc } = makeDoc();
    submitCheckout(SESSION, doc);
    const names = [...doc.querySelectorAll("input")].map((i) => i.getAttribute("name"));
    expect(names).toEqual(SESSION.fields.map((f) => f.name));
  });

  it("sets values as properties, never as markup", () => {
    // The one screen in the product where the user is about to enter card details is the worst
    // possible place for an injection point.
    const { doc } = makeDoc();
    submitCheckout(
      { ...SESSION, fields: [{ name: "item_name", value: '"><script>alert(1)</script>' }] },
      doc,
    );
    expect(doc.querySelector("script")).toBeNull();
    expect(doc.querySelector("input")!.value).toBe('"><script>alert(1)</script>');
  });
});
