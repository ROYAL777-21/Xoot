import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  calculateXootCredSummary,
  type XootCredLedgerRow,
  type XootCredSummary,
} from "@/lib/xootcred";
import { readAllXootCredRows } from "@/lib/xootcred-read";

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

type WalletState = {
  accountId: string | null;
  summary: XootCredSummary;
  loading: boolean;
  error: string | null;
};

export const useXootCred = () => {
  const { user, loading: authLoading } = useAuth();
  const accountId = authLoading ? null : user?.id ?? null;
  const accountRef = useRef(accountId);
  accountRef.current = accountId;
  const requestRef = useRef(0);
  const mountedRef = useRef(false);
  const [state, setState] = useState<WalletState>({
    accountId: null,
    summary: emptySummary,
    loading: true,
    error: null,
  });

  const refresh = useCallback(async () => {
    if (!accountId || accountRef.current !== accountId) return;
    const request = ++requestRef.current;
    setState({ accountId, summary: emptySummary, loading: true, error: null });
    try {
      const rows = await readAllXootCredRows<XootCredLedgerRow>((from, to) =>
        supabase
          .from("xootcred_ledger")
          .select("id,amount,direction,status,reason,meta,created_at,expires_at")
          .eq("user_id", accountId)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(from, to),
      );
      if (mountedRef.current && accountRef.current === accountId && requestRef.current === request) {
        setState({ accountId, summary: calculateXootCredSummary(rows), loading: false, error: null });
      }
    } catch {
      if (mountedRef.current && accountRef.current === accountId && requestRef.current === request) {
        setState({
          accountId,
          summary: emptySummary,
          loading: false,
          error: "XootCred could not be refreshed. Try again shortly.",
        });
      }
    }
  }, [accountId]);

  useEffect(() => {
    const requests = requestRef;
    mountedRef.current = true;
    return () => { mountedRef.current = false; ++requests.current; };
  }, []);

  useEffect(() => {
    const requests = requestRef;
    if (authLoading || !accountId) {
      ++requestRef.current;
      setState({ accountId: null, summary: emptySummary, loading: authLoading, error: null });
    } else {
      void refresh();
    }
    return () => { ++requests.current; };
  }, [authLoading, accountId, refresh]);

  const visible = state.accountId === accountId && !authLoading
    ? state
    : { accountId, summary: emptySummary, loading: Boolean(accountId), error: null };

  return {
    ...visible.summary,
    loading: authLoading || visible.loading,
    error: visible.error,
    refresh,
  };
};
