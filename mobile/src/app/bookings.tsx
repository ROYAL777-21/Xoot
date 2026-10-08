import { nativeShadows } from '@/constants/handoff';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import {
  Avatar, Card, CoreIcon, DisplayTitle, EmptyState, LoadingRows, Pill, PrimaryAction, Screen, formatVisitDate,
  nativeCoreStyles, nativeFonts, nativePalette, serviceTitle, statusTone, useNativeCoreData, visibleStatus,
  type NativeBooking,
} from '@/components/native-core';
import { useAuth } from '@/providers/auth-provider';

const pastStatuses = new Set(['completed', 'rated', 'cancelled']);

export default function VisitsScreen() {
  const { user } = useAuth();
  const { bookings, error, isLoading, refresh } = useNativeCoreData();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const visible = useMemo(
    () => bookings.filter((booking) => tab === 'past' ? pastStatuses.has(booking.status) : !pastStatuses.has(booking.status)),
    [bookings, tab],
  );

  if (!user) {
    return (
      <Screen>
        <DisplayTitle>Visits</DisplayTitle>
        <EmptyState action="Sign in" detail="Your real booking history and assigned Xooter details appear here once you sign in." onAction={() => router.push('/account')} title="Sign in to see your visits" />
      </Screen>
    );
  }

  return (
    <Screen refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => void refresh()} tintColor={nativePalette.violet} />}>
      <DisplayTitle>Visits</DisplayTitle>
      <View accessibilityRole="tablist" style={styles.tabs}>
        {(['upcoming', 'past'] as const).map((value) => (
          <Pressable accessibilityRole="tab" accessibilityState={{ selected: tab === value }} key={value} onPress={() => setTab(value)} style={({ pressed }) => [styles.tab, tab === value && styles.tabSelected, pressed && nativeCoreStyles.pressed]}>
            <Text selectable={false} style={[styles.tabText, tab === value && styles.tabTextSelected]}>{value === 'upcoming' ? 'Upcoming' : 'Past'}</Text>
          </Pressable>
        ))}
      </View>
      {error ? <Text selectable style={styles.error}>{error}</Text> : null}
      {isLoading && bookings.length === 0 ? <LoadingRows /> : visible.length === 0 ? (
        <EmptyState
          action={tab === 'upcoming' ? 'Book a visit' : undefined}
          detail={tab === 'upcoming' ? 'You have no upcoming visits.' : 'Completed visits will collect here.'}
          onAction={tab === 'upcoming' ? () => router.push('/book') : undefined}
          title={tab === 'upcoming' ? 'Your diary is clear' : 'No past visits yet'}
        />
      ) : (
        <View style={styles.list}>
          {visible.map((booking) => <VisitCard booking={booking} key={booking.id} past={tab === 'past'} />)}
        </View>
      )}
      {tab === 'upcoming' ? <PrimaryAction icon="plus" onPress={() => router.push('/book')}>Book another visit</PrimaryAction> : null}
    </Screen>
  );
}

