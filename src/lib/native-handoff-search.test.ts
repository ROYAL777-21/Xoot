import { describe, expect, it } from 'vitest';
import { buildNativeSearchIndex, matchesNativeSearch, nativeNotificationDestination } from '../../mobile/src/lib/handoff-search';

describe('native handoff search', () => {
  it('indexes actual account details and omits a home when none was saved', () => {
    const guest = buildNativeSearchIndex();
    expect(guest.find((entry) => entry.id === 'home')).toBeUndefined();
    expect(guest.find((entry) => entry.id === 'profile')?.title).toBe('Your profile');
    const actual = buildNativeSearchIndex({ full_name: 'Test account', address: 'Saved test address' }, 'example@example.test');
    expect(actual.find((entry) => entry.id === 'home')?.title).toBe('Saved test address');
    expect(actual.find((entry) => entry.id === 'profile')?.detail).toBe('example@example.test');
  });

  it('matches multiword queries case-insensitively without returning everything for blank input', () => {
    expect(matchesNativeSearch('  GATE code ', 'Privacy', 'access gate code alarm security')).toBe(true);
    expect(matchesNativeSearch('gate invoice', 'Privacy', 'access gate code alarm security')).toBe(false);
    expect(matchesNativeSearch('  ', 'Every destination')).toBe(false);
  });

  it.each(['https://evil.test/app', '//evil.test/app', '/\\evil.test/app', 'javascript:alert(1)', '/app/admin', '/app/bookings-not-real'])('does not follow unsupported notification destination %s', (link) => {
    expect(nativeNotificationDestination(link)).toBeNull();
  });

  it('maps supported website notifications into real native routes without carrying untrusted query parameters', () => {
    expect(nativeNotificationDestination('/app/bookings?redirect=https://evil.test')).toBe('/bookings');
    expect(nativeNotificationDestination('/app/plans')).toBe('/care-plus');
    expect(nativeNotificationDestination('/app/support')).toBe('/concierge');
  });
});
