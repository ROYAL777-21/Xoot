export type NativeSearchEntry = {
  id: string;
  group: 'Your details' | 'Settings' | 'Care+' | 'Help & policies';
  icon: 'circle-user' | 'home' | 'list' | 'bell' | 'sparkles' | 'heart' | 'shield' | 'lock' | 'message';
  title: string;
  detail: string;
  keywords: string;
  href?: string;
  websitePath?: string;
};

export const searchableServices = [
  { key: 'regular', title: 'Regular cleaning', detail: 'A clean for your home', keywords: 'regular residential deep premium home house flat apartment', icon: 'home' },
  { key: 'airbnb', title: 'Airbnb cleaning', detail: 'Ready for the next guest', keywords: 'airbnb turnover guest short let', icon: 'home' },
  { key: 'express', title: 'Express cleaning', detail: 'A focused reset', keywords: 'express quick small reset', icon: 'sparkles' },
  { key: 'office', title: 'Office cleaning', detail: 'Care for your workspace', keywords: 'office workplace business commercial', icon: 'briefcase' },
  { key: 'moving', title: 'Moving clean', detail: 'For a move in or a move out', keywords: 'moving move end tenancy', icon: 'home' },
] as const;

export function buildNativeSearchIndex(profile?: { full_name?: string | null; address?: string | null } | null, email?: string): NativeSearchEntry[] {
  const entries: NativeSearchEntry[] = [
    { id: 'profile', group: 'Your details', icon: 'circle-user', title: profile?.full_name || 'Your profile', detail: email || 'Name, email and account details', keywords: 'name email phone mobile account personal details', href: '/account' },
    { id: 'visits', group: 'Your details', icon: 'list', title: 'Your visits', detail: 'Upcoming and past bookings', keywords: 'booking visit history arrival date time', href: '/bookings' },
    { id: 'notifications', group: 'Settings', icon: 'bell', title: 'Notifications', detail: 'Your Xoot updates', keywords: 'notifications messages reminder push alert', href: '/notifications' },
    { id: 'concierge', group: 'Settings', icon: 'sparkles', title: 'Xoot Concierge', detail: 'Ask about your home and visits', keywords: 'concierge assistant help ask question', href: '/concierge' },
    { id: 'careplus', group: 'Care+', icon: 'heart', title: 'Care+ membership', detail: 'Your membership and home care', keywords: 'care careplus subscription membership plan', href: '/care-plus' },
    { id: 'terms', group: 'Help & policies', icon: 'shield', title: 'Terms & conditions', detail: 'The full agreement', keywords: 'terms conditions agreement contract legal tc', websitePath: '/legal/terms' },
    { id: 'privacy', group: 'Help & policies', icon: 'lock', title: 'Privacy & your data', detail: 'What we store, and for how long', keywords: 'privacy data popia access gate code alarm security', websitePath: '/legal/privacy' },
    { id: 'refunds', group: 'Help & policies', icon: 'list', title: 'Cancellations & refunds', detail: 'The booking and refund policy', keywords: 'cancel refund money back charge dispute fee', websitePath: '/legal/refunds-cancellations' },
  ];
  if (profile?.address) entries.splice(1, 0, { id: 'home', group: 'Your details', icon: 'home', title: profile.address,
    detail: 'Your saved home', keywords: 'address home place suburb', href: '/account' });
  return entries;
}

export function matchesNativeSearch(query: string, ...values: Array<string | null | undefined>): boolean {
  const words = query.trim().toLocaleLowerCase('en-ZA').split(/\s+/).filter(Boolean);
  const haystack = values.filter(Boolean).join(' ').toLocaleLowerCase('en-ZA');
  return words.length > 0 && words.every((word) => haystack.includes(word));
}

/** Only route notification payloads into destinations this native app actually owns. */
export function nativeNotificationDestination(link: string | null): string | null {
  if (!link || !link.startsWith('/') || link.startsWith('//') || link.includes('\\') || [...link].some((character) => character.charCodeAt(0) < 32)) return null;
  const pathname = link.split(/[?#]/, 1)[0];
  if (/^\/(?:app\/)?bookings(?:\/[0-9a-f-]{36})?$/.test(pathname)) return '/bookings';
  const routes: Record<string, string> = {
    '/app': '/bookings', '/care-plus': '/care-plus', '/app/plans': '/care-plus',
    '/app/support': '/concierge', '/app/profile': '/account', '/app/notifications': '/notifications',
    '/notifications': '/notifications', '/account': '/account', '/xooter/jobs': '/xooter/jobs',
  };
  return routes[pathname] ?? null;
}
