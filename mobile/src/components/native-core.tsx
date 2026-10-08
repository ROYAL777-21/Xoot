import { Image, Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle, type ScrollViewProps } from 'react-native';
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

import { nativePalette, nativeShadows } from '@/constants/handoff';
export { nativePalette } from '@/constants/handoff';

export const nativeFonts = {
  body: 'XootJakarta',
  bodyMedium: 'XootJakarta',
  bodyBold: 'XootJakartaBold',
  display: 'XootNewsreader',
  displayStrong: 'XootNewsreaderStrong',
  script: 'XootCaveat',
  mono: 'XootMono',
} as const;

export type NativeBooking = {
  id: string;
  service: string;
  service_type: string;
  scheduled_at: string;
  status: string;
  price: number;
  payment_status: string | null;
  address: string | null;
  duration_hours: number;
  xooter_id: string | null;
  xooter: {
    id: string | null;
    name: string | null;
    photo_url: string | null;
    rating: number | null;
    verified: boolean | null;
  } | null;
};

type NativeProfile = {
  full_name: string | null;
  avatar_url: string | null;
  address: string | null;
  phone: string | null;
};

type NativeCoreState = {
  bookings: NativeBooking[];
  error: string | null;
  isLoading: boolean;
  profile: NativeProfile | null;
  unreadNotifications: number;
  refresh: () => Promise<void>;
};

const NativeCoreContext = createContext<NativeCoreState | null>(null);

