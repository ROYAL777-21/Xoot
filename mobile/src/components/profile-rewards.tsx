import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Card, CoreIcon, DisplayTitle, EmptyState, LoadingRows, Screen, SectionLabel, nativeFonts, nativePalette } from '@/components/native-core';
import { calculateNativeXootCredSummary, type NativeXootCredLedgerRow, xootCredReasonLabel } from '@/lib/native-xootcred';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

type Loyalty = { points: number; total_bookings: number };

export function useNativeRewards() {
  const { user, isLoading: authLoading } = useAuth();
  const [loyalty, setLoyalty] = useState<Loyalty | null>(null);
  const [ledger, setLedger] = useState<NativeXootCredLedgerRow[]>([]);
  const [loading, setLoading] = useState(Boolean(user));
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    if (!user) { setLoyalty(null); setLedger([]); setLoading(false); setError(null); return; }
    setLoading(true); setError(null);
    const [loyaltyResult, ledgerResult] = await Promise.all([
      supabase.from('loyalty_points').select('points,total_bookings').eq('user_id', user.id).maybeSingle(),
      supabase.from('xootcred_ledger').select('id,amount,direction,status,reason,created_at,expires_at').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]);
    if (loyaltyResult.error || ledgerResult.error) setError('Your rewards could not be refreshed. Try again shortly.');
    else { setLoyalty(loyaltyResult.data); setLedger((ledgerResult.data ?? []) as NativeXootCredLedgerRow[]); }
    setLoading(false);
  }, [user]);
  useEffect(() => { if (!authLoading) void refresh(); }, [authLoading, refresh]);
  return { user, loyalty, ...calculateNativeXootCredSummary(ledger), loading: authLoading || loading, error, refresh };
}

