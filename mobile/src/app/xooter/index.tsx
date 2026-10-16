import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import {
  Card, CoreIcon, DisplayTitle, EmptyState, LoadingRows, Pill, PrimaryAction, Screen,
  SectionLabel, formatVisitDate, nativeFonts, nativePalette,
} from '@/components/native-core';
import { supabase } from '@/lib/supabase';
import { isXooterJobId, parseXooterJobCards, type XooterJobCard } from '@/lib/native-xooter-ledger';
import {
  hasVerifiedXooterHomeAccess, readXooterHomeProfile, xooterHomeSnapshot,
  type XooterHomeProfile,
} from '@/lib/native-xooter-dashboard';
import { useAuth } from '@/providers/auth-provider';

type HomeState = {
  loading: boolean;
  profile: XooterHomeProfile | null;
  jobs: XooterJobCard[];
  error: string | null;
};

function Shortcut({ title, subtitle, icon, onPress }: {
  title: string; subtitle: string; icon: 'briefcase' | 'wallet' | 'shield' | 'trophy';
  onPress: () => void;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`${title}. ${subtitle}`}
    onPress={onPress} style={({ pressed }) => [styles.shortcut, pressed && styles.pressed]}>
    <View style={styles.shortcutIcon}><CoreIcon name={icon} color={nativePalette.violetDark} size={23}/></View>
    <View style={styles.flex}><Text style={styles.shortcutTitle}>{title}</Text>
      <Text style={styles.subtle}>{subtitle}</Text></View>
    <CoreIcon name="chevron-right" color={nativePalette.muted} size={19}/>
  </Pressable>;
}

