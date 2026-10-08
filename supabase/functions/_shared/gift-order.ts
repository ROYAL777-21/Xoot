import { basePrice, BOOKING_FEE_CENTS, type ServiceId } from "./pricing.ts";

export const GIFT_PRICING_VERSION = "gift-zd037-v1";
// The original gift handoff uses the service's default/medium duration and includes every booking fee.
export const GIFT_HOURS: Record<ServiceId, number> = {
  regular: 5.5,
  airbnb: 4,
  express: 1,
  office: 5,
  moving: 8,
};
export const GIFT_COUNTS = [1, 3, 4, 6, 12] as const;
export const GIFT_TINTS = [
  "blush",
  "lilac",
  "mist",
  "petal",
  "moss",
  "sage",
  "honey",
] as const;
export type GiftTint = (typeof GIFT_TINTS)[number];
export type GiftQuote = {
  version: string;
  currency: "ZAR";
  service: ServiceId;
  count: number;
  hours: number;
  basePerVisitCents: number;
  feePerVisitCents: number;
  perVisitCents: number;
  totalCents: number;
};
export type GiftDraft = {
  service: ServiceId;
  count: number;
  tint: GiftTint;
  delivery: "email" | "link";
  recipientName: string;
  recipientEmail: string;
  senderName: string;
  note: string;
  occasion: string;
};

export function quoteGift(service: unknown, count: unknown): GiftQuote {
  if (
    typeof service !== "string" ||
    !Object.prototype.hasOwnProperty.call(GIFT_HOURS, service)
  )
    throw new Error("Choose an available gift service.");
  if (
    typeof count !== "number" ||
    !GIFT_COUNTS.some((value) => value === count)
  )
    throw new Error("Choose an available visit bundle.");
  const id = service as ServiceId;
  const hours = GIFT_HOURS[id];
  const base = basePrice(id, hours);
  if (!base.ok) throw new Error("This gift cannot be priced.");
  const perVisitCents = base.baseCents + BOOKING_FEE_CENTS;
  return {
    version: GIFT_PRICING_VERSION,
    currency: "ZAR",
    service: id,
    count,
    hours,
    basePerVisitCents: base.baseCents,
    feePerVisitCents: BOOKING_FEE_CENTS,
    perVisitCents,
    totalCents: perVisitCents * count,
  };
}

function text(value: unknown, maximum: number): string {
  if (
    typeof value !== "string" ||
    value.length > maximum ||
    [...value].some((char) => char.charCodeAt(0) < 32 && char !== "\n")
  )
    throw new Error("Check the gift details and try again.");
  return value.trim();
}

export function validateGiftDraft(value: Record<string, unknown>): GiftDraft {
  const quote = quoteGift(value.service, value.count);
  if (!GIFT_TINTS.some((tint) => tint === value.tint))
    throw new Error("Choose a gift card colour.");
  if (value.delivery !== "email" && value.delivery !== "link")
    throw new Error("Choose a delivery method.");
  const recipientName = text(value.recipientName, 120);
  const recipientEmail = text(value.recipientEmail, 254).toLowerCase();
  const senderName = text(value.senderName, 120);
  if (!senderName) throw new Error("Add your name to the card.");
  if (
    value.delivery === "email" &&
    (!recipientName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail))
  )
    throw new Error("Add the recipient’s name and a valid email address.");
  return {
    service: quote.service,
    count: quote.count,
    tint: value.tint as GiftTint,
    delivery: value.delivery,
    recipientName: value.delivery === "email" ? recipientName : "",
    recipientEmail: value.delivery === "email" ? recipientEmail : "",
    senderName,
    note: text(value.note, 90),
    occasion: text(value.occasion, 120),
  };
}

export function isGiftRequestKey(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}
