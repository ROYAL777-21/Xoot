import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

/**
 * Lets anything in the app open the Concierge, optionally with a question already typed in.
 *
 * ── Why a context rather than a second chat ─────────────────────────────────────
 * `XootSupportBot` is the Concierge: the message list, the redaction guard, the rate limit, the
 * report-answer path and the escalation copy all live there. The omnibox needs to hand it a
 * question, not reimplement any of that. A second chat surface would mean two places to keep the
 * "no secrets, OTPs or access codes" guard correct, and one of them would eventually drift.
 *
 * `XootSupportBot` previously owned its own `open` state and could only be opened from outside via
 * the `?zootBot=open` query parameter — which works, but navigating to open a panel puts the
 * question in the URL, and the whole point of the guard above is that questions do not belong in
 * places that get logged and shared.
 */

type ConciergeContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  /** Open the panel, optionally pre-filling the composer. */
  openConcierge: (prefill?: string) => void;
  /** Text waiting to be placed in the composer, or null. */
  prefill: string | null;
  /** Take the pending prefill exactly once, so reopening the panel does not re-insert it. */
  consumePrefill: () => string | null;
};

const ConciergeContext = createContext<ConciergeContextValue | null>(null);

export const ConciergeProvider = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [prefill, setPrefill] = useState<string | null>(null);

  const openConcierge = useCallback((text?: string) => {
    if (typeof text === "string" && text.trim()) setPrefill(text.trim());
    setOpen(true);
  }, []);

  const consumePrefill = useCallback(() => {
    let taken: string | null = null;
    setPrefill((current) => {
      taken = current;
      return null;
    });
    return taken;
  }, []);

  const value = useMemo(
    () => ({ open, setOpen, openConcierge, prefill, consumePrefill }),
    [open, openConcierge, prefill, consumePrefill],
  );

  return <ConciergeContext.Provider value={value}>{children}</ConciergeContext.Provider>;
};

/**
 * Returns `null` outside a provider rather than throwing.
 *
 * The Concierge launcher mounts at the app root and the omnibox only inside `AppShell`, so a
 * component can legitimately render in a tree without the provider — in a test, in the kit
 * gallery, or on a marketing route. Throwing there would turn a missing help affordance into a
 * blank page, which is a much worse failure than the affordance being absent.
 */
export const useConcierge = () => useContext(ConciergeContext);
