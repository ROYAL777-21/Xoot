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
