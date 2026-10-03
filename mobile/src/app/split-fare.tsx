import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, TextInput, View } from 'react-native';
import { Body, Eyebrow, LiquidCard, PrimaryButton, SecondaryButton, StatusPill, Title, XootScreen } from '@/components/xoot-ui';
import { useTheme } from '@/hooks/use-theme';
import { invokeXootFunction } from '@/lib/edge-functions';
import { useAuth } from '@/providers/auth-provider';

export default function SplitFareScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const { bookingId, total } = useLocalSearchParams<{ bookingId?: string; total?: string }>();
  const totalCents = Math.max(0, Math.round(Number(total ?? 0) * 100));
  const [emails, setEmails] = useState<string[]>(['']);
  const [saving, setSaving] = useState(false);
  const [links, setLinks] = useState<{ email: string; amountCents: number; inviteToken: string }[]>([]);
  const shareCents = useMemo(() => {
    const parties = emails.length + 1;
    const base = Math.floor(totalCents / parties);
    const remainder = totalCents - base * parties;
    return emails.map((_, index) => base + (index < remainder ? 1 : 0));
  }, [emails.length, totalCents]);
  const addPerson = () => emails.length < 5 && setEmails((current) => [...current, '']);
  const save = async () => {
    if (!user || !bookingId || emails.some((email) => !email.includes('@'))) return;
    setSaving(true);
    try {
      const result = await invokeXootFunction<{ shares: typeof links }>('split-booking-fare', {
        action: 'create', bookingId, shares: emails.map((email, index) => ({ email: email.trim().toLowerCase(), amountCents: shareCents[index] })),
      });
      setLinks(result.shares ?? []);
    } catch (error) {
      setLinks([]);
      alert(error instanceof Error ? error.message : 'Could not save this split.');
    } finally {
      setSaving(false);
    }
  };
  if (!user) return <XootScreen><LiquidCard><Eyebrow>Split fare</Eyebrow><Title>Sign in first.</Title><Body muted>A real account is required to create or accept a share.</Body><PrimaryButton onPress={() => router.push('/account')}>Open account</PrimaryButton></LiquidCard></XootScreen>;
  return (
    <XootScreen>
      <LiquidCard>
        <Eyebrow>Split fare</Eyebrow>
        <Title>Share this booking fairly.</Title>
        <Body muted>Booking total: R{(totalCents / 100).toFixed(2)}. Xoot records each person’s share; payment collection is not switched on yet.</Body>
        <StatusPill tone="neutral">No one is charged here</StatusPill>
      </LiquidCard>
      {links.length > 0 ? (
        <LiquidCard>
          <Eyebrow>Links ready</Eyebrow>
          <Title>Send each person their link.</Title>
          <Body muted>Xoot does not email these automatically. Copy or share each link from your device.</Body>
          {links.map((link) => <View key={link.email} style={styles.row}><Body>{link.email} · R{(link.amountCents / 100).toFixed(2)}</Body><Body muted>{`https://xoot.co.za/split/${link.inviteToken}`}</Body></View>)}
          <SecondaryButton onPress={() => router.back()}>Done</SecondaryButton>
        </LiquidCard>
      ) : (
        <LiquidCard>
          <Eyebrow>Invitees</Eyebrow>
          {emails.map((email, index) => <View key={index} style={styles.row}><TextInput value={email} onChangeText={(value) => setEmails((current) => current.map((item, i) => i === index ? value : item))} placeholder="their@email.com" placeholderTextColor={theme.textSecondary} keyboardType="email-address" autoCapitalize="none" style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]} /><Body muted>R{(shareCents[index] / 100).toFixed(2)}</Body></View>)}
          <SecondaryButton onPress={addPerson} disabled={emails.length >= 5}>Add another person</SecondaryButton>
          <PrimaryButton onPress={save} disabled={saving || emails.some((email) => !email.includes('@'))}>{saving ? 'Saving split' : 'Save split'}</PrimaryButton>
          <SecondaryButton onPress={() => router.back()}>Cancel</SecondaryButton>
        </LiquidCard>
      )}
    </XootScreen>
  );
}
const styles = StyleSheet.create({ row: { gap: 8 }, input: { borderRadius: 16, borderWidth: 1, minHeight: 48, paddingHorizontal: 14, fontSize: 16 }, });
