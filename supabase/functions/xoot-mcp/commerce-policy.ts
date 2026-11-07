import { basePrice, BOOKING_COVER_CENTS, BOOKING_FEE_CENTS, LADDERS } from "../_shared/pricing.ts";

export const BOOKING_TIMES = new Set([
  "07:00","07:30","08:00","08:30","09:00","09:30","10:00","10:30",
  "11:00","11:30","12:00","12:30","14:00","15:00","16:00","17:00",
]);
export const VALID_SERVICES = ["regular","express","office","airbnb","moving"] as const;
export type BookingService = typeof VALID_SERVICES[number];
export type BookingChoice = {
  saved_address_id: string; service_type: BookingService; hours: number;
  date: string; time: string; booking_cover_opt_in: boolean;
  idempotency_key: string;
};
export function parseChoice(a: Record<string,unknown>): BookingChoice | null {
  const service = a.service_type;
  if(typeof service !== "string" || !VALID_SERVICES.includes(service as BookingService)) return null;
  const hours = a.hours;
  if(typeof hours !== "number" || !Number.isFinite(hours) ||
    !basePrice(service,hours).ok) return null;
  const date = a.date, time = a.time, saved = a.saved_address_id, key = a.idempotency_key;
  if(typeof date!=="string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    typeof time!=="string" || !BOOKING_TIMES.has(time) ||
    typeof saved!=="string" || !/^[0-9a-f-]{36}$/i.test(saved) ||
    typeof key!=="string" || !/^[A-Za-z0-9_-]{16,80}$/.test(key) ||
    typeof a.booking_cover_opt_in !== "boolean") return null;
  // Explicitly prevent off-ladder, past or unbounded bookings.
  const moment = new Date(date+"T"+time+":00+02:00");
  if(!Number.isFinite(moment.getTime()) || moment.getTime() <= Date.now() + 60*60*1000 ||
    moment.getTime() > Date.now() + 90*24*60*60*1000) return null;
  return {saved_address_id:saved,service_type:service as BookingService,
    hours,date,time,booking_cover_opt_in:a.booking_cover_opt_in,idempotency_key:key};
}
/** Match create-booking's single-Xooter, no-add-on, one-time server breakdown exactly. */
export function quoteOneWorker(service: BookingService, hours: number, time:string,
  memberDiscountRate:number, coverOptIn:boolean) {
  const priced=basePrice(service,hours);
  if(!priced.ok) return null;
  const subtotal=Math.round(priced.baseCents / 100);
  const highDemandPremium=Number(time.slice(0,2))>=16 ?
    Math.round(Math.round(priced.baseCents * 0.15)/100) : 0;
  const serviceFee=memberDiscountRate>0 ? 0 : BOOKING_FEE_CENTS/100;
  const cover=coverOptIn ? BOOKING_COVER_CENTS/100 : 0;
  const discount=Math.round(subtotal*memberDiscountRate);
  const total=Math.max(50,subtotal+highDemandPremium+serviceFee+cover-discount);
  return {
    currency:"ZAR" as const,
    total_cents:total*100,
    base_cents:priced.baseCents,
    booking_fee_cents:serviceFee*100,
    cover_cents:cover*100,
    high_demand_cents:highDemandPremium*100,
    membership_discount_cents:discount*100,
    is_confirmed_booking:false,
    price_scope:"Single Xooter; one-time booking; no add-ons or applied credits",
  };
}
export const bookableHours=(service:BookingService)=>
  Object.keys(LADDERS[service].ladder).map(Number);
