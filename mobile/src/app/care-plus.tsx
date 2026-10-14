import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, CoreIcon, DisplayTitle, Pill, PrimaryAction, Screen, nativeFonts, nativePalette } from '@/components/native-core';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

type Plan = { id: string; name: string; monthly_price: number };
type Membership = { plan_id: string | null; status: string };
const benefits = [
  { title: 'Home Memory', body: 'Keep pets, access, parking and cleaning preferences with your home.' },
  { title: 'Favourite Xooter', body: 'Rebook a trusted professional when they are available.' },
  { title: 'Priority support', body: 'Get help with booking changes and replacement requests.' },
  { title: 'XootCred', body: 'See credits that were actually recorded after eligible visits.' },
] as const;

function CarePlusFlow({ userId }: { userId: string | null }) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const refresh = useCallback(async (isActive: () => boolean) => {
    const [planResult, membershipResult] = await Promise.all([
      supabase.from('subscription_plans').select('id,name,monthly_price').order('monthly_price').limit(1).maybeSingle(),
      userId
        ? supabase.from('user_subscriptions').select('plan_id,status')
          .eq('user_id', userId).in('status', ['active', 'pending_payment']).limit(1).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
    if (!isActive()) return;
    if (planResult.error || membershipResult.error) {
      setError('Membership details are temporarily unavailable. Please retry.');
      setPlan(null); setMembership(null);
    } else {
      setError(null);
      setPlan(planResult.data);
      setMembership(membershipResult.data);
    }
    setLoading(false);
  }, [userId]);
  useEffect(() => {
    let active = true;
    setPlan(null); setMembership(null); setError(null); setNotice(null);
    setLoading(true);
    void refresh(() => active).catch(() => {
      if (active) { setLoading(false); setError('Membership details could not be loaded.'); }
    });
    return () => { active = false; };
  }, [refresh]);

  const submit = async (action: 'request_membership' | 'cancel_membership') => {
    if (!userId || !plan || acting) return;
    setActing(true); setError(null); setNotice(null);
    try {
      const { data, error: actionError } = await supabase.functions.invoke('care-plus-membership', {
        body: { action, planId: action === 'cancel_membership' ? membership?.plan_id ?? plan.id : plan.id },
      });
      if (actionError || (data && typeof data === 'object' && data.error)) {
        throw new Error('The membership request could not be confirmed. No payment was taken.');
      }
      setNotice(action === 'request_membership'
        ? 'Request recorded. Care+ starts only after confirmed payment.'
        : 'Cancellation requested. Check the updated status before assuming it is cancelled.');
      setConfirmCancel(false);
      setLoading(true);
      await refresh(() => true);
    } catch {
      setLoading(false);
      setError('Your request could not be confirmed. Please try again or contact support.');
    } finally {
      setActing(false);
    }
  };

  const active = membership?.status === 'active';
  const pending = membership?.status === 'pending_payment';
  const money = plan && Number.isFinite(plan.monthly_price)
    ? `R${plan.monthly_price.toLocaleString('en-ZA')}/month`
    : 'Price temporarily unavailable';
  return <Screen contentStyle={s.screen}>
    <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to your profile" style={s.back} onPress={() => router.back()}>
        <CoreIcon name="arrow-left" size={19} /></Pressable>
      <Text style={s.eyebrow}>XOOT MEMBERSHIP</Text>
    </View>
    <Card style={s.hero}>
      <View style={s.mark}><CoreIcon name="heart" color={nativePalette.careInk} size={26} /></View>
      <Text style={s.brand}>Care+</Text>
      <DisplayTitle>A calmer home-care rhythm.</DisplayTitle>
      <Text style={s.lede}>Your home has a way of being yours. Care+ helps keep the details, your preferences and your visits connected.</Text>
      {loading ? <ActivityIndicator color={nativePalette.care} /> :
        <Text style={s.price}>{money}</Text>}
      <Pill tone={active ? 'success' : pending ? 'warning' : 'neutral'}>
        {active ? 'Membership active' : pending ? 'Awaiting payment confirmation' : userId ? 'Not a member yet' : 'Guest preview'}
      </Pill>
    </Card>

    <Text style={s.sectionTitle}>Why people choose Care+</Text>
    <View style={s.benefits}>{benefits.map(item =>
      <Card key={item.title} style={s.benefit}>
        <CoreIcon name="sparkles" color={nativePalette.careInk} size={18} />
        <View style={s.grow}><Text style={s.title}>{item.title}</Text>
          <Text style={s.copy}>{item.body}</Text></View>
      </Card>)}</View>

    <Card style={s.disclaimer}><Text style={s.title}>Before you join</Text>
      <Text style={s.copy}>Membership does not pay for cleaning visits. Booking charges are separate. The fee and benefit eligibility are confirmed before any payment.</Text>
      <Text style={s.copy}>Live checkout is not available in this app yet. A request is not an active paid membership.</Text></Card>

    {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
    {notice ? <Text accessibilityRole="alert" style={s.copy}>{notice}</Text> : null}
    {loading ? <ActivityIndicator color={nativePalette.violet} /> : !userId
      ? <PrimaryAction onPress={() => router.push('/account')}>Sign in to manage Care+</PrimaryAction>
      : !plan ? <PrimaryAction onPress={() => {
        setLoading(true);
        void refresh(() => true).catch(() => { setLoading(false); setError('Please try again shortly.'); });
      }}>Retry membership details</PrimaryAction>
      : active ? <>
        <Text style={s.copy}>Your membership status is loaded from your Xoot account.</Text>
        {!confirmCancel
          ? <Pressable accessibilityRole="button" onPress={() => setConfirmCancel(true)} style={s.cancel}>
              <Text style={s.cancelText}>Cancel membership</Text></Pressable>
          : <Card style={s.confirm}>
              <Text style={s.title}>Cancel Care+?</Text>
              <Text style={s.copy}>The cancellation is processed by Xoot. Your bookings are not automatically cancelled.</Text>
              <PrimaryAction disabled={acting} onPress={() => void submit('cancel_membership')}>
                {acting ? 'Requesting cancellation…' : 'Confirm cancellation'}</PrimaryAction>
              <Pressable accessibilityRole="button" onPress={() => setConfirmCancel(false)} style={s.cancel}>
                <Text style={s.cancelText}>Keep my membership</Text></Pressable>
            </Card>}
      </> : pending ? <Card style={s.pending}><Text style={s.title}>Your request is recorded</Text>
          <Text style={s.copy}>Care+ is not active until its payment is confirmed. You will not be charged from this screen.</Text>
        </Card>
      : <PrimaryAction disabled={acting} onPress={() => void submit('request_membership')}>
          {acting ? 'Sending membership request…' : 'Request Care+ membership'}</PrimaryAction>}
    <Pressable accessibilityRole="button" style={s.gift} onPress={() => router.push('/gifts')}>
      <CoreIcon name="gift" size={20} color={nativePalette.careInk} />
      <View style={s.grow}><Text style={s.title}>Gift a Clean</Text><Text style={s.copy}>A different way to give someone time back</Text></View>
      <CoreIcon name="chevron-right" color={nativePalette.muted} size={18} />
    </Pressable>
  </Screen>;
}
export default function CarePlusScreen() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Screen><ActivityIndicator color={nativePalette.care} /></Screen>;
  return <CarePlusFlow key={user?.id ?? 'guest'} userId={user?.id ?? null} />;
}
const s = StyleSheet.create({
  screen: { paddingBottom: 74, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { backgroundColor: nativePalette.card, borderWidth: 1, borderColor: nativePalette.border,
    height: 42, width: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 23 },
  eyebrow: { color: nativePalette.careInk, fontFamily: nativeFonts.bodyBold, letterSpacing: 1.5, fontSize: 11 },
  hero: { backgroundColor: nativePalette.careWash, alignItems: 'flex-start', gap: 13, borderRadius: 24, padding: 24 },
  mark: { width: 53, height: 53, borderRadius: 17, backgroundColor: nativePalette.card,
    alignItems: 'center', justifyContent: 'center' },
  brand: { fontFamily: nativeFonts.displayStrong, fontSize: 34, color: nativePalette.careInk },
  lede: { fontFamily: nativeFonts.body, fontSize: 14, lineHeight: 22, color: nativePalette.inkSoft },
  price: { fontFamily: nativeFonts.displayStrong, fontSize: 24, color: nativePalette.careInk },
  sectionTitle: { fontFamily: nativeFonts.displayStrong, color: nativePalette.ink, fontSize: 26 },
  benefits: { gap: 9 },
  benefit: { gap: 12, flexDirection: 'row', alignItems: 'flex-start' },
  title: { fontFamily: nativeFonts.bodyBold, fontSize: 14, color: nativePalette.ink },
  grow: { flex: 1, gap: 3 },
  copy: { fontFamily: nativeFonts.body, fontSize: 12, lineHeight: 19, color: nativePalette.inkSoft },
  disclaimer: { gap: 10, backgroundColor: nativePalette.sunken },
  error: { fontFamily: nativeFonts.body, color: nativePalette.blushInk, fontSize: 13, lineHeight: 19 },
  cancel: { paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: nativeFonts.bodyBold, fontSize: 13, color: nativePalette.inkSoft },
  confirm: { gap: 12 },
  pending: { backgroundColor: nativePalette.honeyWash, gap: 9 },
  gift: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14,
    borderRadius: 16, backgroundColor: nativePalette.card,
    borderWidth: 1, borderColor: nativePalette.border },
});
