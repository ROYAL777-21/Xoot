import { useEffect, useRef, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { VisitActionGuard } from "@/components/visits/action-contract";

/**
 * Hands the customer to PayFast.
 *
 * ── Why a form and not a redirect ───────────────────────────────────────────────
 * PayFast's hosted checkout expects an HTTP **POST** of the signed field set. A `window.location`
 * redirect would send a GET with no body and land on an error page, so the fields are rendered as
 * hidden inputs and the form is submitted.
 *
 * ── Why the fields are not built here ───────────────────────────────────────────
 * Everything posted is signed server-side by `create-payment-session`, which reads the amount from
 * `payment_records` rather than from anything this component knows. If the browser could influence
 * the amount, the signature would be over a number the customer chose.
 *
 * The merchant *key* does appear in the posted form — that is PayFast's redirect design. The
 * passphrase never leaves the server; `payfast-checkout.test.ts` asserts it is absent from the
 * response.
 */

type CheckoutResponse = {
  url: string;
  fields: Array<[string, string]>;
  amount_cents: number;
};

type Props = VisitActionGuard & {
  paymentRecordId: string;
  /** Rendered in place of the button when checkout is unavailable, so the reason is never hidden. */
  onUnavailable?: (reason: string) => void;
  className?: string;
  label?: string;
};

export const PayFastCheckout = ({ paymentRecordId, onUnavailable, className, label, isCurrent = () => true, invoke }: Props) => {
  const [checkout, setCheckout] = useState<CheckoutResponse | null>(null);
  const [starting, setStarting] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const mounted = useRef(true);
  const pending = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  /*
   * Submit only once the fields are in the DOM.
   *
   * Calling `submit()` in the same tick as `setCheckout` would post an empty form: React has not
   * rendered the hidden inputs yet. The effect runs after commit, so the fields exist.
   */
  useEffect(() => {
    if (checkout && formRef.current && mounted.current && isCurrent()) formRef.current.submit();
  }, [checkout, isCurrent]);

  const start = async () => {
    if (pending.current || !mounted.current || !isCurrent()) return;
    pending.current = true;
    setStarting(true);
    setBlocked(null);

    let data: unknown, error: unknown;
    try {
      const body = { payment_record_id: paymentRecordId };
      if (invoke) data = await invoke("create-payment-session", body);
      else { const result = await supabase.functions.invoke("create-payment-session", { body }); data = result.data; error = result.error; }
    } catch (failure) { error = failure; }
    if (!mounted.current || !isCurrent()) return;
    pending.current = false;

    if (error) {
      toast.error("Could not start the payment. Please try again.");
      setStarting(false);
      return;
    }

    const result = data as
      | { success?: boolean; error?: string; reason?: string; data?: CheckoutResponse }
      | null;

    if (result?.success === false) {
      /*
       * `reason` is the gate's own explanation — "hosted checkout is switched off for this
       * provider", "payment reconciliation has not been verified". Surfaced rather than swallowed:
       * a payment button that silently does nothing is how a launch blocker survives a week of
       * testing.
       */
      const reason = result.reason ?? result.error ?? "Payment is not available yet.";
      setBlocked(reason);
      onUnavailable?.(reason);
      setStarting(false);
      return;
    }

    const session = result?.data ?? (data as CheckoutResponse | null);
    if (!session?.url || !session.fields?.length) {
      toast.error("Could not start the payment. Please try again.");
      setStarting(false);
      return;
    }
    setCheckout(session);
  };

  if (blocked) {
    return (
      <div className={className}>
        <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm">
          <p className="font-semibold text-foreground">Card payment is not switched on yet</p>
          <p className="mt-1 text-muted-foreground">{blocked}</p>
          <p className="mt-2 text-muted-foreground">
            Your booking is saved. We will confirm it as soon as your payment reaches us.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <Button
        onClick={start}
        disabled={starting || Boolean(checkout)}
        className="w-full rounded-2xl h-12 gradient-warm font-semibold"
      >
        {starting || checkout ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Taking you to PayFast…
          </>
        ) : (
          <>
            <ShieldCheck className="mr-2 h-4 w-4" /> {label ?? "Pay securely"}
          </>
        )}
      </Button>

      {/*
        Rendered only once signed fields exist, then submitted by the effect above. `hidden` rather
        than unmounted-until-submit so the inputs are in the DOM when `submit()` fires.
      */}
      {checkout && (
        <form ref={formRef} action={checkout.url} method="POST" hidden aria-hidden="true">
          {checkout.fields.map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} readOnly />
          ))}
        </form>
      )}
    </div>
  );
};

export default PayFastCheckout;
