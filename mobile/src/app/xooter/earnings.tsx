import { router } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Card, CoreIcon, DisplayTitle, EmptyState, LoadingRows, Pill, PrimaryAction, Screen,
  SectionLabel, nativeFonts, nativePalette,
} from '@/components/native-core';
import { supabase } from '@/lib/supabase';
import {
  getXooterEarningsRow, olderXooterEarningsFilter, startOfNativeEarningsPeriod,
  summariseRecordedEarnings, xooterMoney, XOOTER_EARNINGS_PAGE_SIZE,
  type XooterEarning,
} from '@/lib/native-xooter-ledger';
import { useAuth } from '@/providers/auth-provider';

type Period = 'week' | 'month';
type State = {
  loading: boolean; loadingMore: boolean;
  rows: XooterEarning[]; xooterId: string | null;
  error: string | null; pagingError: string | null; hasMore: boolean;
  from: string; snapshot: string;
};
type Page = { rows: XooterEarning[]; hasMore: boolean };

async function getLedgerPage(args: {
  owner: string; periodStart: string; snapshot: string;
  cursor?: Pick<XooterEarning, 'created_at' | 'id'>;
}): Promise<Page> {
  let query = supabase.from('xooter_earnings')
    .select('id,xooter_id,booking_id,net_amount,gross_amount,platform_fee,status,created_at')
    .eq('xooter_id', args.owner)
    .gte('created_at', args.periodStart)
    .lte('created_at', args.snapshot)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(XOOTER_EARNINGS_PAGE_SIZE + 1);

  if (args.cursor) {
    const filter = olderXooterEarningsFilter(args.cursor);
    if (!filter) throw new Error('Invalid earnings page cursor');
    query = query.or(filter);
  }
  const { data, error } = await query;
  if (error || !data) throw new Error('Earnings retrieval failed');
  const parsed = data.map(row => getXooterEarningsRow(row, args.owner));
  if (parsed.some(row => row === null)) throw new Error('Unverifiable earnings amount or record');
  const rows = parsed as XooterEarning[];
  return { rows: rows.slice(0, XOOTER_EARNINGS_PAGE_SIZE), hasMore: rows.length > XOOTER_EARNINGS_PAGE_SIZE };
}

