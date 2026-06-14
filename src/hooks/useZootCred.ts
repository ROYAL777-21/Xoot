import { useCallback, useEffect, useState } from "react";
import type { Json } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ZootCredLedgerRow = {
  id?: string;
  amount: number | string;
  direction?: "credit" | "debit" | string | null;
  status?: "pending" | "available" | "redeemed" | "expired" | "cancelled" | string | null;
  reason: string;
  meta?: Json | null;
  created_at: string;
  expires_at?: string | null;
};

export type ZootCredEntry = {
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

export type ZootCredSummary = {
  availableBalance: number;
  pendingBalance: number;
  monthlyCredit: number;
  monthlyCreditExpiresAt: string | null;
  entries: ZootCredEntry[];
};

const inactiveStatuses = new Set(["expired", "cancelled"]);
const pendingStatuses = new Set(["pending"]);

const toNumber = (value: number | string | null | undefined) => {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
};

const isExpired = (expiresAt?: string | null, now = new Date()) =>
  Boolean(expiresAt && new Date(expiresAt).getTime() <= now.getTime());

const getSignedAmount = (row: ZootCredLedgerRow) => {
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

const expiresThisMonth = (expiresAt: string | null, now = new Date()) => {
  if (!expiresAt) return false;
  const expires = new Date(expiresAt);
  return expires.getFullYear() === now.getFullYear() && expires.getMonth() === now.getMonth();
};

const isMonthlyCredit = (row: ZootCredLedgerRow, entry: ZootCredEntry, now = new Date()) => {
  if (entry.displayAmount <= 0 || entry.isExpired || entry.isPending || !expiresThisMonth(entry.expiresAt, now)) return false;
  const source = getMetaSource(row.meta);
  return source.includes("care_plus") || source.includes("monthly") || row.reason === "loyalty_reward";
};

export const calculateZootCredSummary = (rows: ZootCredLedgerRow[], now = new Date()): ZootCredSummary => {
  const entries = rows
    .map((row, index): ZootCredEntry => {
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

  const monthlyCredits = rows
    .map((row, index) => ({ row, entry: entries.find((entry) => entry.id === (row.id ?? `${row.created_at}-${index}`)) }))
    .filter((item): item is { row: ZootCredLedgerRow; entry: ZootCredEntry } => Boolean(item.entry))
    .filter(({ row, entry }) => isMonthlyCredit(row, entry, now));

  const monthlyCredit = monthlyCredits.reduce((sum, { entry }) => sum + entry.amount, 0);
  const monthlyCreditExpiresAt = monthlyCredits
    .map(({ entry }) => entry.expiresAt)
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0] ?? null;

  return {
    availableBalance: Math.max(0, Math.round(availableBalance * 100) / 100),
    pendingBalance: Math.max(0, Math.round(pendingBalance * 100) / 100),
    monthlyCredit: Math.max(0, Math.round(monthlyCredit * 100) / 100),
    monthlyCreditExpiresAt,
    entries,
  };
};

const emptySummary: ZootCredSummary = {
  availableBalance: 0,
  pendingBalance: 0,
  monthlyCredit: 0,
  monthlyCreditExpiresAt: null,
  entries: [],
};

export const useZootCred = () => {
  const { user, loading: authLoading } = useAuth();
  const [summary, setSummary] = useState<ZootCredSummary>(emptySummary);
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
    const { data, error: ledgerError } = await (supabase as any)
      .from("zootcred_ledger")
      .select("id,amount,direction,status,reason,meta,created_at,expires_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (ledgerError) {
      setSummary(emptySummary);
      setError(ledgerError.message);
      setLoading(false);
      return;
    }

    setSummary(calculateZootCredSummary((data ?? []) as ZootCredLedgerRow[]));
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