export function NativeCoreDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<NativeBooking[]>([]);
  const [profile, setProfile] = useState<NativeProfile | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isLoading, setIsLoading] = useState(Boolean(user));
  const [error, setError] = useState<string | null>(null);
  const refreshVersion = useRef(0);

  const refresh = useCallback(async () => {
    const version = ++refreshVersion.current;
    if (!user) {
      setBookings([]);
      setProfile(null);
      setUnreadNotifications(0);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
    const [profileResult, bookingResult, notificationResult] = await Promise.all([
      supabase.from('profiles').select('full_name,avatar_url,address,phone').eq('id', user.id).maybeSingle(),
      supabase
        .from('bookings')
        .select('id,service,service_type,scheduled_at,status,price,payment_status,address,duration_hours,xooter_id')
        .eq('user_id', user.id)
        .order('scheduled_at', { ascending: true }),
      supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false),
    ]);
    if (version !== refreshVersion.current) return;

    const firstError = profileResult.error ?? bookingResult.error ?? notificationResult.error;
    if (firstError) {
      setError('Your Xoot details could not be refreshed. Pull down or try again shortly.');
      setIsLoading(false);
      return;
    }

    const rawBookings = bookingResult.data ?? [];
    const ids = rawBookings.map((booking) => booking.id);
    const xooterResult = ids.length
      ? await supabase
          .from('booking_xooter_profiles')
          .select('booking_id,id,name,photo_url,rating,verified')
          .in('booking_id', ids)
      : { data: [], error: null };
    if (version !== refreshVersion.current) return;

    if (xooterResult.error) {
      setError('Bookings loaded, but assigned Xooter details are temporarily unavailable.');
    }

    const byBooking = new Map(
      (xooterResult.data ?? [])
        .filter((item) => item.booking_id)
        .map((item) => [item.booking_id as string, item]),
    );
    setProfile(profileResult.data);
    setUnreadNotifications(notificationResult.count ?? 0);
    setBookings(rawBookings.map((booking) => ({ ...booking, xooter: byBooking.get(booking.id) ?? null })));
    } catch {
      if (version === refreshVersion.current) setError('Your Xoot details could not be refreshed. Check your connection and try again.');
    } finally {
      if (version === refreshVersion.current) setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
    if (!user) return;

    const channel = supabase
      .channel(`mobile-core-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `user_id=eq.${user.id}` }, () => {
        void refresh();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => {
        void refresh();
      })
      .subscribe();

    return () => {
      refreshVersion.current += 1;
      void supabase.removeChannel(channel);
    };
  }, [refresh, user]);

  const value = useMemo(
    () => ({ bookings, error, isLoading, profile, unreadNotifications, refresh }),
    [bookings, error, isLoading, profile, unreadNotifications, refresh],
  );

  return <NativeCoreContext.Provider value={value}>{children}</NativeCoreContext.Provider>;
}

export function useNativeCoreData() {
  const value = useContext(NativeCoreContext);
  if (!value) throw new Error('useNativeCoreData must be used inside NativeCoreDataProvider');
  return value;
}

export type CoreIconName =
  | 'arrow-left'
  | 'bell'
  | 'briefcase'
  | 'calendar'
  | 'check'
  | 'chevron-right'
  | 'circle-user'
  | 'credit-card'
  | 'gift'
  | 'heart'
  | 'home'
  | 'list'
  | 'lock'
  | 'message'
  | 'plus'
  | 'repeat'
  | 'search'
  | 'shield'
  | 'sparkles'
  | 'star'
  | 'trophy'
  | 'wallet';

export function CoreIcon({ name, color = nativePalette.ink, size = 20 }: { name: CoreIconName; color?: string; size?: number }) {
  const common = { fill: 'none', stroke: color, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, strokeWidth: 1.9 };
  return (
    <Svg accessibilityElementsHidden focusable={false} height={size} viewBox="0 0 24 24" width={size}>
      {name === 'search' && <><Circle cx="11" cy="11" r="7" {...common} /><Line x1="16" y1="16" x2="21" y2="21" {...common} /></>}
      {name === 'bell' && <><Path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" {...common} /><Path d="M10 21h4" {...common} /></>}
      {name === 'calendar' && <><Rect x="3" y="5" width="18" height="16" rx="3" {...common} /><Line x1="8" y1="3" x2="8" y2="7" {...common} /><Line x1="16" y1="3" x2="16" y2="7" {...common} /><Line x1="3" y1="10" x2="21" y2="10" {...common} /></>}
      {name === 'home' && <><Path d="M3 11.5 12 4l9 7.5" {...common} /><Path d="M5.5 10v10h13V10M9.5 20v-6h5v6" {...common} /></>}
      {name === 'list' && <><Line x1="9" y1="6" x2="21" y2="6" {...common} /><Line x1="9" y1="12" x2="21" y2="12" {...common} /><Line x1="9" y1="18" x2="21" y2="18" {...common} /><Polyline points="3 6 4.5 7.5 7 4.5" {...common} /><Polyline points="3 12 4.5 13.5 7 10.5" {...common} /><Polyline points="3 18 4.5 19.5 7 16.5" {...common} /></>}
      {name === 'circle-user' && <><Circle cx="12" cy="12" r="9" {...common} /><Circle cx="12" cy="9" r="3" {...common} /><Path d="M6.7 18c1.2-2.4 3-3.6 5.3-3.6s4.1 1.2 5.3 3.6" {...common} /></>}
      {name === 'chevron-right' && <Polyline points="9 5 16 12 9 19" {...common} />}
      {name === 'arrow-left' && <><Line x1="20" y1="12" x2="4" y2="12" {...common} /><Polyline points="10 6 4 12 10 18" {...common} /></>}
      {name === 'plus' && <><Line x1="12" y1="5" x2="12" y2="19" {...common} /><Line x1="5" y1="12" x2="19" y2="12" {...common} /></>}
      {name === 'wallet' && <><Rect x="3" y="6" width="18" height="14" rx="3" {...common} /><Path d="M5 6V4h12v2M15 12h6v4h-6a2 2 0 0 1 0-4Z" {...common} /></>}
      {name === 'credit-card' && <><Rect x="3" y="5" width="18" height="14" rx="3" {...common} /><Line x1="3" y1="10" x2="21" y2="10" {...common} /></>}
      {name === 'gift' && <><Rect x="3" y="9" width="18" height="12" rx="2" {...common} /><Path d="M12 9v12M3 13h18M12 9H8.5a2.5 2.5 0 1 1 2.2-3.7L12 9Zm0 0h3.5a2.5 2.5 0 1 0-2.2-3.7L12 9Z" {...common} /></>}
      {name === 'heart' && <Path d="M20.8 5.7a5.2 5.2 0 0 0-7.4 0L12 7.1l-1.4-1.4a5.2 5.2 0 1 0-7.4 7.4L12 21l8.8-7.9a5.2 5.2 0 0 0 0-7.4Z" {...common} />}
      {name === 'trophy' && <><Path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" {...common} /><Path d="M8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4M12 13v5M8 21h8M9 18h6" {...common} /></>}
      {name === 'repeat' && <><Path d="M17 2l4 4-4 4" {...common} /><Path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4" {...common} /><Path d="M21 13v2a3 3 0 0 1-3 3H3" {...common} /></>}
      {name === 'message' && <Path d="M21 14a4 4 0 0 1-4 4H9l-6 3 1.5-5A7 7 0 0 1 3 12V8a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v6Z" {...common} />}
      {name === 'shield' && <><Path d="M12 3 20 6v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6l8-3Z" {...common} /><Polyline points="8.5 12 11 14.5 16 9.5" {...common} /></>}
      {name === 'lock' && <><Rect x="5" y="10" width="14" height="11" rx="3" {...common} /><Path d="M8 10V7a4 4 0 0 1 8 0v3" {...common} /></>}
      {name === 'briefcase' && <><Rect x="3" y="7" width="18" height="13" rx="3" {...common} /><Path d="M9 7V4h6v3M3 12h18M10 12v2h4v-2" {...common} /></>}
      {name === 'check' && <Polyline points="5 12 10 17 20 7" {...common} />}
      {name === 'star' && <Path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" {...common} />}
      {name === 'sparkles' && <><Path d="m12 3 1.2 3.4L17 8l-3.8 1.6L12 13l-1.2-3.4L7 8l3.8-1.6L12 3Z" {...common} /><Path d="m18.5 14 .7 2 2.3 1-2.3 1-.7 2-.7-2-2.3-1 2.3-1 .7-2ZM5 13l.7 2 2.3 1-2.3 1L5 19l-.7-2L2 16l2.3-1L5 13Z" {...common} /></>}
    </Svg>
  );
}

export function Wordmark({ size = 28, color = nativePalette.ink }: { size?: number; color?: string }) {
  return (
    <Text accessibilityLabel="Xoot" selectable={false} style={{ color, fontFamily: nativeFonts.script, fontSize: Math.round(size * 1.5), letterSpacing: -0.01 * size, lineHeight: Math.round(size * 1.5) }}>
      Xoot
    </Text>
  );
}

export function Screen({ children, contentStyle, refreshControl }: { children: React.ReactNode; contentStyle?: ViewStyle; refreshControl?: ScrollViewProps['refreshControl'] }) {
  return (
    <View style={styles.screen}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[styles.screenContent, contentStyle]}
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </View>
  );
}

export function DisplayTitle({ children }: { children: React.ReactNode }) {
  return <Text selectable style={styles.displayTitle}>{children}</Text>;
}

export function SectionLabel({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <View style={styles.sectionLabelRow}>
      <Text selectable style={styles.sectionLabel}>{children}</Text>
      {typeof count === 'number' ? <Text selectable style={styles.sectionCount}>{count}</Text> : null}
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle | ViewStyle[] }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Avatar({ name, uri, size = 44 }: { name?: string | null; uri?: string | null; size?: number }) {
  const initials = (name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'X';
  if (uri) return <Image accessibilityLabel={name ?? 'Profile photo'} source={{ uri }} style={{ borderRadius: size / 2, height: size, width: size }} />;
  return (
    <View style={[styles.avatar, { borderRadius: size / 2, height: size, width: size }]}>
      <Text selectable={false} style={[styles.avatarText, { fontSize: Math.max(12, size * 0.32) }]}>{initials}</Text>
    </View>
  );
}

export function Pill({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' }) {
  const tones = {
    neutral: [nativePalette.sunken, nativePalette.inkSoft],
    success: [nativePalette.sageWash, nativePalette.sageInk],
    warning: [nativePalette.honeyWash, nativePalette.honeyInk],
    danger: [nativePalette.careWash, nativePalette.careInk],
  } as const;
  return (
    <View style={[styles.pill, { backgroundColor: tones[tone][0] }]}>
      <Text selectable style={[styles.pillText, { color: tones[tone][1] }]}>{children}</Text>
    </View>
  );
}

export function IconButton({ icon, label, onPress, badge }: { icon: CoreIconName; label: string; onPress: () => void; badge?: boolean }) {
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" hitSlop={6} onPress={onPress} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
      <CoreIcon name={icon} size={20} />
      {badge ? <View style={styles.notificationDot} /> : null}
    </Pressable>
  );
}

export function PrimaryAction({ children, icon, onPress, disabled = false }: { children: React.ReactNode; icon?: CoreIconName; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.primaryAction, disabled && styles.disabled, pressed && styles.pressed]}>
      {icon ? <CoreIcon color={nativePalette.card} name={icon} size={18} /> : null}
      <Text selectable={false} style={styles.primaryActionText}>{children}</Text>
    </Pressable>
  );
}

export function EmptyState({ title, detail, action, onAction }: { title: string; detail: string; action?: string; onAction?: () => void }) {
  return (
    <Card style={styles.emptyCard}>
      <View style={styles.emptyIcon}><CoreIcon color={nativePalette.muted} name="calendar" size={23} /></View>
      <Text selectable style={styles.emptyTitle}>{title}</Text>
      <Text selectable style={styles.emptyDetail}>{detail}</Text>
      {action && onAction ? <PrimaryAction onPress={onAction}>{action}</PrimaryAction> : null}
    </Card>
  );
}

export function LoadingRows() {
  return (
    <View style={{ gap: 10 }}>
      {[0, 1, 2].map((key) => <View key={key} style={[styles.loadingRow, { opacity: 1 - key * 0.22 }]} />)}
    </View>
  );
}

export function serviceTitle(booking: Pick<NativeBooking, 'service' | 'service_type'>) {
  const value = booking.service || booking.service_type || 'Xoot visit';
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function visibleStatus(status: string) {
  const labels: Record<string, string> = {
    pending_payment: 'Awaiting payment', payment_confirmed: 'Payment confirmed', awaiting_assignment: 'Finding a Xooter',
    assigned: 'Assigned', contractor_accepted: 'Confirmed', confirmed: 'Confirmed', en_route: 'On the way', enroute: 'On the way',
    in_progress: 'In progress', completed: 'Complete', rated: 'Rated', cancelled: 'Cancelled', draft: 'Draft',
    replacement_required: 'Finding a replacement', replacement_offered: 'Replacement offered', reassigned: 'Reassigned',
  };
  return labels[status] ?? status.replace(/_/g, ' ');
}

export function statusTone(status: string): 'neutral' | 'success' | 'warning' | 'danger' {
  if (status === 'completed' || status === 'rated' || status === 'contractor_accepted' || status === 'confirmed') return 'success';
  if (status === 'cancelled') return 'danger';
  if (status === 'awaiting_assignment' || status.includes('replacement')) return 'warning';
  return 'neutral';
}

export function firstName(name?: string | null, fallback?: string | null) {
  return name?.trim().split(/\s+/)[0] || fallback?.split('@')[0] || '';
}

export function formatVisitDate(value: string, long = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date pending';
  return new Intl.DateTimeFormat('en-ZA', long
    ? { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: nativePalette.page },
  screenContent: { gap: 14, paddingHorizontal: 20, paddingTop: 6, paddingBottom: 112 },
  displayTitle: { color: nativePalette.ink, fontFamily: nativeFonts.displayStrong, fontSize: 36, letterSpacing: -0.65, lineHeight: 39 },
  sectionLabelRow: { alignItems: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 2 },
  sectionLabel: { color: nativePalette.muted, fontFamily: nativeFonts.bodyBold, fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase' },
  sectionCount: { color: nativePalette.muted, fontFamily: nativeFonts.mono, fontSize: 11 },
  card: { backgroundColor: nativePalette.card, borderColor: nativePalette.border, borderRadius: 20, borderCurve: 'continuous', borderWidth: 1, padding: 16, boxShadow: nativeShadows.card },
  avatar: { alignItems: 'center', backgroundColor: nativePalette.violetWash, borderColor: nativePalette.violetBorder, borderWidth: 1, justifyContent: 'center' },
  avatarText: { color: nativePalette.violetDark, fontFamily: nativeFonts.bodyBold },
  pill: { alignItems: 'center', alignSelf: 'flex-start', borderRadius: 999, minHeight: 26, justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontFamily: nativeFonts.bodyBold, fontSize: 11 },
  iconButton: { alignItems: 'center', backgroundColor: nativePalette.card, borderColor: nativePalette.border, borderRadius: 999, borderWidth: 1, height: 44, justifyContent: 'center', position: 'relative', width: 44 },
  notificationDot: { backgroundColor: nativePalette.violet, borderColor: nativePalette.page, borderRadius: 5, borderWidth: 2, height: 10, position: 'absolute', right: 5, top: 5, width: 10 },
  primaryAction: { alignItems: 'center', backgroundColor: nativePalette.ink, borderRadius: 999, flexDirection: 'row', gap: 8, justifyContent: 'center', minHeight: 50, paddingHorizontal: 20 },
  primaryActionText: { color: nativePalette.card, fontFamily: nativeFonts.bodyBold, fontSize: 14 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.45 },
  emptyCard: { alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 26 },
  emptyIcon: { alignItems: 'center', backgroundColor: nativePalette.sunken, borderRadius: 18, height: 48, justifyContent: 'center', width: 48 },
  emptyTitle: { color: nativePalette.ink, fontFamily: nativeFonts.displayStrong, fontSize: 21, textAlign: 'center' },
  emptyDetail: { color: nativePalette.muted, fontFamily: nativeFonts.body, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  loadingRow: { backgroundColor: nativePalette.sunken, borderRadius: 18, height: 78 },
});

export const nativeCoreStyles = styles;
