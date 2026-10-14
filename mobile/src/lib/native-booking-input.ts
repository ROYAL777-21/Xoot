import { bookingCrewCap, bookingDateInSast, bookingHomeSize, bookingServiceForProperty, bookingServiceFromParam, bookingStartSlots, bookingWeekday, repeatDaysForNewDate, changeBookingService, createBookingInput } from '../generated/booking-flow';
import type { BookingPropertyType, BookingQuoteInput, BookingService } from '../generated/booking-contract';

export type NativeBookingParams = { service?: string | string[]; date?: string | string[]; area?: string | string[]; intent?: string | string[] };

// Approved home-size duration defaults; this is scheduling, never price calculation.
const REGULAR_HOME_HOURS = { small: 4, medium: 5.5, large: 8 } as const;

export function withBookingRooms(input: BookingQuoteInput, bedrooms: number, bathrooms: number): BookingQuoteInput {
  const homeSize = bookingHomeSize(bedrooms, bathrooms);
  return { ...input, homeSize, crewSize: Math.min(input.crewSize, bookingCrewCap(bookingServiceForProperty(input), homeSize)),
    hours: input.service === 'regular' ? REGULAR_HOME_HOURS[homeSize] : input.hours };
}

export function withNativeBookingService(input: BookingQuoteInput, service: BookingService): BookingQuoteInput {
  const next = changeBookingService(input, service);
  return { ...next, hours: service === 'regular' ? REGULAR_HOME_HOURS[next.homeSize] : next.hours };
}

export function validBookingDate(date: string, now = Date.now()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const time = Date.parse(`${date}T12:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === date &&
    date >= bookingDateInSast(now) && date <= bookingDateInSast(now, 365);
}

export function nativeBookingPrefill(params: NativeBookingParams, now = Date.now()) {
  let input = withBookingRooms(createBookingInput(bookingServiceFromParam(params.service), now), 2, 1);
  if (typeof params.date === 'string' && validBookingDate(params.date, now)) {
    const slots = bookingStartSlots({ ...input, date: params.date }, now);
    if (slots.length) input = { ...input, date: params.date, time: slots.includes('08:00') ? '08:00' : slots[0],
      repeatDays: input.frequency === 'once' ? [] : [bookingWeekday(params.date)] };
  }
  const area = typeof params.area === 'string' ? [...params.area].filter(char => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127).join('').trim().slice(0, 120) : '';
  return { input, area, assisted: params.intent === 'book_clean' || !!params.service || !!params.date || !!area };
}

export function withBookingDate(input: BookingQuoteInput, date: string, now = Date.now()): BookingQuoteInput {
  const valid = validBookingDate(date, now);
  const slots = valid ? bookingStartSlots({ ...input, date }, now) : [];
  return { ...input, date, time: slots.includes(input.time) ? input.time : slots[0] ?? '',
    repeatDays: valid ? repeatDaysForNewDate(input, date) : input.repeatDays };
}

export function withBookingProperty(input: BookingQuoteInput, propertyType: BookingPropertyType, now = Date.now()): BookingQuoteInput {
  const next = { ...input, propertyType };
  const service = bookingServiceForProperty(next);
  return withBookingDate({ ...next, addOns: [], linen: service === 'airbnb' ? 'none' : null,
    crewSize: Math.min(input.crewSize, bookingCrewCap(service, input.homeSize)) }, input.date, now);
}

export function nativeBookingIssue(input: BookingQuoteInput, address: string, now = Date.now()): string | null {
  if (address.trim().length < 5) return 'Enter your full address before reviewing your visit.';
  if (!validBookingDate(input.date, now)) return 'Choose a real date within the next year, using YYYY-MM-DD.';
  if (!bookingStartSlots(input, now).includes(input.time)) return 'Choose a future start time in South African time.';
  if (['flat', 'house', 'townhouse'].includes(input.propertyType) && !['regular', 'express'].includes(input.service)) return 'Choose regular or express cleaning for this home, or update the property type.';
  if (input.frequency !== 'once' && !input.repeatDays.includes(bookingWeekday(input.date))) return 'Include your first visit’s weekday in the repeat days.';
  if (bookingServiceForProperty(input) === 'airbnb' && input.linen === 'wash_dry_repack' && (input.service !== 'airbnb' || input.hours < 5)) return 'Choose Airbnb cleaning with at least 5 hours to wash, dry and repack linen.';
  if (input.referralCode && !/^[A-Z0-9_-]{4,32}$/.test(input.referralCode.trim().toUpperCase())) return 'Use a referral code of 4–32 letters, numbers, dashes or underscores.';
  return null;
}
