/**
 * Native Notifications handoff contract. These are account-owned records,
 * not proof of push, email, WhatsApp delivery or booking/settlement actions.
 * Keep PostgreSQL's microsecond timestamps intact for exact keyset pagination.
 */
export const NATIVE_NOTIFICATION_PAGE_SIZE = 40;
export type NativeNotification = {
  id: string; user_id: string; kind: string; title: string; body: string;
  link: string | null; read: boolean; created_at: string;
};
export type NativeNotificationCursor = Pick<NativeNotification, 'created_at' | 'id'>;
export type NativeNotificationPage = { items: NativeNotification[]; hasMore: boolean };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const instant = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.(\d{1,6}))?(?:Z|[+-]\d{2}:\d{2})$/;
export function notificationMicros(value: string): bigint | null {
  const parts = instant.exec(value);
  if (!parts) return null;
  const millis = Date.parse(value);
  if (!Number.isFinite(millis)) return null;
  const fractional = (parts[1] || '').padEnd(6, '0');
  return BigInt(millis) * 1000n + BigInt(fractional.slice(3) || '0');
}
export function olderNativeNotificationFilter(cursor: NativeNotificationCursor): string | null {
  if (!uuid.test(cursor.id) || notificationMicros(cursor.created_at) === null) return null;
  // A UUID can never inject a PostgREST filter; the timestamp regex only admits
  // ISO date-time and zone syntax. Preserve DB precision, including microseconds.
  return `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`;
}
const record = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);
export function parseNativeNotificationPage(
  data: unknown,
  options: { owner: string; snapshot: string; cursor?: NativeNotificationCursor },
): NativeNotification[] | null {
  if (!Array.isArray(data) || data.length > NATIVE_NOTIFICATION_PAGE_SIZE + 1 ||
    !uuid.test(options.owner) || notificationMicros(options.snapshot) === null) return null;
  const latest = notificationMicros(options.snapshot)!;
  let previous: NativeNotificationCursor | undefined = options.cursor;
  if (previous && olderNativeNotificationFilter(previous) === null) return null;
  const ids = new Set<string>();
  const items: NativeNotification[] = [];
  for (const row of data) {
    if (!record(row) || !uuid.test(String(row.id)) || row.user_id !== options.owner ||
      typeof row.kind !== 'string' || row.kind.length > 100 ||
      typeof row.title !== 'string' || row.title.length > 300 ||
      typeof row.body !== 'string' || row.body.length > 12000 ||
      !(row.link === null || typeof row.link === 'string' && row.link.length <= 2048) ||
      typeof row.read !== 'boolean' || typeof row.created_at !== 'string') return null;
    const timestamp = notificationMicros(row.created_at);
    if (timestamp === null || timestamp > latest || ids.has(String(row.id).toLowerCase())) return null;
    if (previous) {
      const earlier = notificationMicros(previous.created_at);
      if (earlier === null || timestamp > earlier ||
        (timestamp === earlier && String(row.id).toLowerCase() >= previous.id.toLowerCase())) return null;
    }
    ids.add(String(row.id).toLowerCase());
    const item = row as NativeNotification;
    items.push(item);
    previous = item;
  }
  return items;
}
export function validateNativeNotificationHistory(
  pages: readonly NativeNotificationPage[],
): boolean {
  const seen = new Set<string>();
  let previous: NativeNotificationCursor | undefined;
  for (const page of pages) {
    if (page.items.length > NATIVE_NOTIFICATION_PAGE_SIZE) return false;
    for (const item of page.items) {
      const key = item.id.toLowerCase();
      if (seen.has(key)) return false;
      const current = notificationMicros(item.created_at);
      const last = previous ? notificationMicros(previous.created_at) : null;
      if (current === null || (last !== null && (current > last ||
        (current === last && key >= previous!.id.toLowerCase())))) return false;
      seen.add(key);
      previous = item;
    }
  }
  return true;
}
