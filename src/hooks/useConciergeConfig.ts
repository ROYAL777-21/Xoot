import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";

/**
 * Which Concierge capabilities are switched on, read from `concierge-config`.
 *
 * The controls live in `operational_controls`, which is admin-read-only under RLS, so this cannot
 * be a table read — `concierge-config` is the only route. See that function for why.
 *
 * ── The default, and why it is this way round ───────────────────────────────────
 * While loading, and when Supabase is not configured at all, `web` is **true**. That is
 * deliberately the opposite of the server's fail-closed default, and the two are right for
 * different reasons:
 *
 * - The **server** fails closed because the cost of wrongly answering is unbounded — it is the
 *   thing a kill switch exists to prevent.
 * - The **client** fails open because the cost of wrongly hiding is a person who cannot find help
 *   and has no way to know the button was ever there. And hiding it buys nothing: every request
 *   the launcher can make re-checks the controls server-side, so a client that draws a button it
 *   should not have simply gets a refusal.
 *
 * In other words the client's copy is a hint for drawing, never a permission. It is never the only
 * thing standing between a caller and an action.
 */

export type ConciergeCapabilities = {
  enabled: boolean;
  web: boolean;
  mobile: boolean;
  modelAnswers: boolean;
  staticFallback: boolean;
  humanHandoff: boolean;
  supportCaseCreation: boolean;
  caseCreationTool: boolean;
  bookingStatus: boolean;
  authenticatedAccountSupport: boolean;
  carePlusSupport: boolean;
  xootcredSupport: boolean;
  referralSupport: boolean;
  bookingCoverSupport: boolean;
  partnershipInterest: boolean;
  xooterSupport: boolean;
  killed: boolean;
};

/** What the UI assumes until the real answer arrives. See the note above. */
const OPTIMISTIC: Pick<ConciergeCapabilities, "enabled" | "web" | "killed"> = {
  enabled: true,
  web: true,
  killed: false,
};

/**
 * Module-level so the answer is fetched once per page load rather than once per mounting
 * component — the launcher and the omnibox both want it, and they mount independently.
 */
let cached: Promise<Partial<ConciergeCapabilities>> | null = null;

const load = (): Promise<Partial<ConciergeCapabilities>> => {
  if (cached) return cached;
  cached = (async () => {
    if (!isSupabaseConfigured) return OPTIMISTIC;
    try {
      const { data, error } = await supabase.functions.invoke("concierge-config", { body: {} });
      if (error) throw error;
      const capabilities = (data as { capabilities?: Partial<ConciergeCapabilities> } | null)?.capabilities;
      return capabilities ?? OPTIMISTIC;
    } catch (err) {
      // Warned rather than swallowed: a config endpoint that is quietly unreachable is how a
      // switch stops working without anyone noticing.
      console.warn("concierge config unavailable; assuming the launcher should render", err);
      return OPTIMISTIC;
    }
  })();
  return cached;
};

/** Test seam. Not for production code — resets the module-level cache. */
export const __resetConciergeConfigCache = () => {
  cached = null;
};

export const useConciergeConfig = () => {
  const [capabilities, setCapabilities] = useState<Partial<ConciergeCapabilities>>(OPTIMISTIC);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    load().then((value) => {
      if (!active) return;
      setCapabilities(value);
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  return {
    capabilities,
    loaded,
    /** Should the web Concierge be offered at all? */
    webEnabled: Boolean(capabilities.enabled ?? true) && Boolean(capabilities.web ?? true) && !capabilities.killed,
  };
};
