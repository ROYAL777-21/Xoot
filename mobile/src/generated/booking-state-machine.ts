// GENERATED FILE — DO NOT EDIT.
// Copied from src/lib/booking-state-machine.ts by scripts/build/sync-shared-native.mjs.
// Edit the source and run `npm run shared:sync`.

export type BookingStatus =
  | "draft"
  | "pending_payment"
  | "payment_confirmed"
  | "awaiting_assignment"
  | "assigned"
  | "contractor_accepted"
  | "en_route"
  | "in_progress"
  | "completed"
  | "rated"
  | "cancelled"
  | "replacement_required"
  | "replacement_offered"
  | "reassigned";

export const BOOKING_STATUS_VALUES: BookingStatus[] = [
  "draft",
  "pending_payment",
  "payment_confirmed",
  "awaiting_assignment",
  "assigned",
  "contractor_accepted",
  "en_route",
  "in_progress",
  "completed",
  "rated",
  "cancelled",
  "replacement_required",
  "replacement_offered",
  "reassigned",
];

const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  draft: ["pending_payment", "payment_confirmed", "cancelled"],
  pending_payment: ["payment_confirmed", "cancelled"],
  payment_confirmed: ["awaiting_assignment", "cancelled"],
  awaiting_assignment: ["assigned", "cancelled"],
  assigned: ["contractor_accepted", "replacement_required", "cancelled"],
  contractor_accepted: ["en_route", "replacement_required", "cancelled"],
  en_route: ["in_progress", "replacement_required"],
  in_progress: ["completed"],
  completed: ["rated"],
  rated: [],
  cancelled: [],
  replacement_required: ["replacement_offered", "cancelled"],
  replacement_offered: ["assigned", "cancelled"],
  reassigned: ["contractor_accepted", "replacement_required", "cancelled"],
};

const legacyStatusAliases: Record<string, BookingStatus> = {
  pending: "pending_payment",
  confirmed: "contractor_accepted",
  enroute: "en_route",
  arrived: "in_progress",
};

export function normaliseBookingStatus(status: unknown): BookingStatus | null {
  if (typeof status !== "string") return null;
  const normalized = status.trim();
  if (BOOKING_STATUS_VALUES.includes(normalized as BookingStatus)) return normalized as BookingStatus;
  return legacyStatusAliases[normalized] ?? null;
}

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: BookingStatus, to: BookingStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid booking transition: ${from} -> ${to}`);
  }
}

export function getClientVisibleStatus(status: BookingStatus): string {
  const labels: Record<BookingStatus, string> = {
    draft: "Setting up your booking",
    pending_payment: "Payment required",
    payment_confirmed: "Payment received",
    awaiting_assignment: "Finding your Xooter",
    assigned: "Xooter assigned",
    contractor_accepted: "Xooter confirmed",
    en_route: "Your Xooter is on the way",
    in_progress: "Clean in progress",
    completed: "Clean complete",
    rated: "Thank you for your review",
    cancelled: "Booking cancelled",
    replacement_required: "Finding a replacement Xooter",
    replacement_offered: "Replacement Xooter found",
    reassigned: "New Xooter assigned",
  };
  return labels[status] ?? status;
}
