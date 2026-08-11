import { BOOST_BPS, applyBoost, boostIsActive, boostValueFor, formatRate } from "./xooter-commission";

/**
 * Deciding when to celebrate a boost, and what the card is allowed to say.
 *
 * Kept out of the component for two reasons. The arithmetic in the copy is a claim about someone's
 * pay and belongs somewhere testable; and "have we already shown this" is state, which is the part
 * of a celebration that goes wrong — a card that reappears on every render stops reading as a
 * reward and starts reading as a bug.
 */

export type XooterBoost = {
  id: string;
  bps: number;
  startsAt: string;
  endsAt: string;
  reason?: string | null;
};

const SEEN_KEY = "xoot.xooter.boost.celebrated";

/** Whole days left, rounded up — a boost with two hours to run still reads as "1 day left". */
export function daysRemaining(boost: XooterBoost, now: Date = new Date()): number {
  const ms = new Date(boost.endsAt).getTime() - now.getTime();
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.ceil(ms / 86400000);
}

/**
 * The boost to celebrate right now, or null.
 *
 * Active, and not already celebrated. Returning null rather than a flag keeps the component from
 * having to ask two questions in the right order.
 */
export function boostToCelebrate(
  boosts: XooterBoost[] | null | undefined,
  now: Date = new Date(),
): XooterBoost | null {
  if (!boosts?.length) return null;
  const seen = readSeen();
  const live = boosts
    .filter((b) => boostIsActive(b, now) && !seen.includes(b.id))
    // Best boost first, so a Xooter holding two is told about the one that pays.
    .sort((a, b) => b.bps - a.bps);
  return live[0] ?? null;
}

function readSeen(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    // A celebration is not worth breaking a screen over. Unreadable storage means "not yet seen",
    // which shows the card again at worst — the failure that annoys rather than the one that hides
    // a reward the Xooter was told about.
    return [];
  }
}

/** Mark a boost celebrated. Idempotent, and capped so the key cannot grow without bound. */
export function markCelebrated(boostId: string): void {
  if (typeof window === "undefined" || !boostId) return;
  try {
    const seen = readSeen();
    if (seen.includes(boostId)) return;
    window.localStorage.setItem(SEEN_KEY, JSON.stringify([...seen, boostId].slice(-50)));
  } catch {
    /* storage unavailable; the card reappearing is the acceptable failure */
  }
}

export type BoostCopy = {
  headline: string;
  /** The exactly-true claim. Percentage points of the job, not percent of earnings. */
  keepLine: string;
  windowLine: string;
  rateLine: string;
  /** Only rendered when a real job value is known — otherwise we would be inventing an amount. */
  exampleLine: string | null;
};

/**
 * The words on the card.
 *
 * ⚠️ THE CLAIM HAS TO BE THE TRUE ONE. Going 35% → 30% is five percentage points of the job, which
 * is a **7.7%** rise in what the Xooter earns. "Your earnings are up 5%" understates it; "you keep
 * 5% more of every job" is exact. The understated version is not harmless — a Xooter who checks
 * their payout and finds a bigger number than promised learns the numbers here are approximate,
 * which is the last thing a pay surface should teach.
 *
 * `exampleLine` is null unless a caller supplies a real subtotal, because the alternative is
 * quoting a "typical job" nobody agreed to.
 */
export function boostCopy(
  boost: XooterBoost,
  currentRateBps: number,
  exampleSubtotalCents?: number,
  now: Date = new Date(),
): BoostCopy {
  const boosted = applyBoost(currentRateBps, boost.bps);
  const points = (currentRateBps - boosted) / 100;
  const days = daysRemaining(boost, now);

  const example =
    typeof exampleSubtotalCents === "number" && exampleSubtotalCents > 0
      ? boostValueFor(exampleSubtotalCents, currentRateBps, boost.bps)
      : null;

  return {
    headline: "Nice work — you've earned a boost",
    keepLine: `You keep ${points}% more of every job.`,
    windowLine: days === 1 ? "For 1 more day." : `For the next ${days} days.`,
    rateLine: `${formatRate(currentRateBps)} → ${formatRate(boosted)}`,
    exampleLine: example
      ? `On a ${formatRand(exampleSubtotalCents!)} job that's ${formatRand(example.extraCents)} more in your pocket.`
      : null,
  };
}

const formatRand = (cents: number) => `R${Math.round(cents / 100)}`;

/** Re-exported so a caller never has to reach past this module for the standard award. */
export { BOOST_BPS };