function EarningHistory({ userId, period, setPeriod }: {
  userId: string; period: Period; setPeriod: (value: Period) => void;
}) {
  const [state, setState] = useState<State>({
    loading: true, loadingMore: false, rows: [], xooterId: null,
    error: null, pagingError: null, hasMore: false, from: '', snapshot: '',
  });
  const [retry, setRetry] = useState(0);
  const epoch = useRef(0);
  const reload = useCallback(() => setRetry(count => count + 1), []);

  useEffect(() => {
    const requestId = ++epoch.current;
    const snapshot = new Date().toISOString();
    const from = startOfNativeEarningsPeriod(period, new Date(snapshot));
    setState({
      loading: true, loadingMore: false, rows: [], xooterId: null,
      error: null, pagingError: null, hasMore: false, snapshot, from,
    });
    void (async () => {
      try {
        const { data: profile, error: profileError } = await supabase.from('xooters')
          .select('id,user_id').eq('user_id', userId).maybeSingle();
        if (epoch.current !== requestId) return;
        if (profileError) throw profileError;
        if (!profile || profile.user_id !== userId) {
          setState(previous => ({ ...previous, loading: false, xooterId: null }));
          return;
        }
        const first = await getLedgerPage({ owner: profile.id, periodStart: from, snapshot });
        if (epoch.current !== requestId) return;
        setState({
          loading: false, loadingMore: false, rows: first.rows,
          xooterId: profile.id, error: null, pagingError: null,
          hasMore: first.hasMore, from, snapshot,
        });
      } catch {
        if (epoch.current === requestId) setState(previous => ({
          ...previous, loading: false, xooterId: null,
          error: 'Your recorded earnings could not be verified. Please retry.',
        }));
      }
    })();
    return () => { epoch.current += 1; };
  }, [period, retry, userId]);

  const loadMore = async () => {
    if (state.loading || state.loadingMore || !state.hasMore || !state.xooterId) return;
    const tail = state.rows[state.rows.length - 1];
    if (!tail) return;
    const requestId = epoch.current;
    setState(previous => ({ ...previous, loadingMore: true, pagingError: null }));
    try {
      const next = await getLedgerPage({
        owner: state.xooterId, periodStart: state.from, snapshot: state.snapshot, cursor: tail,
      });
      if (epoch.current !== requestId) return;
      // Defensive deduplication if a server page overlaps a previously displayed entry.
      setState(previous => {
        const seen = new Set(previous.rows.map(row => row.id));
        const appended = next.rows.filter(row => !seen.has(row.id));
        const combined = [...previous.rows, ...appended];
        // A non-advancing cursor is an error, not an infinite "Load more" loop.
        if (!appended.length && next.hasMore) return {
          ...previous, loadingMore: false, pagingError: 'Earnings history could not advance. Refresh to try again.',
        };
        return {
          ...previous, loadingMore: false, pagingError: null, rows: combined, hasMore: next.hasMore,
        };
      });
    } catch {
      if (epoch.current === requestId) setState(previous => ({
        ...previous, loadingMore: false,
        pagingError: 'Older earnings could not be loaded. Try again.',
      }));
    }
  };
  const totals = useMemo(() => summariseRecordedEarnings(state.rows), [state.rows]);
  return <Screen refreshControl={<RefreshControl refreshing={state.loading} onRefresh={reload} tintColor={nativePalette.violet} />}>
    <View style={s.header}><Pressable accessibilityLabel="Back to Xooter jobs" accessibilityRole="button"
      style={s.back} onPress={() => router.back()}><CoreIcon name="arrow-left" size={19} /></Pressable>
      <View style={s.flex}><Text style={s.eyebrow}>XOOTER WORKSPACE</Text><DisplayTitle>Earnings</DisplayTitle></View></View>
    <Text style={s.description}>Money and work are separate from badges. These figures come from your recorded Xoot earnings ledger, not bank settlement.</Text>
    <View accessibilityRole="tablist" style={s.tabs}>
      {(['week', 'month'] as const).map(value => <Pressable accessibilityRole="tab"
        accessibilityState={{ selected: period === value }} key={value} onPress={() => setPeriod(value)}
        style={[s.tab, period === value && s.tabSelected]}>
        <Text style={[s.tabText, period === value && s.tabTextSelected]}>
          {value === 'week' ? 'Last 7 days' : 'Last 30 days'}</Text></Pressable>)}
    </View>
    {state.loading ? <LoadingRows /> : state.error
      ? <EmptyState title="Earnings unavailable" detail={state.error} action="Try again" onAction={reload} />
      : !state.xooterId ? <EmptyState title="Xooter verification required"
          detail="This account does not yet have a Xooter earnings profile."
          action="Back to jobs" onAction={() => router.push('/xooter/jobs')} />
      : <>
        <Card style={s.hero}>
          <Text style={s.heroLabel}>Recorded net · {period === 'week' ? '7 days' : '30 days'}</Text>
          <Text style={s.heroMoney}>{xooterMoney(totals.recordedNet)}</Text>
          <Text style={s.heroCaption}>{state.hasMore
            ? 'Partial sum of records loaded so far. Load older entries for the complete period.'
            : 'All available period entries loaded; not proof of bank settlement.'}</Text>
          <View style={s.pillRow}><Pill tone="warning">Pending shown: {xooterMoney(totals.pendingNet)}</Pill>
            <Pill>{totals.entries} entries loaded</Pill></View>
        </Card>
        <SectionLabel count={totals.entries}>Recorded earnings</SectionLabel>
        {state.rows.length === 0 ? <Card style={s.entry}><Text style={s.description}>
          No earnings recorded for this period.</Text></Card>
          : state.rows.map(row => <Card key={row.id} style={s.entry}>
            <View style={s.entryHead}><View style={s.flex}>
              <Text style={s.entryTitle}>{row.booking_id ? 'Cleaning job' : 'Earnings ledger entry'}</Text>
              <Text style={s.small}>{new Intl.DateTimeFormat('en-ZA', {
                day: 'numeric', month: 'short', year: 'numeric',
              }).format(new Date(row.created_at))}</Text>
            </View><Text style={s.amount}>{xooterMoney(row.net_amount)}</Text></View>
            <View style={s.breakdown}><Text style={s.small}>Gross {xooterMoney(row.gross_amount)}</Text>
              <Text style={s.small}>Platform fee {xooterMoney(row.platform_fee)}</Text></View>
            <Text style={s.small}>Recorded status: {row.status.replace(/[_-]/g, ' ')}</Text>
          </Card>)}
        {state.pagingError ? <Text accessibilityRole="alert" style={s.pagingError}>{state.pagingError}</Text> : null}
        {state.hasMore ? <Pressable accessibilityRole="button" accessibilityState={{ disabled: state.loadingMore }}
          disabled={state.loadingMore} onPress={() => void loadMore()} style={s.loadMore}>
          {state.loadingMore ? <ActivityIndicator color={nativePalette.violet} /> : null}
          <Text style={s.loadText}>{state.loadingMore ? 'Loading older entries…' : 'Load older earnings'}</Text>
          <CoreIcon name="chevron-right" color={nativePalette.violetDark} size={16} />
        </Pressable> : null}
        <Card style={s.notice}><CoreIcon name="shield" color={nativePalette.sageInk} size={20} />
          <View style={s.flex}><Text style={s.entryTitle}>Payout verification</Text>
            <Text style={s.description}>Recorded earnings and pending status are not proof of cleared funds. Payouts, transfer dates and receipts require separate provider verification.</Text></View>
        </Card>
        <PrimaryAction icon="briefcase" onPress={() => router.push('/xooter/jobs')}>Return to jobs</PrimaryAction>
      </>}
  </Screen>;
}
export default function XooterEarningsScreen() {
  const { user, isLoading } = useAuth();
  const [period, setPeriod] = useState<Period>('week');
  if (isLoading) return <Screen><LoadingRows /></Screen>;
  if (!user) return <Screen><DisplayTitle>Earnings</DisplayTitle><EmptyState title="Sign in to see your earnings"
    detail="Only the account that owns Xooter earnings can view their ledger."
    action="Sign in" onAction={() => router.push('/account')} /></Screen>;
  // Recreate the page (and abort stale requests) on account OR period changes.
  return <EarningHistory key={`${user.id}:${period}`} userId={user.id} period={period} setPeriod={setPeriod} />;
}
const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { width: 42, height: 42, borderRadius: 23, borderWidth: 1, borderColor: nativePalette.border,
    backgroundColor: nativePalette.card, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, minWidth: 0 },
  eyebrow: { fontFamily: nativeFonts.bodyBold, color: nativePalette.violetDark, fontSize: 10, letterSpacing: 1.4 },
  description: { fontFamily: nativeFonts.body, color: nativePalette.inkSoft, fontSize: 12, lineHeight: 19 },
  tabs: { flexDirection: 'row', backgroundColor: nativePalette.sunken, borderRadius: 26, padding: 4, gap: 5 },
  tab: { minHeight: 43, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  tabSelected: { backgroundColor: nativePalette.card, borderWidth: 1, borderColor: nativePalette.border },
  tabText: { fontFamily: nativeFonts.bodyBold, fontSize: 13, color: nativePalette.muted },
  tabTextSelected: { color: nativePalette.ink },
  hero: { backgroundColor: nativePalette.ink, borderWidth: 0, padding: 23, gap: 11 },
  heroLabel: { color: nativePalette.borderStrong, fontFamily: nativeFonts.bodyBold, fontSize: 12, letterSpacing: 1 },
  heroMoney: { color: nativePalette.card, fontFamily: nativeFonts.displayStrong, fontSize: 35 },
  heroCaption: { color: nativePalette.borderStrong, fontFamily: nativeFonts.body, fontSize: 12, lineHeight: 19 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  entry: { gap: 9 },
  entryHead: { flexDirection: 'row', gap: 13, alignItems: 'center' },
  entryTitle: { color: nativePalette.ink, fontFamily: nativeFonts.bodyBold, fontSize: 14 },
  small: { color: nativePalette.muted, fontFamily: nativeFonts.body, fontSize: 12 },
  amount: { color: nativePalette.ink, fontFamily: nativeFonts.displayStrong, fontSize: 19 },
  breakdown: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 },
  pagingError: { color: nativePalette.blushInk, fontFamily: nativeFonts.body, fontSize: 12 },
  loadMore: { borderRadius: 22, borderWidth: 1, borderColor: nativePalette.border, minHeight: 49,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9, backgroundColor: nativePalette.card },
  loadText: { fontFamily: nativeFonts.bodyBold, color: nativePalette.violetDark, fontSize: 13 },
  notice: { backgroundColor: nativePalette.sageWash, flexDirection: 'row', gap: 12 },
});
