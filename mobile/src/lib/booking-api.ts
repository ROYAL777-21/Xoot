import { readBookingQuoteResponse, type BookingQuoteResponse } from '@/generated/booking-flow';
import type { BookingQuoteInput } from '@/generated/booking-contract';
import { supabase } from '@/lib/supabase';

export type PublicXooter = {
  id: string;
  name: string;
  role: string;
  photo_url: string | null;
  suburb_coverage: string[];
  airbnb_specialist: boolean;
};

export async function requestBookingQuote(input: BookingQuoteInput): Promise<BookingQuoteResponse> {
  const { data, error } = await supabase.functions.invoke('get-booking-quote', { body: input });
  if (error) throw new Error('Your quote could not be loaded. Check your connection and try again.');
  if (!data || data.success !== true) throw new Error(typeof data?.error === 'string' ? data.error : 'Your quote could not be loaded. Please try again.');
  return readBookingQuoteResponse(data.data);
}

export async function loadPublicXooters(): Promise<PublicXooter[]> {
  const { data, error } = await supabase.functions.invoke('public-xooter-directory', { body: {} });
  if (error || !data || !Array.isArray(data.xooters)) throw new Error('The Xooter roster could not be loaded. Please try again.');
  const seen = new Set<string>();
  return data.xooters.filter((person: unknown): person is PublicXooter => {
    if (!person || typeof person !== 'object') return false;
    const row = person as Partial<PublicXooter>;
    if (typeof row.id !== 'string' || !row.id || typeof row.name !== 'string' || !row.name.trim() || seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  }).slice(0, 24).map((person: PublicXooter) => ({
    id: person.id, name: person.name.slice(0, 120),
    role: typeof person.role === 'string' ? person.role.slice(0, 120) : 'Xooter',
    photo_url: typeof person.photo_url === 'string' && /^https:\/\//i.test(person.photo_url) ? person.photo_url : null,
    suburb_coverage: Array.isArray(person.suburb_coverage) ? person.suburb_coverage.filter((value): value is string => typeof value === 'string').slice(0, 20).map(value => value.slice(0, 100)) : [],
    airbnb_specialist: person.airbnb_specialist === true,
  }));
}
