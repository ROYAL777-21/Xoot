import { router } from 'expo-router';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Card, CoreIcon, DisplayTitle, EmptyState, LoadingRows, Pill, PrimaryAction, Screen,
  SectionLabel, nativeFonts, nativePalette,
} from '@/components/native-core';
import { supabase } from '@/lib/supabase';
import {
  getXooterEarningsRow, startOfNativeEarningsPeriod, summariseRecordedEarnings,
  xooterMoney, type XooterEarning,
} from '@/lib/native-xooter-ledger';
import { useAuth } from '@/providers/auth-provider';

type Period = 'week' | 'month';
type State = { period: Period; loading: boolean; rows: XooterEarning[]; xooterId: string | null; error: string | null; limited: boolean };
function EarningHistory({ userId }: { userId: string }) {
  const [period, setPeriod] = useState<Period>('week');
  const [state, setState] = useState<State>({ period, loading: true, rows: [], xooterId: null, error: null, limited: false });
  const [retry, setRetry] = useState(0);
  const reload = useCallback(() => setRetry(count => count + 1), []);
  useEffect(() => {
    let active = true;
    setState({ period, loading: true, rows: [], xooterId: null, error: null, limited: false });
    void (async () => {
      try {
        const { data: profile, error: profileError } = await supabase.from('xooters')
          .select('id,user_id').eq('user_id', userId).maybeSingle();
        if (!active) return;
        if (profileError) throw profileError;
        if (!profile || profile.user_id !== userId) {
          setState({ period, loading: false, rows: [], xooterId: null, error: null, limited: false });
          return;
        }
        const { data, error } = await supabase.from('xooter_earnings')
          .select('id,xooter_id,booking_id,net_amount,gross_amount,platform_fee,status,created_at')
          .eq('xooter_id', profile.id)
          .gte('created_at', startOfNativeEarningsPeriod(period))
          .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(101);
        if (!active) return;
        if (error) throw error;
        if (!data) throw new Error('No earnings response');
        const earnings = data.map(row => getXooterEarningsRow(row, profile.id));
        if (earnings.some(row => row === null)) throw new Error('Malformed earnings record');
        const visible = earnings.slice(0, 100) as XooterEarning[];
        setState({ period, loading: false, rows: visible, xooterId: profile.id, error: null, limited: data.length > 100 });
      } catch {
        if (active) setState({ period, loading: false, rows: [], xooterId: null,
          error: 'Your recorded earnings could not be verified. Please retry.', limited: false });
      }
    })();
    return () => { active = false; };
  }, [period, retry, userId]);

  // A tab change must never show the previous period's ledger under a new label
  // before the refresh effect has run.
  const displayed = state.period === period ? state : { ...state, loading: true, rows: [], xooterId: null, error: null, limited: false };
  const totals = useMemo(() => summariseRecordedEarnings(displayed.rows), [displayed.rows]);
  return <Screen refreshControl={<RefreshControl refreshing={displayed.loading} onRefresh={reload} tintColor={nativePalette.violet} />}>
    <View style={s.header}><Pressable accessibilityLabel="Back to Xooter jobs" accessibilityRole="button"
      style={s.back} onPress={() => router.back()}><CoreIcon name="arrow-left" size={19} /></Pressable>
      <View style={s.flex}><Text style={s.eyebrow}>XOOTER WORKSPACE</Text><DisplayTitle>Earnings</DisplayTitle></View></View>
    <Text style={s.description}>Money and work are separate from badges. Figures below come from your recorded Xoot earnings ledger, not an estimated payout.</Text>
    <View accessibilityRole="tablist" style={s.tabs}>
      {(['week', 'month'] as const).map(value => <Pressable accessibilityRole="tab"
        accessibilityState={{ selected: period === value }} key={value} onPress={() => setPeriod(value)}
        style={[s.tab, period === value && s.tabSelected]}>
        <Text style={[s.tabText, period === value && s.tabTextSelected]}>
          {value === 'week' ? 'Last 7 days' : 'Last 30 days'}</Text></Pressable>)}
    </View>
    {displayed.loading ? <LoadingRows /> : displayed.error
      ? <EmptyState title="Earnings unavailable" detail={displayed.error} action="Try again" onAction={reload} />
      : !displayed.xooterId ? <EmptyState title="Xooter verification required" detail="This account does not yet have a Xooter earnings profile."
          action="Back to jobs" onAction={() => router.push('/xooter/jobs')} />
      : <>
        <Card style={s.hero}>
          <Text style={s.heroLabel}>Recorded net · {period === 'week' ? '7 days' : '30 days'}</Text>
          <Text style={s.heroMoney}>{xooterMoney(totals.recordedNet)}</Text>
          <Text style={s.heroCaption}>{displayed.limited
            ? 'Partial sum — only the latest 100 entries are shown. This is not your full period total.'
            : 'Recorded net amounts; not proof of bank settlement or cleared funds.'}</Text>
          <View style={s.pillRow}><Pill tone="warning">Pending {xooterMoney(totals.pendingNet)}</Pill>
            <Pill>{totals.entries} ledger entries shown</Pill></View>
        </Card>
        <SectionLabel count={totals.entries}>Recent entries</SectionLabel>
        {displayed.rows.length === 0 ? <Card style={s.entry}><Text style={s.description}>
          No earnings recorded for this period.</Text></Card>
        : displayed.rows.map(row => <Card key={row.id} style={s.entry}>
          <View style={s.entryHead}><View style={s.flex}>
            <Text style={s.entryTitle}>Cleaning job</Text>
            <Text style={s.small}>{new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(row.created_at))}</Text>
          </View><Text style={s.amount}>{xooterMoney(row.net_amount)}</Text></View>
          <View style={s.breakdown}><Text style={s.small}>Gross {xooterMoney(row.gross_amount)}</Text>
            <Text style={s.small}>Platform fee {xooterMoney(row.platform_fee)}</Text></View>
          <Text style={s.small}>Recorded status: {row.status.replace(/[_-]/g, ' ')}</Text>
        </Card>)}
        <Card style={s.notice}><CoreIcon name="shield" color={nativePalette.sageInk} size={20} />
          <View style={s.flex}><Text style={s.entryTitle}>Payout verification</Text>
            <Text style={s.description}>An earnings row cannot confirm a bank transfer. Payout scheduling and receipts must be verified separately. No future payment date is promised here.</Text></View>
        </Card>
        <PrimaryAction icon="briefcase" onPress={() => router.push('/xooter/jobs')}>Return to jobs</PrimaryAction>
      </>}
  </Screen>;
}
export default function XooterEarningsScreen() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Screen><LoadingRows /></Screen>;
  if (!user) return <Screen><DisplayTitle>Earnings</DisplayTitle><EmptyState title="Sign in to see your earnings"
    detail="Only the account that owns Xooter earnings can view their ledger."
    action="Sign in" onAction={() => router.push('/account')} /></Screen>;
  return <EarningHistory key={user.id} userId={user.id} />;
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
  notice: { backgroundColor: nativePalette.sageWash, flexDirection: 'row', gap: 12 },
});