const money = (value: number) => `R${value.toLocaleString('en-ZA', { minimumFractionDigits: value % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

export function RewardsView({ openCredits }: { openCredits: () => void }) {
  const data = useNativeRewards();
  return <Screen refreshControl={<RefreshControl refreshing={data.loading} onRefresh={data.refresh} tintColor={nativePalette.violet} />}>
    <View><Text style={styles.eyebrow}>YOUR THANK-YOUS</Text><DisplayTitle>Rewards</DisplayTitle></View>
    {!data.user ? <EmptyState title="Sign in to see your rewards" detail="Points and XootCred are tied to your protected Xoot account." /> : data.loading ? <LoadingRows /> : data.error ? <EmptyState title="Rewards are unavailable" detail={data.error} action="Try again" onAction={data.refresh} /> : <>
      <Card style={styles.hero}><CoreIcon name="trophy" color={nativePalette.honeyInk} size={34} /><Text style={styles.heroValue}>{data.loyalty?.points ?? 0}</Text><Text style={styles.heroLabel}>Xoot Points</Text><Text style={styles.heroDetail}>Earned from completed activity recorded by Xoot.</Text></Card>
      <View style={styles.stats}><Card style={[styles.stat, { backgroundColor: nativePalette.violetWash }]}><CoreIcon name="sparkles" size={21} /><Text style={styles.statValue}>{data.loyalty?.total_bookings ?? 0}</Text><Text style={styles.statLabel}>recorded visits</Text></Card><Card style={[styles.stat, { backgroundColor: nativePalette.sageWash }]}><CoreIcon name="wallet" size={21} /><Text style={styles.statValue}>{money(data.availableBalance)}</Text><Text style={styles.statLabel}>XootCred</Text></Card></View>
      <SectionLabel>Balance</SectionLabel><Card style={styles.row}><View style={styles.rowIcon}><CoreIcon name="wallet" size={20} /></View><View style={styles.grow}><Text style={styles.rowTitle}>XootCred</Text><Text style={styles.rowDetail}>{data.pendingBalance ? `${money(data.pendingBalance)} pending` : 'Use eligible credit on a booking'}</Text></View><Text onPress={openCredits} accessibilityRole="link" style={styles.link}>View activity</Text></Card>
      <Text style={styles.note}>Points and credits shown here come from your account records. Rewards are added only by approved Xoot services.</Text>
    </>}
  </Screen>;
}

export function CreditsView() {
  const data = useNativeRewards();
  return <Screen refreshControl={<RefreshControl refreshing={data.loading} onRefresh={data.refresh} tintColor={nativePalette.violet} />}>
    <View><Text style={styles.eyebrow}>YOURS TO SPEND</Text><DisplayTitle>XootCred</DisplayTitle></View>
    {!data.user ? <EmptyState title="Sign in to see XootCred" detail="Your balance and activity are protected account data." /> : data.loading ? <LoadingRows /> : data.error ? <EmptyState title="XootCred is unavailable" detail={data.error} action="Try again" onAction={data.refresh} /> : <>
      <Card style={styles.balance}><Text style={styles.balanceValue}>{money(data.availableBalance)}</Text><Text style={styles.heroLabel}>available now</Text>{data.pendingBalance ? <Text style={styles.heroDetail}>{money(data.pendingBalance)} pending</Text> : null}</Card>
      <SectionLabel count={data.entries.length}>Recent activity</SectionLabel>
      {data.entries.length ? <Card style={{ gap: 0 }}>{data.entries.map((entry, index) => <View key={entry.id} style={[styles.activity, index > 0 && styles.divider]}><View style={styles.grow}><Text style={styles.rowTitle}>{xootCredReasonLabel(entry.reason)}</Text><Text style={styles.rowDetail}>{new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(entry.createdAt))}{entry.isPending ? ' · Pending' : entry.isExpired ? ' · Expired' : ''}</Text></View><Text style={[styles.amount, entry.direction === 'credit' && styles.credit]}>{entry.direction === 'credit' ? '+' : '−'}{money(Math.abs(entry.amount))}</Text></View>)}</Card> : <EmptyState title="No XootCred activity yet" detail="Eligible credits and booking redemptions will appear here when recorded." />}
      <Text style={styles.note}>XootCred is ledger-backed. Availability and expiry follow each credit’s account record.</Text>
    </>}
  </Screen>;
}

const styles = StyleSheet.create({
  eyebrow:{color:nativePalette.muted,fontFamily:nativeFonts.bodyBold,fontSize:11,letterSpacing:1.1,marginBottom:5}, hero:{alignItems:'center',backgroundColor:nativePalette.honeyWash,gap:5,paddingVertical:24},heroValue:{color:nativePalette.ink,fontFamily:nativeFonts.displayStrong,fontSize:42,lineHeight:44},heroLabel:{color:nativePalette.inkSoft,fontFamily:nativeFonts.bodyBold,fontSize:14},heroDetail:{color:nativePalette.inkSoft,fontFamily:nativeFonts.body,fontSize:13,textAlign:'center'},stats:{flexDirection:'row',gap:12},stat:{flex:1,gap:6,minHeight:118},statValue:{color:nativePalette.ink,fontFamily:nativeFonts.displayStrong,fontSize:25},statLabel:{color:nativePalette.inkSoft,fontFamily:nativeFonts.body,fontSize:12},row:{alignItems:'center',flexDirection:'row',gap:12},rowIcon:{alignItems:'center',backgroundColor:nativePalette.sunken,borderRadius:14,height:40,justifyContent:'center',width:40},grow:{flex:1},rowTitle:{color:nativePalette.ink,fontFamily:nativeFonts.bodyBold,fontSize:14},rowDetail:{color:nativePalette.muted,fontFamily:nativeFonts.body,fontSize:12,marginTop:2},link:{color:nativePalette.violetDark,fontFamily:nativeFonts.bodyBold,fontSize:12},note:{color:nativePalette.muted,fontFamily:nativeFonts.body,fontSize:12,lineHeight:18,paddingHorizontal:8,textAlign:'center'},balance:{alignItems:'center',backgroundColor:nativePalette.violetWash,gap:5,paddingVertical:28},balanceValue:{color:nativePalette.ink,fontFamily:nativeFonts.displayStrong,fontSize:48,lineHeight:50},activity:{alignItems:'center',flexDirection:'row',minHeight:62},divider:{borderTopColor:nativePalette.border,borderTopWidth:StyleSheet.hairlineWidth},amount:{color:nativePalette.inkSoft,fontFamily:nativeFonts.mono,fontSize:13},credit:{color:nativePalette.sageInk},
});
