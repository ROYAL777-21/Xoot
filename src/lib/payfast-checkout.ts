/**
 * Send the customer to PayFast.
 *
 * ── Why a form POST and not a redirect ─────────────────────────────────────────────────────────
 * PayFast's custom integration expects the signed fields as an `application/x-www-form-urlencoded`
 * POST body. Putting them in a query string would put the merchant key in the browser's address
 * bar, the referrer header and every proxy log between here and there. So this builds a real form
 * and submits it — the browser navigates, PayFast takes over, and the customer comes back to
 * `return_url`.
 *
 * ── The ordering rule, restated because it is easy to lose here ────────────────────────────────
 * PayFast signs the fields IN THE ORDER SENT. The server returns them as an ordered ARRAY for
 * exactly that reason. Do not turn this into an object, a `Record`, or anything else whose
 * iteration order is a language detail — `create-payment-session` and `_shared/payfast-checkout.ts`
 * both carry the same warning, and this is the third and last place the order can be lost.
 *
 * ── What this cannot do ────────────────────────────────────────────────────────────────────────
 * Nothing here has run against a live PayFast merchant; the credentials do not exist yet on either
 * project and the gateway's docs are unreachable from the build environment. The server refuses
 * unless `payments.provider_checkout` and `payments.hosted_checkout.payfast` are both on, so this
 * path is inert until a human turns it on — deliberately.
 */

import { supabase } from "@/integrations/supabase/client";

export type CheckoutField = { name: string; value: string };

export type CheckoutSession = {
  process_url: string;
  fields: CheckoutField[];
  amount: number;
  currency: string;
  booking_id: string;
  payment_record_id: string;
};

/**
 * Why each refusal is named rather than collapsed into one error string: the UI says something
 * different for each, and "payment is switched off" and "we could not reach the payment provider"
 * must not be shown interchangeably to a customer trying to pay.
 */
export type CheckoutOutcome =
  | { kind: "ready"; session: CheckoutSession }
  | { kind: "already_paid" }
  | { kind: "disabled" }
  | { kind: "not_configured" }
  | { kind: "multi_record" }
  | { kind: "error"; message: string };

const REASON_TO_KIND: Record<string, CheckoutOutcome["kind"]> = {
  control_disabled: "disabled",
  provider_not_configured: "not_configured",
  multi_record_checkout_unsupported: "multi_record",
};

/** Ask the server for a signed session. Every money value in the result comes from the database. */
export async function requestCheckoutSession(bookingId: string): Promise<CheckoutOutcome> {
  const { data, error } = await supabase.functions.invoke("create-payment-session", {
    body: { bookingId },
  });

  /*
   * A non-2xx from an Edge Function surfaces as `error` with the body attached rather than parsed,
   * so the structured `reason` has to be dug out. Falling back to a generic message when it cannot
   * be is right — guessing a reason would show the customer a specific and wrong explanation.
   */
  if (error) {
    const body = (error as { context?: { body?: unknown } }).context?.body;
    const parsed = typeof body === "string" ? safeParse(body) : (body as Record<string, unknown>);
    const reason = String(parsed?.reason ?? "");
    if (reason in REASON_TO_KIND) return { kind: REASON_TO_KIND[reason] } as CheckoutOutcome;
    return { kind: "error", message: String(parsed?.error ?? error.message ?? "Could not start payment") };
  }

  const payload = (data as { data?: Record<string, unknown> } | null)?.data ?? (data as Record<string, unknown> | null);
  if (!payload) return { kind: "error", message: "Could not start payment" };
  if (payload.already_paid) return { kind: "already_paid" };

  const reason = String(payload.reason ?? "");
  if (reason in REASON_TO_KIND) return { kind: REASON_TO_KIND[reason] } as CheckoutOutcome;

  const fields = Array.isArray(payload.fields) ? (payload.fields as CheckoutField[]) : [];
  const processUrl = String(payload.process_url ?? "");
  if (!processUrl || fields.length === 0) return { kind: "error", message: "Could not start payment" };

  return {
    kind: "ready",
    session: {
      process_url: processUrl,
      fields,
      amount: Number(payload.amount ?? 0),
      currency: String(payload.currency ?? "ZAR"),
      booking_id: String(payload.booking_id ?? ""),
      payment_record_id: String(payload.payment_record_id ?? ""),
    },
  };
}

function safeParse(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Build the form and navigate.
 *
 * Every value goes in through `input.value`, never through markup. A field value that reached the
 * DOM as a string of HTML would be an injection point on the one page in the product where the
 * user is about to type card details — and `assert-no-unsafe-dom-apis.mjs` fails the build for
 * `innerHTML` anyway, which is the guard working rather than a coincidence.
 */
export function submitCheckout(session: CheckoutSession, doc: Document = document): void {
  const form = doc.createElement("form");
  form.method = "POST";
  form.action = session.process_url;
  form.style.display = "none";

  for (const { name, value } of session.fields) {
    const input = doc.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  doc.body.appendChild(form);
  form.submit();
}
