import { useCallback, useEffect, useState } from "react";
import type { Json } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type XootCredLedgerRow = {
  id?: string;
  amount: number | string;
  direction?: "credit" | "debit" | string | null;
  status?: "pending" | "available" | "redeemed" | "expired" | "cancelled" | string | null;
  reason: string;
  meta?: Json | null;
  created_at: string;
  expires_at?: string | null;
};

export type XootCredEntry = {
  id: string;
  amount: number;
  displayAmount: number;
  direction: "credit" | "debit";
  status: string;
  reason: string;
  createdAt: string;
  expiresAt: string | null;
  isExpired: boolean;
  isPending: boolean;
};

export type XootCredSummary = {
  availableBalance: number;
  pendingBalance: number;
  /** The one-time R30 Care+ welcome credit, while it is live. Not a monthly grant. */
  welcomeCredit: number;
  welcomeCreditExpiresAt: string | null;
  entries: XootCredEntry[];
};

const inactiveStatuses = new Set(["expired", "cancelled"]);
const pendingStatuses = new Set(["pending"]);

const toNumber = (value: number | string | null | undefined) => {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
};

const isExpired = (expiresAt?: string | null, now = new Date()) =>
  Boolean(expiresAt && new Date(expiresAt).getTime() <= now.getTime());

const getSignedAmount = (row: XootCredLedgerRow) => {
  const amount = toNumber(row.amount);
  if (row.direction === "debit") return -Math.abs(amount);
  if (row.direction === "credit") return Math.abs(amount);
  return amount;
};

const getMetaSource = (meta: Json | null | undefined) => {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return "";
  const source = meta.source;
  return typeof source === "string" ? source.toLowerCase() : "";
};

/**
 * The Care+ welcome credit: R30, granted once when the membership is activated, not
 * monthly. `activate-care-plus` inserts exactly one row and there is no recurring job —
 * the code was always one-time; only the naming said otherwise.
 *
 * This used to require the credit to expire in the *current calendar month*, which is
 * not the same thing as being live. `activate-care-plus` sets `expires_at` to
 * activation + 30 days, so for most of the year the credit straddles a month boundary:
 * activate on 20 August, expire on 19 September, and the member saw "R30" reported as
 * zero for the eleven days it was most usable. It is counted while it is live now.
 */
const isWelcomeCredit = (row: XootCredLedgerRow, entry: XootCredEntry) => {
  if (entry.displayAmount <= 0 || entry.isExpired || entry.isPending) return false;
  const source = getMetaSource(row.meta);
  return source.includes("care_plus") || source.includes("monthly") || row.reason === "loyalty_reward";
};

export const calculateXootCredSummary = (rows: XootCredLedgerRow[], now = new Date()): XootCredSummary => {
  const entries = rows
    .map((row, index): XootCredEntry => {
      const signedAmount = getSignedAmount(row);
      const status = row.status ?? "available";
      return {
        id: row.id ?? `${row.created_at}-${index}`,
        amount: signedAmount,
        displayAmount: Math.abs(signedAmount),
        direction: signedAmount < 0 ? "debit" : "credit",
        status,
        reason: row.reason,
        createdAt: row.created_at,
        expiresAt: row.expires_at ?? null,
        isExpired: isExpired(row.expires_at, now) || inactiveStatuses.has(status),
        isPending: pendingStatuses.has(status),
      };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const availableBalance = entries.reduce((sum, entry) => {
    if (entry.isExpired || entry.isPending) return sum;
    return sum + entry.amount;
  }, 0);

  const pendingBalance = entries.reduce((sum, entry) => {
    if (entry.isExpired || !entry.isPending || entry.amount <= 0) return sum;
    return sum + entry.amount;
  }, 0);

  const welcomeCredits = rows
    .map((row, index) => ({ row, entry: entries.find((entry) => entry.id === (row.id ?? `${row.created_at}-${index}`)) }))
    .filter((item): item is { row: XootCredLedgerRow; entry: XootCredEntry } => Boolean(item.entry))
    .filter(({ row, entry }) => isWelcomeCredit(row, entry));

  const welcomeCredit = welcomeCredits.reduce((sum, { entry }) => sum + entry.amount, 0);
  const welcomeCreditExpiresAt = welcomeCredits
    .map(({ entry }) => entry.expiresAt)
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0] ?? null;

  return {
    availableBalance: Math.max(0, Math.round(availableBalance * 100) / 100),
    pendingBalance: Math.max(0, Math.round(pendingBalance * 100) / 100),
    welcomeCredit: Math.max(0, Math.round(welcomeCredit * 100) / 100),
    welcomeCreditExpiresAt,
    entries,
  };
};

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
