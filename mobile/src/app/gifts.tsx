import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  Card, CoreIcon, DisplayTitle, Pill, PrimaryAction, Screen,
  nativeFonts, nativePalette,
} from '@/components/native-core';
import {
  ANNUAL_WEEKLY_CLEANS, GIFT_BUNDLES, GIFT_NOTES, GIFT_SERVICES, GIFT_TINTS,
  giftMoney, nativeGiftIssue, newGiftDraft, parseNativeGiftQuote,
  type NativeGiftDefinition, type NativeGiftQuote, type NativeGiftTint,
} from '@/lib/native-gift';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

const tints: Record<NativeGiftTint, { background: string; ink: string }> = {
  blush: { background: nativePalette.blushWash, ink: nativePalette.blushInk },
  lilac: { background: nativePalette.violetWash, ink: nativePalette.violetDark },
  mist: { background: nativePalette.sunken, ink: nativePalette.ink },
  petal: { background: nativePalette.blushWash, ink: nativePalette.blushInk },
  moss: { background: nativePalette.sageWash, ink: nativePalette.sageInk },
  sage: { background: nativePalette.sageWash, ink: nativePalette.sageInk },
  honey: { background: nativePalette.honeyWash, ink: nativePalette.honeyInk },
};
const stages = ['Choose', 'Personalise', 'Review'] as const;
type QuoteState = { key: string; quote: NativeGiftQuote | null; loading: boolean; error: string | null };

