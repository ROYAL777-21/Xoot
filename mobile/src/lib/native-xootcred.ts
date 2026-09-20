export type NativeXootCredLedgerRow = {
  id?: string;
  amount: number | string;
  direction?: string | null;
  status?: string | null;
  reason: string;
  created_at: string;
  expires_at?: string | null;
};

export type NativeXootCredEntry = {
  id: string;
  amount: number;
  direction: 'credit' | 'debit';
  reason: string;
  createdAt: string;
  status: string;
  isExpired: boolean;
  isPending: boolean;
};

export function calculateNativeXootCredSummary(rows: NativeXootCredLedgerRow[], now = new Date()) {
  const entries = rows.map((row, index): NativeXootCredEntry => {
    const raw = Number(row.amount);
    const value = Number.isFinite(raw) ? raw : 0;
    const amount = row.direction === 'debit' ? -Math.abs(value) : row.direction === 'credit' ? Math.abs(value) : value;
    const status = row.status ?? 'available';
    const expires = row.expires_at ? new Date(row.expires_at).getTime() : Number.POSITIVE_INFINITY;
    return {
      id: row.id ?? `${row.created_at}-${index}`,
      amount,
      direction: amount < 0 ? 'debit' : 'credit',
      reason: row.reason,
      createdAt: row.created_at,
      status,
      isExpired: expires <= now.getTime() || status === 'expired' || status === 'cancelled',
      isPending: status === 'pending',
    };
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const availableBalance = entries.reduce((sum, entry) => entry.isExpired || entry.isPending ? sum : sum + entry.amount, 0);
  const pendingBalance = entries.reduce((sum, entry) => entry.isExpired || !entry.isPending || entry.amount <= 0 ? sum : sum + entry.amount, 0);
  return {
    availableBalance: Math.max(0, Math.round(availableBalance * 100) / 100),
    pendingBalance: Math.max(0, Math.round(pendingBalance * 100) / 100),
    entries,
  };
}

export function xootCredReasonLabel(reason: string) {
  const labels: Record<string, string> = {
    loyalty_reward: 'Reward credit', referral: 'Referral credit', redemption: 'Used on a booking',
    booking_redemption: 'Used on a booking', care_plus_activation: 'Care+ welcome credit', refund: 'Booking credit',
  };
  return labels[reason] ?? reason.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
