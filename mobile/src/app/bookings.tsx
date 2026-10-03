import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Body, Eyebrow, LiquidCard, PrimaryButton, SecondaryButton, StatusPill, Title, XootScreen } from '@/components/xoot-ui';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/use-theme';

type Booking = { id: string; service_type: string | null; scheduled_at: string; price: number; payment_status: string | null; status: string };

export default function BookingsScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase.from('bookings').select('id,service_type,scheduled_at,price,payment_status,status').eq('user_id', user.id).order('scheduled_at', { ascending: false }).limit(20);
    setBookings((data ?? []) as Booking[]);
    setLoading(false);
  }, [user]);
  useEffect(() => { void load(); }, [load]);
  if (!user) return <XootScreen><LiquidCard><Eyebrow>Bookings</Eyebrow><Title>Booking status stays protected.</Title><Body muted>Sign in to see real bookings, payment state, and shared fare options.</Body><StatusPill>Sign in required</StatusPill><PrimaryButton onPress={() => router.push('/account')}>Sign in to view bookings</PrimaryButton><SecondaryButton onPress={() => router.push('/book')}>Start a new booking</SecondaryButton></LiquidCard></XootScreen>;
  return <XootScreen><LiquidCard><Eyebrow>Your bookings</Eyebrow><Title>Keep every visit in one place.</Title><Body muted>These cards come from your signed-in Xoot account, not demo data.</Body></LiquidCard>{loading ? <ActivityIndicator color={theme.accent} /> : bookings.length === 0 ? <LiquidCard><Body muted>No bookings yet.</Body><PrimaryButton onPress={() => router.push('/book')}>Book a clean</PrimaryButton></LiquidCard> : bookings.map((booking) => <LiquidCard key={booking.id}><View style={styles.header}><View><Text style={[styles.service, { color: theme.text }]}>{booking.service_type ?? 'Home care'}</Text><Body muted>{new Date(booking.scheduled_at).toLocaleString()}</Body></View><StatusPill tone={booking.status === 'completed' ? 'success' : 'neutral'}>{booking.status}</StatusPill></View><Body>R{Number(booking.price).toFixed(2)} · {booking.payment_status ?? 'payment pending'}</Body>{booking.payment_status === 'pending' ? <SecondaryButton onPress={() => router.push({ pathname: '/split-fare', params: { bookingId: booking.id, total: String(booking.price) } })}>Split this fare</SecondaryButton> : null}<PrimaryButton onPress={() => router.push({ pathname: '/book', params: { bookingId: booking.id } })}>Open booking</PrimaryButton></LiquidCard>)}</XootScreen>;
}
const styles = StyleSheet.create({ header: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', gap: 12 }, service: { fontSize: 20, fontWeight: '800' }, });