function Option({ title, detail, selected, onPress }: {
  title: string; detail?: string; selected: boolean; onPress: () => void;
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }}
    accessibilityLabel={detail ? `${title}. ${detail}` : title} onPress={onPress}
    style={({ pressed }) => [s.option, selected && s.optionSelected, pressed && s.pressed]}>
    <View style={s.grow}><Text style={[s.optionTitle, selected && s.choiceInk]}>{title}</Text>
      {detail ? <Text style={s.small}>{detail}</Text> : null}</View>
    {selected ? <CoreIcon name="check" color={nativePalette.violetDark} size={18} /> : null}
  </Pressable>;
}
function Field({ label, value, onChange, placeholder, multiline = false, email = false, limit = 120 }: {
  label: string; value: string; onChange: (value: string) => void;
  placeholder?: string; multiline?: boolean; email?: boolean; limit?: number;
}) {
  return <View style={s.fieldGroup}><Text style={s.label}>{label}</Text>
    <TextInput accessibilityLabel={label} value={value} onChangeText={onChange}
      placeholder={placeholder} placeholderTextColor={nativePalette.muted}
      autoCapitalize={email ? 'none' : 'sentences'} autoCorrect={!email}
      keyboardType={email ? 'email-address' : 'default'} autoComplete={email ? 'email' : 'off'}
      maxLength={limit} multiline={multiline}
      style={[s.input, multiline && s.multiline]} />
    {multiline ? <Text style={s.counter}>{value.length}/{limit}</Text> : null}
  </View>;
}
function GiftPreview({ draft }: { draft: NativeGiftDefinition }) {
  const tint = tints[draft.tint];
  return <View style={[s.preview, { backgroundColor: tint.background }]} accessible
    accessibilityLabel={`Gift card preview, ${draft.count} cleans, from ${draft.senderName || 'you'}`}>
    <View style={s.previewTop}><CoreIcon name="gift" color={tint.ink} size={26} />
      <Text style={[s.previewBrand, { color: tint.ink }]}>xoot</Text></View>
    <Text style={[s.previewTitle, { color: tint.ink }]}>{draft.count} {draft.count === 1 ? 'clean' : 'cleans'}</Text>
    <Text style={[s.previewNote, { color: tint.ink }]} numberOfLines={3}>
      {draft.note.trim() || 'A little time back, just for you.'}</Text>
    <Text style={[s.previewFrom, { color: tint.ink }]}>
      {draft.senderName.trim() ? `With care, ${draft.senderName.trim()}` : 'With care, from you'}
    </Text>
  </View>;
}
function GiftFlow({ userId, sender }: { userId: string | null; sender: string }) {
  const [draft, setDraft] = useState(() => newGiftDraft(sender));
  const [step, setStep] = useState(0);
  const [quoteState, setQuoteState] = useState<QuoteState>({ key: '', quote: null, loading: false, error: null });
  const [formError, setFormError] = useState<string | null>(null);
  const key = `${userId || 'guest'}:${draft.service}:${draft.count}`;
  const quote = quoteState.key === key ? quoteState.quote : null;
  const quoteLoading = userId !== null && (quoteState.key !== key || quoteState.loading);
  const quoteError = quoteState.key === key ? quoteState.error : null;
  const update = (change: Partial<NativeGiftDefinition>) => {
    setDraft(current => ({ ...current, ...change }));
    setFormError(null);
  };
  useEffect(() => {
    if (!userId) return;
    let active = true;
    setQuoteState({ key, quote: null, error: null, loading: true });
    void supabase.functions.invoke('ops-workflow', {
      body: { action: 'gift_quote', service: draft.service, count: draft.count },
    }).then(({ data, error }) => {
      if (!active) return;
      const parsed = error ? null : parseNativeGiftQuote(data, draft.service, draft.count);
      setQuoteState({
        key, quote: parsed, loading: false,
        error: parsed ? null : 'The gift price cannot be verified right now. No payment has been made.',
      });
    }).catch(() => {
      if (active) setQuoteState({ key, quote: null, loading: false,
        error: 'The gift quote is unavailable. Try again when connected.' });
    });
    return () => { active = false; };
  }, [userId, key, draft.service, draft.count]);

  const next = () => {
    if (step === 1) {
      const issue = nativeGiftIssue(draft);
      if (issue) { setFormError(issue); return; }
    }
    setFormError(null);
    setStep(current => Math.min(2, current + 1));
  };

  return <Screen contentStyle={s.screen}>
    <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel={step ? 'Back one gift step' : 'Back to your profile'}
        onPress={() => step ? setStep(step - 1) : router.back()} style={s.back}>
        <CoreIcon name="arrow-left" size={20} />
      </Pressable>
      <View style={s.grow}><Text style={s.eyebrow}>GIFT A CLEAN</Text>
        <DisplayTitle>Give them time back.</DisplayTitle></View>
    </View>
    <View style={s.progress}>{stages.map((name, index) =>
      <View key={name} style={[s.progressSegment, index <= step && s.progressActive]} />)}</View>
    <Text style={s.stepLabel}>{stages[step]} · step {step + 1} of 3</Text>

    <GiftPreview draft={draft} />

    {step === 0 && <>
      <Text style={s.heading}>Choose their gift</Text>
      <Text style={s.body}>Give whole cleaning visits, not a monetary voucher. They can choose when to use them after gifting becomes available.</Text>
      <Text style={s.label}>Which service?</Text>
      <View style={s.grid}>{GIFT_SERVICES.map(item =>
        <View key={item.key} style={s.gridItem}><Option title={item.label}
          selected={draft.service === item.key} onPress={() => update({ service: item.key })} /></View>)}</View>
      <Text style={s.label}>How many visits?</Text>
      <View style={s.grid}>{GIFT_BUNDLES.map(item =>
        <View key={item.count} style={s.gridItem}><Option title={item.label} detail={item.detail}
          selected={draft.count === item.count} onPress={() => update({ count: item.count })} /></View>)}</View>
      <Card style={s.notice}><Text style={s.noticeTitle}>What counts as a year?</Text>
        <Text style={s.body}>At one clean per week, a full year is {ANNUAL_WEEKLY_CLEANS} visits. Twelve visits cover roughly three months if used weekly. An annual gift package is not available yet.</Text></Card>
    </>}

    {step === 1 && <>
      <Text style={s.heading}>Make it personal</Text>
      <Text style={s.body}>The original Xoot gift-card colours and note are yours to choose. Nothing is sent at this stage.</Text>
      <Text style={s.label}>Card colour</Text>
      <View style={s.tintRow}>{GIFT_TINTS.map(tint =>
        <Pressable key={tint} accessibilityRole="button" accessibilityLabel={`${tint} card colour`}
          accessibilityState={{ selected: draft.tint === tint }} onPress={() => update({ tint })}
          style={[s.tint, { backgroundColor: tints[tint].background, borderColor: draft.tint === tint ? nativePalette.violet : nativePalette.border }]}>
          {draft.tint === tint ? <CoreIcon name="check" color={tints[tint].ink} size={16} /> : null}
        </Pressable>)}</View>
      <Text style={s.label}>Delivery preference</Text>
      <View style={s.grid}>
        <View style={s.gridItem}><Option title="Send an email" detail="Only after payment and delivery are enabled"
          selected={draft.delivery === 'email'} onPress={() => update({ delivery: 'email' })} /></View>
        <View style={s.gridItem}><Option title="Share a link" detail="Only after gift redemption is enabled"
          selected={draft.delivery === 'link'} onPress={() => update({ delivery: 'link', recipientName: '', recipientEmail: '' })} /></View>
      </View>
      {draft.delivery === 'email' && <>
        <Field label="Their name" value={draft.recipientName} onChange={recipientName => update({ recipientName })}
          placeholder="Thandi" />
        <Field label="Their email" value={draft.recipientEmail} onChange={recipientEmail => update({ recipientEmail })}
          placeholder="thandi@example.co.za" email limit={254} />
      </>}
      <Field label="Your name" value={draft.senderName} onChange={senderName => update({ senderName })} placeholder="Your name" />
      <Text style={s.label}>Need help with the note? Pick one</Text>
      <View style={s.presetRow}>{GIFT_NOTES.map(note =>
        <Pressable key={note.label} accessibilityRole="button" onPress={() => update({ occasion: note.label, note: note.text })}
          style={s.preset}><Text style={s.presetText}>{note.label}</Text></Pressable>)}</View>
      <Field label="Your message" value={draft.note} onChange={note => update({ note })}
        placeholder="Something heartfelt, in your own words" multiline limit={90} />
    </>}

    {step === 2 && <>
      <Text style={s.heading}>Review your gift</Text>
      <Text style={s.body}>Check your card and the service price. A gift request is not a paid voucher or a confirmed delivery.</Text>
      <Card style={s.review}>
        <View style={s.fact}><Text style={s.small}>Service</Text><Text style={s.value}>
          {GIFT_SERVICES.find(item => item.key === draft.service)?.label}</Text></View>
        <View style={s.fact}><Text style={s.small}>Visits</Text><Text style={s.value}>{draft.count}</Text></View>
        <View style={s.fact}><Text style={s.small}>Delivery</Text><Text style={s.value}>
          {draft.delivery === 'email' ? draft.recipientEmail.trim() : 'Shareable link, when available'}</Text></View>
        <View style={s.fact}><Text style={s.small}>Booking fees</Text><Text style={s.value}>Included in quoted visit price</Text></View>
        <View style={s.total}><Text style={s.value}>Gift total</Text>
          <Text style={s.totalMoney}>{quote ? giftMoney(quote.totalCents) : 'Unavailable'}</Text></View>
        {quote && <Text style={s.small}>{giftMoney(quote.perVisitCents)} per visit, {quote.hours} hrs each.</Text>}
      </Card>
      {!userId ? <PrimaryAction onPress={() => router.push('/account')}>Sign in to continue</PrimaryAction> : null}
      {quoteLoading ? <View style={s.statusRow}><ActivityIndicator color={nativePalette.violet} /><Text style={s.small}>Checking the live price…</Text></View> : null}
      {quoteError ? <Text accessibilityRole="alert" style={s.error}>{quoteError}</Text> : null}
      <Pill tone="warning">Checkout not yet available</Pill>
      <Text style={s.body}>Payment, email delivery, share links and redemption are not enabled. The total above is a server quote only; nobody has been charged.</Text>
      <View style={[s.disabledAction, { opacity: 0.55 }]} accessibilityState={{ disabled: true }} accessibilityRole="button">
        <CoreIcon name="lock" color={nativePalette.card} size={18} />
        <Text style={s.disabledText}>Purchase gift — unavailable</Text>
      </View>
    </>}

    {formError ? <Text accessibilityRole="alert" style={s.error}>{formError}</Text> : null}
    {step < 2 ? <PrimaryAction onPress={next}>Continue to {stages[step + 1].toLowerCase()}</PrimaryAction> : null}
    <Pressable accessibilityRole="button" style={s.secondaryAction} onPress={() => step ? setStep(step - 1) : router.back()}>
      <Text style={s.secondaryText}>{step ? 'Back' : 'Not now'}</Text>
    </Pressable>
  </Screen>;
}

