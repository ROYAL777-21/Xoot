import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  calculateXootCredSummary,
  type XootCredLedgerRow,
  type XootCredSummary,
} from "@/lib/xootcred";

export {
  calculateXootCredSummary,
  type XootCredEntry,
  type XootCredLedgerRow,
  type XootCredSummary,
} from "@/lib/xootcred";

const emptySummary: XootCredSummary = {
  availableBalance: 0,
  pendingBalance: 0,
  welcomeCredit: 0,
  welcomeCreditExpiresAt: null,
  entries: [],
};

export const useXootCred = () => {
  const { user, loading: authLoading } = useAuth();
  const [summary, setSummary] = useState<XootCredSummary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (authLoading) return;
    if (!user) {
      setSummary(emptySummary);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    const { data, error: ledgerError } = await supabase
      .from("xootcred_ledger")
      .select("id,amount,direction,status,reason,meta,created_at,expires_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (ledgerError) {
      setSummary(emptySummary);
      setError(ledgerError.message);
      setLoading(false);
      return;
    }

    setSummary(calculateXootCredSummary((data ?? []) as XootCredLedgerRow[]));
    setLoading(false);
  }, [authLoading, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    ...summary,
    loading: authLoading || loading,
    error,
    refresh,
  };
};
