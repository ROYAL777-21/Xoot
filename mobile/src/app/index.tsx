import { withOpacity } from '@/constants/handoff';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { NativeLaunchExperience } from '@/components/native-launch-experience';
import {
  Avatar, Card, CoreIcon, DisplayTitle, EmptyState, IconButton, LoadingRows, Pill, PrimaryAction, Screen,
  SectionLabel, firstName, formatVisitDate, nativeCoreStyles, nativeFonts, nativePalette, serviceTitle,
  statusTone, useNativeCoreData, visibleStatus,
} from '@/components/native-core';
import {
  buildNativeLaunchTarget, type NativeLaunchQueryParams, resolveNativeLaunchIntent,
  shouldBypassNativeLaunchExperience,
} from '@/lib/native-launch';
import { useAuth } from '@/providers/auth-provider';

const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export default function TodayScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const { bookings, error, isLoading, profile, refresh, unreadNotifications } = useNativeCoreData();
  const params = useLocalSearchParams();
  const launchParams = params as NativeLaunchQueryParams;
  const nativeLaunchIntent = resolveNativeLaunchIntent(launchParams);
  const bypassLaunch = shouldBypassNativeLaunchExperience(nativeLaunchIntent);
  const launchTarget = buildNativeLaunchTarget(nativeLaunchIntent, launchParams);
  const today = useMemo(() => new Date(), []);
  const [selectedDay, setSelectedDay] = useState(dayKey(today));

  useEffect(() => {
    if (bypassLaunch) router.replace(launchTarget);
  }, [bypassLaunch, launchTarget]);

  const week = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index - 2);
    return date;
  }), [today]);

  const selectedDate = new Date(`${selectedDay}T12:00:00`);
  const selectedBookings = bookings.filter((booking) => dayKey(new Date(booking.scheduled_at)) === selectedDay);
  const upcoming = bookings.find((booking) => new Date(booking.scheduled_at).getTime() >= Date.now() && booking.status !== 'cancelled');
  const greetingName = firstName(profile?.full_name, user?.email);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  if (bypassLaunch) return null;

  if (!authLoading && !user) {
    return (
      <Screen>
        <View style={styles.brandHeader}><Text selectable style={styles.guestLabel}>Home care, made human</Text></View>
        <NativeLaunchExperience onBook={() => router.push('/book')} onConcierge={() => router.push('/concierge')} />
        <Card style={styles.signInCard}>
          <Text selectable style={styles.signInTitle}>Your visits will meet you here.</Text>
          <Text selectable style={styles.signInBody}>Sign in to see real bookings, assigned Xooters and live service updates.</Text>
          <PrimaryAction onPress={() => router.push('/account')}>Sign in to Xoot</PrimaryAction>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => void refresh()} tintColor={nativePalette.violet} />}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text selectable style={styles.greeting}>{greetingName ? `${greeting}, ${greetingName}` : greeting}</Text>
          <DisplayTitle>{new Intl.DateTimeFormat('en-ZA', { weekday: 'long' }).format(selectedDate)}</DisplayTitle>
        </View>
        <View style={styles.headerActions}>
          <IconButton icon="search" label="Search" onPress={() => router.push('/search')} />
          <IconButton badge={unreadNotifications > 0} icon="bell" label="Notifications" onPress={() => router.push('/notifications')} />
          <Pressable accessibilityLabel="Your profile" onPress={() => router.push('/account')} style={({ pressed }) => pressed && nativeCoreStyles.pressed}>
            <Avatar name={profile?.full_name ?? user?.email} size={44} uri={profile?.avatar_url} />
          </Pressable>
        </View>
      </View>

      <View style={styles.dayStrip}>
        {week.map((date) => {
          const key = dayKey(date);
          const selected = key === selectedDay;
          const hasVisit = bookings.some((booking) => dayKey(new Date(booking.scheduled_at)) === key);
          return (
            <Pressable key={key} onPress={() => setSelectedDay(key)} style={({ pressed }) => [styles.day, selected && styles.daySelected, pressed && nativeCoreStyles.pressed]}>
              <Text selectable={false} style={[styles.dayName, selected && styles.dayTextSelected]}>{new Intl.DateTimeFormat('en-ZA', { weekday: 'narrow' }).format(date)}</Text>
              <Text selectable={false} style={[styles.dayNumber, selected && styles.dayTextSelected]}>{date.getDate()}</Text>
              <View style={[styles.dayDot, hasVisit && styles.dayDotActive, selected && hasVisit && styles.dayDotSelected]} />
            </Pressable>
          );
        })}
      </View>

      {upcoming ? (
        <Pressable onPress={() => router.push('/bookings')} style={({ pressed }) => [pressed && nativeCoreStyles.pressed]}>
          <Card style={styles.nextVisitCard}>
            <View style={styles.nextVisitIcon}><CoreIcon color={nativePalette.violetDark} name="calendar" size={21} /></View>
            <View style={styles.flex}>
              <Text selectable style={styles.cardEyebrow}>Next visit</Text>
              <Text selectable style={styles.nextVisitTitle}>{serviceTitle(upcoming)}</Text>
              <Text selectable style={styles.nextVisitMeta}>{formatVisitDate(upcoming.scheduled_at, true)}{upcoming.xooter?.name ? ` · ${upcoming.xooter.name}` : ''}</Text>
            </View>
            <CoreIcon color={nativePalette.borderStrong} name="chevron-right" size={18} />
          </Card>
        </Pressable>
      ) : null}

      {error ? <Text selectable style={styles.error}>{error}</Text> : null}
      <View style={styles.sectionBlock}>
        <SectionLabel count={selectedBookings.length}>
          {selectedDay === dayKey(today) ? 'Today' : new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'long' }).format(selectedDate)}
        </SectionLabel>
        {isLoading && bookings.length === 0 ? <LoadingRows /> : selectedBookings.length === 0 ? (
          <EmptyState action="Book a visit" detail="There is nothing scheduled for this day." onAction={() => router.push('/book')} title="This day is yours" />
        ) : (
          <View style={styles.bookingList}>
            {selectedBookings.map((booking) => (
              <Pressable key={booking.id} onPress={() => router.push('/bookings')} style={({ pressed }) => [styles.bookingRow, pressed && nativeCoreStyles.pressed]}>
                <View style={styles.serviceOrb}><CoreIcon color={nativePalette.blushInk} name="sparkles" size={20} /></View>
                <View style={styles.flex}>
                  <Text selectable style={styles.bookingTitle}>{serviceTitle(booking)}</Text>
                  <Text selectable style={styles.bookingMeta}>{formatVisitDate(booking.scheduled_at)}{booking.duration_hours ? ` · ${booking.duration_hours} hr` : ''}{booking.xooter?.name ? ` · ${booking.xooter.name}` : ''}</Text>
                </View>
                <Pill tone={statusTone(booking.status)}>{visibleStatus(booking.status)}</Pill>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <Pressable onPress={() => router.push('/book')} style={({ pressed }) => [styles.quickBook, pressed && nativeCoreStyles.pressed]}>
        <View style={styles.quickBookIcon}><CoreIcon color={nativePalette.blushInk} name="plus" size={22} /></View>
        <View style={styles.flex}>
          <Text selectable style={styles.quickBookTitle}>Add a visit</Text>
          <Text selectable style={styles.quickBookDetail}>Choose what your home needs and when.</Text>
        </View>
        <CoreIcon color={nativePalette.blushInk} name="chevron-right" size={18} />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandHeader: { paddingTop: 6 },
  guestLabel: { color: nativePalette.muted, fontFamily: nativeFonts.bodyBold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  signInCard: { gap: 12 },
  signInTitle: { color: nativePalette.ink, fontFamily: nativeFonts.displayStrong, fontSize: 25, lineHeight: 29 },
  signInBody: { color: nativePalette.muted, fontFamily: nativeFonts.body, fontSize: 14, lineHeight: 21 },
  header: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  headerCopy: { flex: 1, gap: 5, paddingTop: 2 },
  headerActions: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  greeting: { color: nativePalette.muted, fontFamily: nativeFonts.bodyBold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  dayStrip: { backgroundColor: nativePalette.card, borderColor: nativePalette.border, borderRadius: 22, borderCurve: 'continuous', borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', padding: 5 },
  day: { alignItems: 'center', borderRadius: 17, flex: 1, gap: 2, minHeight: 58, justifyContent: 'center' },
  daySelected: { backgroundColor: nativePalette.ink },
  dayName: { color: nativePalette.muted, fontFamily: nativeFonts.bodyBold, fontSize: 10, textTransform: 'uppercase' },
  dayNumber: { color: nativePalette.ink, fontFamily: nativeFonts.mono, fontSize: 15 },
  dayTextSelected: { color: nativePalette.card },
  dayDot: { borderRadius: 2, height: 4, width: 4 },
  dayDotActive: { backgroundColor: nativePalette.violet },
  dayDotSelected: { backgroundColor: nativePalette.card },
  nextVisitCard: { alignItems: 'center', backgroundColor: nativePalette.violetWash, borderColor: withOpacity(nativePalette.violet, 0.24), flexDirection: 'row', gap: 12 },
  nextVisitIcon: { alignItems: 'center', backgroundColor: withOpacity(nativePalette.card, 0.72), borderRadius: 14, height: 42, justifyContent: 'center', width: 42 },
  flex: { flex: 1 },
  cardEyebrow: { color: nativePalette.violetDark, fontFamily: nativeFonts.bodyBold, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  nextVisitTitle: { color: nativePalette.violetDark, fontFamily: nativeFonts.bodyBold, fontSize: 14, marginTop: 2 },
  nextVisitMeta: { color: nativePalette.violetDark, fontFamily: nativeFonts.body, fontSize: 11, marginTop: 2, opacity: 0.78 },
  error: { color: nativePalette.careInk, fontFamily: nativeFonts.body, fontSize: 12, lineHeight: 18 },
  sectionBlock: { gap: 8 },
  bookingList: { gap: 8 },
  bookingRow: { alignItems: 'center', backgroundColor: nativePalette.card, borderColor: nativePalette.border, borderRadius: 18, borderCurve: 'continuous', borderWidth: 1, flexDirection: 'row', gap: 11, minHeight: 76, padding: 12 },
  serviceOrb: { alignItems: 'center', backgroundColor: nativePalette.blushWash, borderRadius: 999, height: 42, justifyContent: 'center', width: 42 },
  bookingTitle: { color: nativePalette.ink, fontFamily: nativeFonts.bodyBold, fontSize: 14 },
  bookingMeta: { color: nativePalette.muted, fontFamily: nativeFonts.body, fontSize: 11, marginTop: 3 },
  quickBook: { alignItems: 'center', backgroundColor: nativePalette.blushWash, borderRadius: 22, borderCurve: 'continuous', flexDirection: 'row', gap: 12, padding: 16 },
  quickBookIcon: { alignItems: 'center', backgroundColor: withOpacity(nativePalette.card, 0.68), borderRadius: 14, height: 42, justifyContent: 'center', width: 42 },
  quickBookTitle: { color: nativePalette.blushInk, fontFamily: nativeFonts.bodyBold, fontSize: 14 },
  quickBookDetail: { color: nativePalette.blushInk, fontFamily: nativeFonts.body, fontSize: 11, marginTop: 2, opacity: 0.8 },
});
