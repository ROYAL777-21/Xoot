import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import {
  Avatar, Card, CoreIcon, DisplayTitle, EmptyState, LoadingRows, Pill, PrimaryAction, Screen,
  formatVisitDate, nativeFonts, nativePalette, serviceTitle, statusTone, useNativeCoreData, visibleStatus,
} from '@/components/native-core';
import { isBookingId, visitProgress, visitStatusStory } from '@/lib/native-visit-detail';
import { useAuth } from '@/providers/auth-provider';

export default function VisitDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const { user, isLoading: authLoading } = useAuth();
  const { bookings, error, isLoading, refresh } = useNativeCoreData();
  const safeId = isBookingId(id) ? id : null;
  // Bookings are fetched in native-core with .eq('user_id', user.id) and are
  // invalidated when that account changes. Never use a public-ID-only query.
  const booking = safeId && user && !authLoading && !error ? bookings.find(item => item.id === safeId) : null;
  const story = booking ? visitStatusStory(booking.status) : null;
  const progress = booking ? visitProgress(booking.status) : null;

  const head = <View style={s.header}>
    <Pressable accessibilityRole="button" accessibilityLabel="Back to visits" onPress={() => router.back()} style={s.back}>
      <CoreIcon name="arrow-left" size={20} /></Pressable>
    <View style={s.flex}><Text style={s.eyebrow}>YOUR VISIT</Text><DisplayTitle>Visit details</DisplayTitle></View>
  </View>;

  if (authLoading || (user && isLoading && bookings.length === 0)) {
    return <Screen>{head}<LoadingRows /></Screen>;
  }
  if (!user) {
    return <Screen>{head}<EmptyState title="Sign in to view your visit"
      detail="Addresses, Xooter assignments and visit updates belong to your protected Xoot account."
      action="Sign in" onAction={() => router.push('/account')} /></Screen>;
  }
  if (error) {
    return <Screen>{head}<EmptyState title="Visit details are unavailable"
      detail={error} action="Try again" onAction={() => void refresh()} /></Screen>;
  }
  if (!booking || !story) {
    return <Screen>{head}<EmptyState title="Visit not found"
      detail="This visit is not available in your account. Choose a visit from your history or refresh."
      action="Back to visits" onAction={() => router.replace('/bookings')} /></Screen>;
  }

  return <Screen contentStyle={s.screen} refreshControl={
    <RefreshControl refreshing={isLoading} onRefresh={() => void refresh()} tintColor={nativePalette.violet} />}>
    {head}
    <Card style={s.hero}>
      <View style={s.heroTop}><View style={s.symbol}><CoreIcon name="sparkles" color={nativePalette.blushInk} size={30} /></View>
        <Pill tone={statusTone(booking.status)}>{visibleStatus(booking.status)}</Pill></View>
      <Text style={s.heroTitle}>{story.title}</Text>
      <Text style={s.copy}>{story.detail}</Text>
      <Text style={s.service}>{serviceTitle(booking)}</Text>
      <Text style={s.meta}>{formatVisitDate(booking.scheduled_at, true)}
        {booking.duration_hours ? ` · ${booking.duration_hours} hrs booked` : ''}</Text>
    </Card>

    <Text style={s.sectionTitle}>Your clean</Text>
    <Card style={s.infoCard}>
      <View style={s.row}><CoreIcon name="calendar" color={nativePalette.violet} size={19} />
        <View style={s.flex}><Text style={s.label}>Scheduled time</Text><Text style={s.value}>
          {formatVisitDate(booking.scheduled_at, true)}</Text></View></View>
      {booking.address ? <View style={s.row}><CoreIcon name="home" color={nativePalette.violet} size={19} />
        <View style={s.flex}><Text style={s.label}>Cleaning address</Text>
          <Text style={s.value}>{booking.address}</Text></View></View> : null}
      <View style={s.row}><CoreIcon name="credit-card" color={nativePalette.violet} size={19} />
        <View style={s.flex}><Text style={s.label}>Payment record</Text>
          <Text style={s.copy}>Payment and any refund must be confirmed from verified provider records. A booking amount alone is not a receipt.</Text></View></View>
    </Card>

    <Text style={s.sectionTitle}>Your Xooter</Text>
    {booking.xooter ? <Card style={s.xooterCard}>
      <Avatar name={booking.xooter.name} uri={booking.xooter.photo_url} size={53} />
      <View style={s.flex}><Text style={s.value}>{booking.xooter.name || 'Assigned Xooter'}</Text>
        {booking.xooter.verified ? <Text style={s.verified}>Verified by Xoot</Text>
          : <Text style={s.copy}>Verification details unavailable</Text>}
        {typeof booking.xooter.rating === 'number' && Number.isFinite(booking.xooter.rating)
          ? <Text style={s.rating}>★ {booking.xooter.rating.toFixed(1)}</Text> : null}
      </View>
    </Card> : <Card style={s.infoCard}>
      <Text style={s.value}>Your Xooter is not assigned yet</Text>
      <Text style={s.copy}>When Xoot has a confirmed assignment, their available profile will appear here.</Text>
    </Card>}

    <Text style={s.sectionTitle}>Journey</Text>
    {progress ? <Card style={s.infoCard}>
      <Text style={s.copy}>An indication of the current booking stage. These steps are not a historical event log or live GPS tracking.</Text>
      {progress.phases.map((step, index) =>
        <View key={step} style={s.step}>
          <View style={[s.stepDot, index <= progress.index && s.stepDone]}>
            {index <= progress.index ? <CoreIcon name="check" color={nativePalette.card} size={13} /> : null}
          </View>
          <Text style={[s.stepText, index === progress.index && s.current]}>{step.replace(/_/g, ' ').replace(/^./, x => x.toUpperCase())}</Text>
          {index === progress.index ? <Text style={s.now}>Current</Text> : null}
        </View>)}
    </Card> : <Card style={s.infoCard}>
      <Text style={s.copy}>This visit is not on the standard journey. Its current status is shown above; no further activity is assumed.</Text>
    </Card>}

    <Card style={s.notice}><CoreIcon name="shield" color={nativePalette.sageInk} size={21} />
      <View style={s.flex}><Text style={s.label}>About tracking and contact</Text>
        <Text style={s.copy}>Live map, exact arrival time, direct calling and task-level checklists are unavailable until their verified services are enabled. No simulated activity is shown.</Text></View></Card>

    <PrimaryAction icon="repeat" onPress={() => router.push({
      pathname: '/book', params: { service: booking.service_type || booking.service },
    })}>Book this service again</PrimaryAction>
    <Pressable accessibilityRole="button" onPress={() => router.push('/concierge')} style={s.help}>
      <CoreIcon name="message" color={nativePalette.violetDark} size={19} />
      <Text style={s.helpText}>Need help with this visit?</Text>
    </Pressable>
  </Screen>;
}