export default function GiftScreen() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Screen><ActivityIndicator color={nativePalette.violet} /><Text style={s.body}>Loading your account…</Text></Screen>;
  const sender = typeof user?.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : '';
  // Remount on account switches: notes, recipient identity and quotes never cross users.
  return <GiftFlow key={user?.id ?? 'guest'} userId={user?.id ?? null} sender={sender} />;
}

const s = StyleSheet.create({
  screen: { paddingBottom: 70, gap: 15 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { width: 42, height: 42, borderRadius: 22, borderWidth: 1, borderColor: nativePalette.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: nativePalette.card },
  grow: { flex: 1 },
  eyebrow: { fontFamily: nativeFonts.bodyBold, fontSize: 10, letterSpacing: 1.5, color: nativePalette.violetDark },
  progress: { flexDirection: 'row', gap: 8 },
  progressSegment: { height: 4, flex: 1, borderRadius: 5, backgroundColor: nativePalette.border },
  progressActive: { backgroundColor: nativePalette.violet },
  stepLabel: { fontFamily: nativeFonts.body, color: nativePalette.muted, fontSize: 12 },
  preview: { padding: 24, borderRadius: 27, gap: 12, minHeight: 210,
    justifyContent: 'space-between', borderWidth: 1, borderColor: nativePalette.border },
  previewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  previewBrand: { fontFamily: nativeFonts.displayStrong, fontSize: 25 },
  previewTitle: { fontFamily: nativeFonts.displayStrong, fontSize: 35, lineHeight: 40 },
  previewNote: { fontFamily: nativeFonts.display, fontSize: 17, lineHeight: 23 },
  previewFrom: { fontFamily: nativeFonts.script, fontSize: 22 },
  heading: { fontFamily: nativeFonts.displayStrong, fontSize: 27, color: nativePalette.ink },
  body: { fontFamily: nativeFonts.body, fontSize: 13, lineHeight: 20, color: nativePalette.inkSoft },
  label: { fontFamily: nativeFonts.bodyBold, fontSize: 13, color: nativePalette.ink, marginTop: 7 },
  grid: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  gridItem: { width: '48%', flexGrow: 1 },
  option: { minHeight: 66, borderRadius: 15, borderWidth: 1, padding: 12, flexDirection: 'row',
    gap: 8, alignItems: 'center', borderColor: nativePalette.border, backgroundColor: nativePalette.card },
  optionSelected: { borderWidth: 2, borderColor: nativePalette.violet, backgroundColor: nativePalette.violetWash },
  pressed: { opacity: 0.72 },
  optionTitle: { fontFamily: nativeFonts.bodyBold, fontSize: 13, color: nativePalette.ink },
  choiceInk: { color: nativePalette.violetDark },
  small: { color: nativePalette.muted, fontFamily: nativeFonts.body, fontSize: 11, lineHeight: 17 },
  notice: { backgroundColor: nativePalette.honeyWash, gap: 6 },
  noticeTitle: { fontFamily: nativeFonts.bodyBold, fontSize: 14, color: nativePalette.honeyInk },
  tintRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 11 },
  tint: { width: 39, height: 39, borderRadius: 21, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  fieldGroup: { gap: 6 },
  input: { minHeight: 49, paddingHorizontal: 14, paddingVertical: 10, color: nativePalette.ink,
    fontFamily: nativeFonts.body, fontSize: 15, backgroundColor: nativePalette.card,
    borderWidth: 1, borderRadius: 13, borderColor: nativePalette.border },
  multiline: { minHeight: 89, textAlignVertical: 'top' },
  counter: { color: nativePalette.muted, fontSize: 11, alignSelf: 'flex-end' },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  preset: { borderWidth: 1, borderRadius: 18, borderColor: nativePalette.border, paddingHorizontal: 12, paddingVertical: 9 },
  presetText: { fontFamily: nativeFonts.bodyBold, fontSize: 11, color: nativePalette.inkSoft },
  review: { gap: 12 },
  fact: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  value: { fontFamily: nativeFonts.bodyBold, color: nativePalette.ink, fontSize: 13, maxWidth: '74%' },
  total: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 12, borderTopWidth: 1, borderColor: nativePalette.border },
  totalMoney: { fontFamily: nativeFonts.displayStrong, fontSize: 25, color: nativePalette.violetDark },
  statusRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  error: { color: nativePalette.blushInk, fontFamily: nativeFonts.body, fontSize: 12, lineHeight: 18 },
  disabledAction: { minHeight: 51, backgroundColor: nativePalette.ink, borderRadius: 26,
    flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center' },
  disabledText: { fontFamily: nativeFonts.bodyBold, color: nativePalette.card, fontSize: 14 },
  secondaryAction: { paddingVertical: 13, alignItems: 'center' },
  secondaryText: { fontFamily: nativeFonts.bodyBold, fontSize: 13, color: nativePalette.inkSoft },
});