function XooterHomeForAccount({ userId, firstName }: { userId: string; firstName: string | null }) {
  const [state, setState] = useState<HomeState>({ loading: true, profile: null, jobs: [], error: null });
  const [refreshVersion, setRefreshVersion] = useState(0);
  const retry = useCallback(() => setRefreshVersion(version => version + 1), []);
  useEffect(() => {
    let current = true;
    setState({ loading: true, profile: null, jobs: [], error: null });
    void (async () => {
      try {
        const { data, error } = await supabase.from('xooters')
          .select('id,user_id,active,background_check_status').eq('user_id', userId).maybeSingle();
        if (!current) return;
        if (error) throw error;
        if (!data) {
          setState({ loading: false, profile: null, jobs: [], error: null });
          return;
        }
        const profile = readXooterHomeProfile(data, userId);
        if (!profile) throw new Error('Unverified Xooter profile projection');
        if (!hasVerifiedXooterHomeAccess(profile)) {
          setState({ loading: false, profile, jobs: [], error: null });
          return;
        }
        const { data: jobResult, error: jobError } = await supabase.functions.invoke('get-xooter-job-cards', {
          body: {},
        });
        if (!current) return;
        if (jobError) throw jobError;
        const jobs = parseXooterJobCards(jobResult, profile.id);
        if (!jobs) throw new Error('Unverified Xooter job projection');
        setState({ loading: false, profile, jobs, error: null });
      } catch {
        if (current) setState({
          loading: false, profile: null, jobs: [],
          error: 'Your Xooter dashboard could not be verified. Please try again.',
        });
      }
    })();
    return () => { current = false; };
  }, [userId, refreshVersion]);

  const summary = xooterHomeSnapshot(state.jobs);
  const eligible = state.profile && hasVerifiedXooterHomeAccess(state.profile);

  return <Screen contentStyle={styles.screen} refreshControl={
    <RefreshControl refreshing={state.loading} onRefresh={retry} tintColor={nativePalette.violet} />}>
    <View style={styles.top}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to account"
        onPress={() => router.back()} style={styles.back}>
        <CoreIcon name="arrow-left" size={20}/>
      </Pressable>
      <View style={styles.flex}>
        <Text style={styles.eyebrow}>XOOTER WORKSPACE</Text>
        <DisplayTitle>{firstName ? `Hello, ${firstName}` : 'Your Xoot day'}</DisplayTitle>
      </View>
    </View>
    <Text style={styles.intro}>Real assignments, verified activity and the tools to help you do your best work.</Text>

    {state.loading ? <LoadingRows /> : state.error
      ? <EmptyState title="Workspace unavailable" detail={state.error} action="Try again" onAction={retry}/>
      : !eligible ? <Card style={styles.eligibility}>
          <View style={styles.eligibilityHeader}>
            <CoreIcon name="shield" color={nativePalette.violetDark} size={27}/>
            <Pill tone="warning">{state.profile ? 'Verification or activation pending' : 'Application not found'}</Pill>
          </View>
          <Text style={styles.heroTitle}>Your Xooter journey starts here.</Text>
          <Text style={styles.subtle}>Job offers appear only after the appropriate verification and activation. An existing profile alone does not confirm that you can accept work.</Text>
          <PrimaryAction onPress={() => router.push('/xooter/kyc')}>Check verification</PrimaryAction>
          <Pressable accessibilityRole="button" style={styles.inlineLink}
            onPress={() => router.push('/xooter/training')}>
            <Text style={styles.inlineText}>Explore required training</Text>
            <CoreIcon name="chevron-right" color={nativePalette.violetDark} size={17}/>
          </Pressable>
        </Card>
      : <>
        <Card style={styles.hero}>
          <View style={styles.heroHeading}>
            <View style={styles.heroBadge}><CoreIcon name="briefcase" color={nativePalette.violetDark} size={25}/></View>
            <Pill tone="success">Verified Xooter</Pill>
          </View>
          <Text style={styles.heroTitle}>A clear view of your next clean.</Text>
          {summary.next ? <>
            <Text style={styles.heroVisit}>{(summary.next.service_type ?? summary.next.service ?? 'Cleaning visit')
              .replace(/[_-]+/g, ' ').replace(/\b\w/g, value => value.toUpperCase())}</Text>
            <Text style={styles.subtle}>
              {summary.next.scheduled_at ? formatVisitDate(summary.next.scheduled_at, true) : 'Time to be confirmed'}
            </Text>
            {isXooterJobId(summary.next.job_id) ? <Pressable accessibilityRole="button"
              style={styles.nextLink} onPress={() => router.push({
                pathname: '/xooter/job/[id]', params: { id: summary.next!.job_id },
              })}>
              <Text style={styles.nextLinkText}>View assigned job</Text>
              <CoreIcon name="chevron-right" color={nativePalette.violetDark} size={19}/>
            </Pressable> : null}
          </> : <Text style={styles.subtle}>No upcoming accepted job has a confirmed schedule. Check offers and assignments for updates.</Text>}
        </Card>

        <View style={styles.metricRow}>
          <View style={styles.metric}><Text style={styles.metricNumber}>{summary.offers}</Text>
            <Text style={styles.metricLabel}>New offers</Text></View>
          <View style={styles.metric}><Text style={styles.metricNumber}>{summary.accepted}</Text>
            <Text style={styles.metricLabel}>Accepted jobs</Text></View>
          <View style={styles.metric}><Text style={styles.metricNumber}>{summary.today.length}</Text>
            <Text style={styles.metricLabel}>Today, SAST</Text></View>
        </View>
        <SectionLabel count={summary.today.length}>Today's scheduled visits</SectionLabel>
        {summary.today.length ? summary.today.map(job =>
          <Pressable key={job.job_id} disabled={!isXooterJobId(job.job_id)}
            accessibilityRole="button" accessibilityLabel="View today's assigned Xooter job"
            onPress={() => router.push({ pathname: '/xooter/job/[id]', params: { id: job.job_id } })}>
            <Card style={styles.job}>
              <View style={styles.flex}><Text style={styles.shortcutTitle}>{
                (job.service_type ?? job.service ?? 'Cleaning visit').replace(/[_-]+/g, ' ')}</Text>
                <Text style={styles.subtle}>{job.scheduled_at ? formatVisitDate(job.scheduled_at, true) : 'Time to be confirmed'}</Text></View>
              <CoreIcon name="chevron-right" color={nativePalette.violetDark} size={19}/>
            </Card>
          </Pressable>)
          : <Card style={styles.emptyToday}><Text style={styles.subtle}>
            No accepted jobs are scheduled for today. Upcoming work will appear only when the assignment is confirmed.</Text></Card>}
      </>}

    <SectionLabel>Your Xooter tools</SectionLabel>
    <Card style={styles.shortcuts}>
      <Shortcut title="Jobs and offers" subtitle="See current assignments and history"
        icon="briefcase" onPress={() => router.push('/xooter/jobs')}/>
      <Shortcut title="Earnings" subtitle="Recorded earnings, not bank payout receipts"
        icon="wallet" onPress={() => router.push('/xooter/earnings')}/>
      <Shortcut title="Verification" subtitle="Application and document status"
        icon="shield" onPress={() => router.push('/xooter/kyc')}/>
      <Shortcut title="Training" subtitle="Required and optional modules"
        icon="trophy" onPress={() => router.push('/xooter/training')}/>
      <Shortcut title="Growth and badges" subtitle="Recorded recognition, separate from pay"
        icon="trophy" onPress={() => router.push('/xooter/growth')}/>
    </Card>
    <Text style={styles.footnote}>Customer addresses, access codes, worker bank details, payout confirmation and live GPS tracking are never shown without their separate authorised workflows.</Text>
  </Screen>;
}