function VisitCard({ booking, past }: { booking: NativeBooking; past: boolean }) {
  return (
      <Card style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.serviceIcon}><CoreIcon color={nativePalette.blushInk} name="sparkles" size={22} /></View>
          <View style={styles.flex}>
            <Text selectable style={styles.title}>{serviceTitle(booking)}</Text>
            <Text selectable style={styles.meta}>{formatVisitDate(booking.scheduled_at, true)}{booking.duration_hours ? ` · ${booking.duration_hours} hr` : ''}</Text>
          </View>
          <Pill tone={statusTone(booking.status)}>{visibleStatus(booking.status)}</Pill>
        </View>
        {booking.address ? (
          <View style={styles.detailRow}>
            <CoreIcon color={nativePalette.muted} name="home" size={16} />
            <Text numberOfLines={1} selectable style={styles.detail}>{booking.address}</Text>
          </View>
        ) : null}
        {booking.xooter ? (
          <View style={styles.xooterRow}>
            <Avatar name={booking.xooter.name} size={38} uri={booking.xooter.photo_url} />
            <View style={styles.flex}>
              <View style={styles.nameRow}>
                <Text numberOfLines={1} selectable style={styles.xooterName}>{booking.xooter.name || 'Assigned Xooter'}</Text>
                {booking.xooter.verified ? <CoreIcon color={nativePalette.sageInk} name="shield" size={14} /> : null}
              </View>
              {typeof booking.xooter.rating === 'number' ? (
                <Text selectable style={styles.rating}>★ {booking.xooter.rating.toFixed(1)}</Text>
              ) : null}
            </View>
            {past ? (
              <Pressable accessibilityLabel={`Rebook ${booking.xooter.name || 'this Xooter'}`} onPress={() => router.push({ pathname: '/book', params: { service: booking.service } })} style={({ pressed }) => [styles.rebook, pressed && nativeCoreStyles.pressed]}>
                <CoreIcon color={nativePalette.card} name="repeat" size={14} />
                <Text selectable={false} style={styles.rebookText}>Rebook</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View style={styles.detailRow}>
            <CoreIcon color={nativePalette.muted} name="circle-user" size={16} />
            <Text selectable style={styles.detail}>No Xooter assigned yet</Text>
          </View>
        )}
        {past && booking.price > 0 ? <Text selectable style={styles.paid}>Booking total R{booking.price.toFixed(2)}</Text> : null}
        {!past && booking.payment_status === 'pending' && Number.isFinite(booking.price) && booking.price > 0 ? (
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/split-fare', params: { bookingId: booking.id, total: String(booking.price) } })} style={({ pressed }) => [styles.splitFare, pressed && nativeCoreStyles.pressed]}>
            <Text selectable={false} style={styles.splitFareText}>Split this fare</Text>
          </Pressable>
        ) : null}
      </Card>
  );
}

const styles = StyleSheet.create({
  tabs: { backgroundColor: nativePalette.sunken, borderRadius: 999, flexDirection: 'row', padding: 4 },
  tab: { alignItems: 'center', borderRadius: 999, flex: 1, justifyContent: 'center', minHeight: 42 },
  tabSelected: { backgroundColor: nativePalette.card, boxShadow: nativeShadows.tab },
  tabText: { color: nativePalette.muted, fontFamily: nativeFonts.bodyBold, fontSize: 13 },
  tabTextSelected: { color: nativePalette.ink },
  error: { color: nativePalette.careInk, fontFamily: nativeFonts.body, fontSize: 12 },
  list: { gap: 10 },
  card: { gap: 12 },
  cardTop: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  serviceIcon: { alignItems: 'center', backgroundColor: nativePalette.blushWash, borderRadius: 999, height: 44, justifyContent: 'center', width: 44 },
  flex: { flex: 1, minWidth: 0 },
  title: { color: nativePalette.ink, fontFamily: nativeFonts.bodyBold, fontSize: 14 },
  meta: { color: nativePalette.muted, fontFamily: nativeFonts.body, fontSize: 11, marginTop: 3 },
  detailRow: { alignItems: 'center', flexDirection: 'row', gap: 7, paddingLeft: 2 },
  detail: { color: nativePalette.muted, flex: 1, fontFamily: nativeFonts.body, fontSize: 11 },
  xooterRow: { alignItems: 'center', backgroundColor: nativePalette.sunken, borderRadius: 14, flexDirection: 'row', gap: 10, padding: 10 },
  nameRow: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  xooterName: { color: nativePalette.ink, flexShrink: 1, fontFamily: nativeFonts.bodyBold, fontSize: 12 },
  rating: { color: nativePalette.honeyInk, fontFamily: nativeFonts.body, fontSize: 10, marginTop: 2 },
  rebook: { alignItems: 'center', backgroundColor: nativePalette.ink, borderRadius: 999, flexDirection: 'row', gap: 5, minHeight: 36, paddingHorizontal: 12 },
  rebookText: { color: nativePalette.card, fontFamily: nativeFonts.bodyBold, fontSize: 11 },
  paid: { color: nativePalette.muted, fontFamily: nativeFonts.mono, fontSize: 11, textAlign: 'right' },
  splitFare: { alignItems: 'center', borderColor: nativePalette.border, borderRadius: 999, borderWidth: 1, justifyContent: 'center', minHeight: 44, paddingHorizontal: 16 },
  splitFareText: { color: nativePalette.ink, fontFamily: nativeFonts.bodyBold, fontSize: 12 },
});
