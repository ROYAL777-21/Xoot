import { router } from 'expo-router';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import {
  Card, CoreIcon, DisplayTitle, EmptyState, LoadingRows, Pill, PrimaryAction,
  Screen, SectionLabel, formatVisitDate, nativeFonts, nativePalette,
} from '@/components/native-core';
import { supabase } from '@/lib/supabase';
import { groupXooterJobs, parseXooterJobCards, type XooterJobCard } from '@/lib/native-xooter-ledger';
import { useAuth } from '@/providers/auth-provider';

type State = { jobs: XooterJobCard[]; xooterId: string | null; loading: boolean; error: string | null };
const portal = 'https://xoot.co.za/xooter/jobs';

function JobCard({ job }: { job: XooterJobCard }) {
  const state = job.state.toLowerCase();
  const label = (job.service_type ?? job.service ?? 'Cleaning service')
    .replace(/[_-]+/g, ' ').replace(/\b\w/g, word => word.toUpperCase());
  return <Card style={s.job}>
    <View style={s.itemHead}>
      <View style={s.serviceIcon}><CoreIcon name="briefcase" color={nativePalette.violetDark} size={19} /></View>
      <View style={s.flex}><Text style={s.itemTitle}>{label}</Text>
        <Text style={s.muted}>{job.scheduled_at ? formatVisitDate(job.scheduled_at, true) : 'Schedule to be confirmed'}</Text></View>
      <Pill tone={state === 'accepted' ? 'success' : state === 'offered' ? 'warning' : 'neutral'}>
        {state.replace(/_/g, ' ')}</Pill>
    </View>
    {job.duration_hours !== null ? <Text style={s.muted}>{job.duration_hours} scheduled hours</Text> : null}
    <Text style={s.muted}>Customer address and access codes are not shown here. Sensitive details require the approved, logged access workflow.</Text>
    {state === 'offered' ? <Pressable accessibilityRole="button" style={s.link}
      onPress={() => void WebBrowser.openBrowserAsync(portal)}>
      <Text style={s.linkText}>Review and respond securely on Xoot web</Text>
      <CoreIcon name="chevron-right" color={nativePalette.violetDark} size={17} />
    </Pressable> : null}
  </Card>;
}
function XooterJobsContent({ userId }: { userId: string }) {
  const [state, setState] = useState<State>({ jobs: [], xooterId: null, loading: true, error: null });
  const [retry, setRetry] = useState(0);
  const reload = useCallback(() => setRetry(current => current + 1), []);
  useEffect(() => {
    let active = true;
    setState({ jobs: [], xooterId: null, loading: true, error: null });
    void (async () => {
      try {
        const { data: account, error: accountError } = await supabase.from('xooters')
          .select('id,user_id').eq('user_id', userId).maybeSingle();
        if (!active) return;
        if (accountError) throw accountError;
        if (!account || account.user_id !== userId) {
          setState({ jobs: [], xooterId: null, loading: false, error: null });
          return;
        }
        const { data, error } = await supabase.functions.invoke('get-xooter-job-cards', { body: {} });
        if (!active) return;
        if (error) throw error;
        const jobs = parseXooterJobCards(data, account.id);
        if (!jobs) throw new Error('Invalid Xooter jobs projection');
        setState({ jobs, xooterId: account.id, loading: false, error: null });
      } catch {
        if (active) setState({ jobs: [], xooterId: null, loading: false,
          error: 'Your verified job offers could not be loaded. Please retry.' });
      }
    })();
    return () => { active = false; };
  }, [userId, retry]);
  const groups = groupXooterJobs(state.jobs);
  return <Screen refreshControl={<RefreshControl refreshing={state.loading} onRefresh={reload} tintColor={nativePalette.violet} />}>
    <View style={s.header}><Pressable accessibilityRole="button" accessibilityLabel="Back to your account"
      style={s.back} onPress={() => router.back()}><CoreIcon name="arrow-left" size={19} /></Pressable>
      <View style={s.flex}><Text style={s.eyebrow}>WORK WITH XOOT</Text><DisplayTitle>My jobs</DisplayTitle></View></View>
    {state.loading ? <LoadingRows /> : state.error
      ? <EmptyState title="Jobs unavailable" detail={state.error} action="Try again" onAction={reload} />
      : !state.xooterId
        ? <EmptyState title="Xooter verification required" detail="This account does not yet have an active Xooter profile. Complete the verified onboarding journey before job offers can appear."
            action="Back to your account" onAction={() => router.push('/account')} />
        : <>
          <Card style={s.hero}><CoreIcon name="briefcase" size={29} color={nativePalette.violetDark} />
            <Text style={s.heroTitle}>Your work, clearly laid out.</Text>
            <Text style={s.muted}>Offers and assignments below come from Xoot's authenticated job service. No demo bookings or invented earnings.</Text></Card>
          <SectionLabel count={groups.offered.length}>New offers</SectionLabel>
          {groups.offered.length ? groups.offered.map(item => <JobCard key={item.job_id} job={item} />)
            : <Text style={s.muted}>No new offers right now.</Text>}
          <SectionLabel count={groups.accepted.length}>Accepted</SectionLabel>
          {groups.accepted.length ? groups.accepted.map(item => <JobCard key={item.job_id} job={item} />)
            : <Text style={s.muted}>No accepted jobs yet.</Text>}
          <SectionLabel count={groups.history.length}>History and updates</SectionLabel>
          {groups.history.length ? groups.history.map(item => <JobCard key={item.job_id} job={item} />)
            : <Text style={s.muted}>Completed, declined and expired offers will appear here as recorded.</Text>}
          <PrimaryAction onPress={() => router.push('/xooter/earnings')} icon="wallet">View earnings</PrimaryAction>
          <Pressable accessibilityRole="button" style={s.link} onPress={() => void WebBrowser.openBrowserAsync(portal)}>
            <Text style={s.linkText}>Open Xooter web workspace</Text>
            <CoreIcon name="chevron-right" size={17} color={nativePalette.violetDark} /></Pressable>
        </>}
  </Screen>;
}
export default function XooterJobsScreen() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Screen><LoadingRows /></Screen>;
  if (!user) return <Screen><DisplayTitle>My jobs</DisplayTitle>
    <EmptyState title="Sign in as a Xooter" detail="Your job offers and assignments are available only to their verified Xooter account."
      action="Sign in" onAction={() => router.push('/account')} /></Screen>;
  // Remount every account switch; no old worker offers survive another sign-in.
  return <XooterJobsContent key={user.id} userId={user.id} />;
}
const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { width: 42, height: 42, borderRadius: 24, borderWidth: 1, borderColor: nativePalette.border,
    backgroundColor: nativePalette.card, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, minWidth: 0 },
  eyebrow: { fontFamily: nativeFonts.bodyBold, color: nativePalette.violetDark, fontSize: 10, letterSpacing: 1.4 },
  hero: { backgroundColor: nativePalette.violetWash, gap: 10, borderRadius: 22 },
  heroTitle: { fontFamily: nativeFonts.displayStrong, color: nativePalette.ink, fontSize: 25 },
  muted: { fontFamily: nativeFonts.body, color: nativePalette.muted, lineHeight: 19, fontSize: 12 },
  job: { gap: 12 },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: 11, flexWrap: 'wrap' },
  serviceIcon: { width: 42, height: 42, borderRadius: 22, backgroundColor: nativePalette.violetWash,
    alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontFamily: nativeFonts.bodyBold, color: nativePalette.ink, fontSize: 14 },
  link: { flexDirection: 'row', minHeight: 48, alignItems: 'center', gap: 8,
    borderTopWidth: 1, borderColor: nativePalette.border, justifyContent: 'space-between' },
  linkText: { color: nativePalette.violetDark, fontFamily: nativeFonts.bodyBold, fontSize: 12, flex: 1 },
});