const s = StyleSheet.create({
  screen: { paddingBottom: 83, gap: 13 },
  header: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 2 },
  back: { height: 42, width: 42, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
    backgroundColor: nativePalette.card, borderWidth: 1, borderColor: nativePalette.border },
  flex: { flex: 1, minWidth: 0 },
  eyebrow: { fontSize: 10, letterSpacing: 1.4, fontFamily: nativeFonts.bodyBold, color: nativePalette.violetDark },
  hero: { backgroundColor: nativePalette.blushWash, borderRadius: 24, gap: 11, padding: 22 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  symbol: { borderRadius: 30, width: 57, height: 57, backgroundColor: nativePalette.card,
    alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 27, lineHeight: 34, color: nativePalette.ink, fontFamily: nativeFonts.displayStrong },
  copy: { fontSize: 12, lineHeight: 19, color: nativePalette.inkSoft, fontFamily: nativeFonts.body },
  service: { fontSize: 16, color: nativePalette.ink, fontFamily: nativeFonts.bodyBold },
  meta: { fontFamily: nativeFonts.body, color: nativePalette.inkSoft, fontSize: 12 },
  sectionTitle: { fontSize: 23, fontFamily: nativeFonts.displayStrong, color: nativePalette.ink, marginTop: 8 },
  infoCard: { gap: 13 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  label: { fontFamily: nativeFonts.bodyBold, color: nativePalette.ink, fontSize: 13 },
  value: { fontFamily: nativeFonts.bodyBold, color: nativePalette.ink, fontSize: 14, lineHeight: 21 },
  xooterCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  verified: { color: nativePalette.sageInk, fontFamily: nativeFonts.body, fontSize: 12, marginTop: 4 },
  rating: { color: nativePalette.honeyInk, fontFamily: nativeFonts.bodyBold, fontSize: 12, marginTop: 4 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  stepDot: { width: 22, height: 22, borderRadius: 12, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center', borderColor: nativePalette.border },
  stepDone: { backgroundColor: nativePalette.violet, borderColor: nativePalette.violet },
  stepText: { fontSize: 12, fontFamily: nativeFonts.body, color: nativePalette.muted, flex: 1 },
  current: { color: nativePalette.violetDark, fontFamily: nativeFonts.bodyBold },
  now: { fontSize: 11, color: nativePalette.violetDark, fontFamily: nativeFonts.bodyBold },
  notice: { backgroundColor: nativePalette.sageWash, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  help: { minHeight: 52, borderWidth: 1, borderColor: nativePalette.border, borderRadius: 26,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  helpText: { fontSize: 13, color: nativePalette.violetDark, fontFamily: nativeFonts.bodyBold },
});
