// GENERATED FILE — DO NOT EDIT.
// Copied from src/lib/xootcred-core.ts by scripts/build/sync-shared-native.mjs.
// Edit the source and run `npm run shared:sync`.

export type XootCredLedgerRow<TMeta = unknown> = {
  id?: string;
  amount: number | string;
  direction?: "credit" | "debit" | string | null;
  status?:
    | "pending"
    | "available"
    | "redeemed"
    | "expired"
    | "cancelled"
    | string
    | null;
  reason: string;
  meta?: TMeta | null;
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

const getMetaSource = (meta: unknown) => {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return "";
  const source = (meta as { source?: unknown }).source;
  return typeof source === "string" ? source.toLowerCase() : "";
};

const isWelcomeCredit = (row: XootCredLedgerRow, entry: XootCredEntry) => {
  if (entry.displayAmount <= 0 || entry.isExpired || entry.isPending)
    return false;
  const source = getMetaSource(row.meta);
  return (
    source.includes("care_plus") ||
    source.includes("monthly") ||
    row.reason === "loyalty_reward"
  );
};

export const calculateXootCredSummary = <TMeta>(
  rows: XootCredLedgerRow<TMeta>[],
  now = new Date(),
): XootCredSummary => {
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
        isExpired:
          isExpired(row.expires_at, now) || inactiveStatuses.has(status),
        isPending: pendingStatuses.has(status),
      };
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  const availableBalance = entries.reduce((sum, entry) => {
    if (entry.isExpired || entry.isPending) return sum;
    return sum + entry.amount;
  }, 0);
  const pendingBalance = entries.reduce((sum, entry) => {
    if (entry.isExpired || !entry.isPending || entry.amount <= 0) return sum;
    return sum + entry.amount;
  }, 0);
  const welcomeCredits = rows
    .map((row, index) => ({
      row,
      entry: entries.find(
        (entry) => entry.id === (row.id ?? `${row.created_at}-${index}`),
      ),
    }))
    .filter(
      (item): item is { row: XootCredLedgerRow<TMeta>; entry: XootCredEntry } =>
        Boolean(item.entry),
    )
    .filter(({ row, entry }) => isWelcomeCredit(row, entry));
  const welcomeCredit = welcomeCredits.reduce(
    (sum, { entry }) => sum + entry.amount,
    0,
  );
  const welcomeCreditExpiresAt =
    welcomeCredits
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