export default function XooterHomeScreen() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Screen><LoadingRows/></Screen>;
  if (!user) return <Screen><DisplayTitle>Xooter workspace</DisplayTitle>
    <EmptyState title="Sign in to see your Xooter workspace"
      detail="Your jobs, verification and earnings belong to your protected worker account."
      action="Sign in" onAction={() => router.push('/account')}/></Screen>;
  const name = typeof user.user_metadata?.full_name === 'string'
    ? user.user_metadata.full_name.trim().split(/\s+/)[0] : null;
  return <XooterHomeForAccount key={user.id} userId={user.id} firstName={name || null}/>;
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 80, gap: 14 },
  top: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  back: { borderWidth: 1, borderColor: nativePalette.border, width: 42, height: 42,
    borderRadius: 23, justifyContent: 'center', alignItems: 'center', backgroundColor: nativePalette.card },
  flex: { flex: 1, minWidth: 0 },
  eyebrow: { color: nativePalette.violetDark, letterSpacing: 1.4, fontSize: 10, fontFamily: nativeFonts.bodyBold },
  intro: { fontSize: 13, lineHeight: 20, color: nativePalette.inkSoft, fontFamily: nativeFonts.body },
  hero: { gap: 14, backgroundColor: nativePalette.violetWash, borderRadius: 24, padding: 22 },
  heroHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  heroBadge: { borderRadius: 16, backgroundColor: nativePalette.card, height: 50, width: 50,
    justifyContent: 'center', alignItems: 'center' },
  heroTitle: { fontFamily: nativeFonts.displayStrong, fontSize: 25, color: nativePalette.ink },
  heroVisit: { fontFamily: nativeFonts.bodyBold, fontSize: 15, color: nativePalette.ink },
  subtle: { color: nativePalette.inkSoft, fontSize: 12, lineHeight: 19, fontFamily: nativeFonts.body },
  nextLink: { flexDirection: 'row', justifyContent: 'space-between', minHeight: 44,
    alignItems: 'center', borderTopWidth: 1, borderColor: nativePalette.border, paddingTop: 9 },
  nextLinkText: { fontFamily: nativeFonts.bodyBold, color: nativePalette.violetDark, fontSize: 13 },
  metricRow: { flexDirection: 'row', gap: 9 },
  metric: { backgroundColor: nativePalette.card, borderRadius: 16, borderWidth: 1,
    borderColor: nativePalette.border, flex: 1, alignItems: 'center', gap: 6, padding: 13 },
  metricNumber: { fontFamily: nativeFonts.displayStrong, fontSize: 27, color: nativePalette.ink },
  metricLabel: { color: nativePalette.muted, fontSize: 11, fontFamily: nativeFonts.body, textAlign: 'center' },
  job: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  emptyToday: { backgroundColor: nativePalette.sunken },
  shortcuts: { padding: 0 },
  shortcut: { minHeight: 75, borderBottomWidth: 1, borderColor: nativePalette.border,
    flexDirection: 'row', alignItems: 'center', gap: 13, padding: 15 },
  shortcutIcon: { backgroundColor: nativePalette.violetWash, width: 43, height: 43,
    borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  shortcutTitle: { fontFamily: nativeFonts.bodyBold, fontSize: 14, color: nativePalette.ink },
  pressed: { opacity: 0.72 },
  eligibility: { gap: 15, backgroundColor: nativePalette.sunken, padding: 21 },
  eligibilityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  inlineLink: { minHeight: 42, flexDirection: 'row', gap: 8, alignItems: 'center' },
  inlineText: { color: nativePalette.violetDark, fontSize: 13, fontFamily: nativeFonts.bodyBold },
  footnote: { color: nativePalette.muted, fontFamily: nativeFonts.body, lineHeight: 18, fontSize: 11 },
});
