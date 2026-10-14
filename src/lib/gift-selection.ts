import { isPriced, quote, type ServiceId } from "./xoot-pricing";

export const giftServices = [
  { key: "regular", serviceType: "residential", label: "Regular cleaning", hours: 5.5 },
  { key: "airbnb", serviceType: "airbnb", label: "Airbnb cleaning", hours: 4 },
  { key: "express", serviceType: "express", label: "Express cleaning", hours: 1 },
  { key: "office", serviceType: "office", label: "Office cleaning", hours: 5 },
] as const;

/** 52 weekly visits represent one year; smaller bundles are not annual plans. */
export const ANNUAL_WEEKLY_VISITS = 52;
export const giftBundles = [
  { count: 1, label: "One clean", detail: "One visit, when it suits them" },
  { count: 4, label: "Four weekly cleans", detail: "Four visits · about one month weekly" },
  { count: 12, label: "Twelve weekly cleans", detail: "Twelve visits · about three months weekly" },
] as const;

/** The in-app source has additional selectable quantities; keep them honest too. */
export const giftAppBundles = [
  { count: 1, label: "One clean", note: "One visit, when it suits them" },
  { count: 3, label: "Three cleans", note: "Three weekly visits" },
  { count: 6, label: "Six cleans", note: "Six weekly visits" },
  { count: 12, label: "Twelve cleans", note: "Twelve weeks at once a week" },
] as const;

export const giftOccasions = [
  { label: "Mother's Day", tint: "petal", title: "Happy Mother's Day", note: "You have cleaned up after all of us for long enough.", hint: "A little time for herself. Choose the visits and make the card your own." },
  { label: "A new baby", tint: "mist", title: "Congratulations", note: "One less thing. Sleep instead.", hint: "The practical present: help with the home while they find their new rhythm." },
  { label: "Moving in", tint: "honey", title: "Welcome home", note: "Start in a place that is already clean.", hint: "For the first quiet moment in a new home." },
  { label: "Just because", tint: "sage", title: "No occasion", note: "Go and sit down. It is handled.", hint: "No big occasion needed. A personal note makes the gift their own." },
] as const;

export type GiftSelection = { service: (typeof giftServices)[number]["key"]; count: number; occasion: number };

export function readGiftSelection(params: URLSearchParams): GiftSelection {
  const service = giftServices.find((item) => item.key === params.get("service"))?.key ?? "regular";
  const count = Number(params.get("visits"));
  const occasion = Number(params.get("occasion"));
  return { service, count: giftBundles.some((bundle) => bundle.count === count) ? count : 4, occasion: Number.isInteger(occasion) && occasion >= 0 && occasion < giftOccasions.length ? occasion : 0 };
}

/** An indicative clean value; the gift order must be quoted and accepted by the server. */
export function estimateGift(selection: GiftSelection) {
  const service = giftServices.find((item) => item.key === selection.service) ?? giftServices[0];
  const priced = quote({ service: service.key as ServiceId, hours: service.hours, bookingCover: false });
  return { service, perVisitCents: isPriced(priced) ? priced.totalCents : null, totalCents: isPriced(priced) ? priced.totalCents * selection.count : null };
}

export function giftSetupPath(selection: GiftSelection) {
  return `/gifts?${new URLSearchParams({ service: selection.service, visits: String(selection.count), occasion: String(selection.occasion) })}`;
}
