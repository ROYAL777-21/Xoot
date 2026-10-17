import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Card, CoreIcon, DisplayTitle, EmptyState, Pill, PrimaryAction, Screen,
  formatVisitDate, nativeFonts, nativePalette,
} from '@/components/native-core';
import { isXooterJobId, parseXooterJobCards, type XooterJobCard } from '@/lib/native-xooter-ledger';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { PrivateJobLocationPublisher } from '@/components/private-job-location-publisher';
import { PrivateWorkerDirections } from '@/components/private-worker-directions';

const JOB_WORKSPACE = 'https://xoot.co.za/xooter/jobs';
type JobDetailState = {
  loading: boolean;
  error: string | null;
  job: XooterJobCard | null;
  hasXooterProfile: boolean;
};

function XooterJobDetail({ userId, jobId }: { userId: string; jobId: string }) {
  const [state, setState] = useState<JobDetailState>({
    loading: true, error: null, job: null, hasXooterProfile: false,
  });
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    setState({ loading: true, error: null, job: null, hasXooterProfile: false });
    void (async () => {
      try {
        const { data: owner, error: ownerError } = await supabase.from('xooters')
          .select('id,user_id').eq('user_id', userId).maybeSingle();
        if (!active) return;
        if (ownerError) throw ownerError;
        if (!owner || owner.user_id !== userId) {
          setState({ loading: false, error: null, job: null, hasXooterProfile: false });
          return;
        }
        // The server itself authenticates the caller. Never fetch jobs by a
        // publicly supplied booking ID or expose the privileged destination field.
        const { data, error } = await supabase.functions.invoke('get-xooter-job-cards', { body: {} });
        if (!active) return;
        if (error) throw error;
        const jobs = parseXooterJobCards(data, owner.id);
        if (!jobs) throw new Error('Invalid owner-scoped job projection');
        setState({
          loading: false, error: null, job: jobs.find(job => job.job_id === jobId) ?? null,
          hasXooterProfile: true,
        });
      } catch {
        if (active) setState({
          loading: false, error: 'We could not verify this job. Please retry.',
          job: null, hasXooterProfile: false,
        });
      }
    })();
    return () => { active = false; };
  }, [userId, jobId, refresh]);

  const job = state.job;
  const label = job
    ? (job.service_type ?? job.service ?? 'Cleaning service').replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, letter => letter.toUpperCase())
    : null;
  const accepted = job?.state === 'accepted';
  const offered = job?.state === 'offered';
  const status = (job?.state ?? '').replace(/[_-]+/g, ' ');
  return <Screen contentStyle={s.screen}>
    <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to Xooter jobs"
        style={s.back} onPress={() => router.back()}>
        <CoreIcon name="arrow-left" size={19} />
      </Pressable>
      <View style={s.flex}><Text style={s.eyebrow}>XOOTER WORKSPACE</Text>
        <DisplayTitle>Job details</DisplayTitle></View>
    </View>
    {state.loading ? <View style={s.loading}><ActivityIndicator color={nativePalette.violet} />
      <Text style={s.muted}>Checking the latest job information…</Text></View>
      : state.error
        ? <EmptyState title="Job unavailable" detail={state.error}
            action="Try again" onAction={() => setRefresh(value => value + 1)} />
        : !state.hasXooterProfile
          ? <EmptyState title="Xooter verification required"
              detail="This account does not have a verified Xooter job profile."
              action="Back to jobs" onAction={() => router.replace('/xooter/jobs')} />
          : !job ? <EmptyState title="Job not available"
              detail="This offer is missing, expired, or does not belong to your Xooter account."
              action="Back to jobs" onAction={() => router.replace('/xooter/jobs')} />
            : <>
              <Card style={s.hero}>
                <View style={s.heroHeader}><CoreIcon name="briefcase" color={nativePalette.violetDark} size={26} />
                  <Pill tone={accepted ? 'success' : offered ? 'warning' : 'neutral'}>{status}</Pill></View>
                <Text style={s.title}>{label}</Text>
                <Text style={s.muted}>{offered ? 'An offer for your review' :
                  accepted ? 'Recorded as accepted' : 'Recorded job history'}</Text>
              </Card>
              <Text style={s.section}>Your schedule</Text>
              <Card style={s.facts}>
                <View style={s.fact}><CoreIcon name="calendar" color={nativePalette.violet} size={19} />
                  <View style={s.flex}><Text style={s.factTitle}>Visit date and time</Text>
                    <Text style={s.muted}>{job.scheduled_at ? formatVisitDate(job.scheduled_at, true) :
                      'To be confirmed by Xoot'}</Text></View>
                </View>
                <View style={s.fact}><CoreIcon name="briefcase" color={nativePalette.violet} size={19} />
                  <View style={s.flex}><Text style={s.factTitle}>Expected duration</Text>
                    <Text style={s.muted}>{job.duration_hours !== null ?
                      `${job.duration_hours} scheduled hours` : 'Not yet confirmed'}</Text></View>
                </View>
              </Card>
              {/* Owner-only job cards are checked by get-xooter-job-cards; the Edge
                  publisher independently verifies the accepted job and worker.
                  Never show this for offers, completed or revoked visits. */}
              {accepted && ['en_route', 'enroute'].includes(job.status ?? '') &&
                <>
                  <PrivateJobLocationPublisher bookingId={job.booking_id} />
                  <PrivateWorkerDirections jobId={job.job_id} bookingId={job.booking_id} />
                </>}
              <Text style={s.section}>Address and household access</Text>
              <Card style={s.notice}>
                <CoreIcon name="shield" color={nativePalette.sageInk} size={22} />
                <View style={s.flex}><Text style={s.factTitle}>Private until authorised</Text>
                  <Text style={s.muted}>Customer addresses and entry codes are available only through the
                    approved Xoot web workspace and its time-limited, logged access process.</Text>
                  <Text style={s.muted}>No access details are stored or cached in this native job screen.</Text>
                </View>
              </Card>
              <Text style={s.section}>Payment and task status</Text>
              <Card style={s.facts}><Text style={s.muted}>Job offers are not payout statements.
                Worker earnings, final task verification and payment settlement
                must be confirmed from their separate authorised records.</Text></Card>
              <PrimaryAction icon="briefcase" onPress={() => void WebBrowser.openBrowserAsync(JOB_WORKSPACE)}>
                {offered ? 'Review this offer securely' : 'Open Xooter job workspace'}
              </PrimaryAction>
              <Pressable accessibilityRole="button" style={s.link}
                onPress={() => router.push('/xooter/earnings')}>
                <Text style={s.linkText}>See recorded earnings</Text>
                <CoreIcon name="chevron-right" color={nativePalette.violetDark} size={18} />
              </Pressable>
            </>}
  </Screen>;
}
export default function XooterJobDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const { user, isLoading } = useAuth();
  if (isLoading) return <Screen><ActivityIndicator color={nativePalette.violet} /></Screen>;
  if (!user) return <Screen><EmptyState title="Sign in to see this job"
    detail="Xooter job information belongs to the worker's authenticated account."
    action="Sign in" onAction={() => router.push('/account')} /></Screen>;
  if (!isXooterJobId(params.id)) return <Screen><EmptyState title="Invalid job link"
    detail="Choose a job from your own offers and assignments."
    action="Back to jobs" onAction={() => router.replace('/xooter/jobs')} /></Screen>;
  // All owner-scoped job state disappears on account or job route change.
  return <XooterJobDetail key={`${user.id}:${params.id}`} userId={user.id} jobId={params.id} />;
}
const s = StyleSheet.create({
  screen: { paddingBottom: 70, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  flex: { flex: 1, minWidth: 0 },
  eyebrow: { fontFamily: nativeFonts.bodyBold, letterSpacing: 1.3, fontSize: 10, color: nativePalette.violetDark },
  back: { width: 42, height: 42, borderRadius: 23, backgroundColor: nativePalette.card,
    borderWidth: 1, borderColor: nativePalette.border, alignItems: 'center', justifyContent: 'center' },
  loading: { alignItems: 'center', justifyContent: 'center', gap: 13, padding: 34 },
  hero: { backgroundColor: nativePalette.violetWash, gap: 12, borderRadius: 25, padding: 22 },
  heroHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { fontFamily: nativeFonts.displayStrong, fontSize: 28, color: nativePalette.ink },
  muted: { fontFamily: nativeFonts.body, fontSize: 13, lineHeight: 20, color: nativePalette.inkSoft },
  section: { fontFamily: nativeFonts.displayStrong, fontSize: 22, color: nativePalette.ink, marginTop: 3 },
  facts: { gap: 16 },
  fact: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  factTitle: { fontFamily: nativeFonts.bodyBold, fontSize: 13, color: nativePalette.ink },
  notice: { backgroundColor: nativePalette.sageWash, flexDirection: 'row', gap: 11 },
  link: { flexDirection: 'row', minHeight: 46, alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 12 },
  linkText: { fontFamily: nativeFonts.bodyBold, color: nativePalette.violetDark, fontSize: 13 },
});
