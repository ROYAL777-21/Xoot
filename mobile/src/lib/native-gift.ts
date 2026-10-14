/** Native Gift.jsx handoff vocabulary. Presentation only; the server owns prices. */
export const ANNUAL_WEEKLY_CLEANS = 52;
export const GIFT_SERVICES = [
  { key: 'regular', label: 'Regular cleaning' },
  { key: 'airbnb', label: 'Airbnb cleaning' },
  { key: 'express', label: 'Express cleaning' },
  { key: 'office', label: 'Office cleaning' },
  { key: 'moving', label: 'Moving clean' },
] as const;
export type NativeGiftService = typeof GIFT_SERVICES[number]['key'];
export const GIFT_BUNDLES = [
  { count: 1, label: 'One clean', detail: 'A weekend back' },
  { count: 3, label: 'Three cleans', detail: 'About three weeks if used weekly' },
  { count: 4, label: 'Four cleans', detail: 'About one month if used weekly' },
  { count: 6, label: 'Six cleans', detail: 'About six weeks if used weekly' },
  { count: 12, label: 'Twelve cleans', detail: 'About three months if used weekly' },
] as const;
export const GIFT_TINTS = ['blush', 'lilac', 'mist', 'petal', 'moss', 'sage', 'honey'] as const;
export type NativeGiftTint = typeof GIFT_TINTS[number];
export const GIFT_NOTES = [
  { label: 'Just because', text: 'Thought you could use a break.' },
  { label: 'Thank you', text: 'For everything you did. Take the day off.' },
  { label: 'New home', text: 'Welcome home. Let someone else do the first clean.' },
  { label: 'New baby', text: 'One less thing to think about.' },
  { label: 'Birthday', text: 'Spend the day not cleaning. Happy birthday!' },
] as const;
export type NativeGiftDelivery = 'email' | 'link';
export type NativeGiftDefinition = {
  service: NativeGiftService; count: number; tint: NativeGiftTint;
  delivery: NativeGiftDelivery; recipientName: string; recipientEmail: string;
  senderName: string; note: string; occasion: string;
};
export type NativeGiftQuote = {
  version: string; currency: 'ZAR'; service: NativeGiftService; count: number;
  hours: number; basePerVisitCents: number; feePerVisitCents: number;
  perVisitCents: number; totalCents: number;
};
export const newGiftDraft = (senderName = ''): NativeGiftDefinition => ({
  service: 'regular', count: 3, tint: 'blush', delivery: 'email',
  recipientName: '', recipientEmail: '', senderName, note: '', occasion: '',
});
const cents = (value: unknown) => Number.isSafeInteger(value) && (value as number) >= 0;
export function parseNativeGiftQuote(value: unknown, service: NativeGiftService, count: number): NativeGiftQuote | null {
  if (!value || typeof value !== 'object') return null;
  const response = value as { quote?: unknown };
  if (!response.quote || typeof response.quote !== 'object') return null;
  const quote = response.quote as Partial<NativeGiftQuote>;
  if (quote.currency !== 'ZAR' || quote.service !== service || quote.count !== count ||
    typeof quote.version !== 'string' || !quote.version ||
    typeof quote.hours !== 'number' || !Number.isFinite(quote.hours) || quote.hours <= 0 ||
    !cents(quote.basePerVisitCents) || !cents(quote.feePerVisitCents) ||
    !cents(quote.perVisitCents) || !cents(quote.totalCents) ||
    quote.perVisitCents !== quote.basePerVisitCents! + quote.feePerVisitCents! ||
    quote.totalCents !== quote.perVisitCents! * count) return null;
  return quote as NativeGiftQuote;
}
export function nativeGiftIssue(draft: NativeGiftDefinition): string | null {
  if (!GIFT_SERVICES.some(s => s.key === draft.service) || !GIFT_BUNDLES.some(b => b.count === draft.count) ||
    !GIFT_TINTS.includes(draft.tint) || !['email', 'link'].includes(draft.delivery)) return 'Choose an available gift.';
  const validText = (s: string, limit: number) => s.length <= limit && [...s].every(char => {
    const code = char.charCodeAt(0);
    return code === 10 || (code >= 32 && code !== 127);
  });
  if (!validText(draft.senderName, 120) || !draft.senderName.trim()) return 'Add your name to the gift.';
  if (!validText(draft.note, 90) || !validText(draft.occasion, 120)) return 'Shorten your note or occasion.';
  if (draft.delivery === 'email') {
    if (!draft.recipientName.trim() || !validText(draft.recipientName, 120)) return 'Add the recipient’s name.';
    if (!validText(draft.recipientEmail, 254) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.recipientEmail.trim())) return 'Add a valid recipient email.';
  }
  return null;
}
export const giftMoney = (amountCents: number) => new Intl.NumberFormat('en-ZA', {
  style: 'currency', currency: 'ZAR', minimumFractionDigits: 2,
}).format(amountCents / 100);
