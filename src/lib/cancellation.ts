// Cancellation fee rules — hybrid (distance + time-to-booking + status)
// Applied when the USER cancels a confirmed booking.
// Returns a percentage of total price to charge.

export type CancellationContext = {
  scheduledAt: string | Date;
  status: string;
  zooterDistanceMi?: number; // if zooter has not started moving yet
};

export function calculateCancellationFeePct(ctx: CancellationContext): number {
  const scheduled = new Date(ctx.scheduledAt).getTime();
  const now = Date.now();
  const hoursTo = (scheduled - now) / 36e5;

  // En route or in progress = 50%
  if (ctx.status === "enroute" || ctx.status === "in_progress") return 50;

  // Confirmed / pending: combine distance and time
  let pct = 10; // base
  if (hoursTo < 2) pct = 50;
  else if (hoursTo < 24) pct = 25;

  // Bump if zooter is very close (already preparing)
  const d = ctx.zooterDistanceMi ?? 5;
  if (d < 2 && pct < 40) pct = Math.max(pct, 40);
  else if (d < 5 && pct < 25) pct = Math.max(pct, 25);

  return Math.min(pct, 50);
}

export function calculateCancellationFee(price: number, ctx: CancellationContext): number {
  const pct = calculateCancellationFeePct(ctx);
  return Math.round((price * pct) / 100);
}

export function describeFee(pct: number): string {
  if (pct >= 50) return "Your Xooter is already on the way or working — full inconvenience fee applies.";
  if (pct >= 40) return "Your Xooter is very close and has prepared for the visit.";
  if (pct >= 25) return "Less than 24 hours notice — partial fee applies.";
  return "Thanks for the early notice — minimum fee applies.";
}
