import { router } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, AppState, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Card, CoreIcon, DisplayTitle, nativeFonts, Wordmark } from '@/components/native-core';
import { ServiceIcon, type ServiceIconName } from '@/components/service-icon';
import { nativePalette as p } from '@/constants/handoff';
import { BOOKING_ADD_ONS, BOOKING_LINEN_OPTIONS, BOOKING_PROPERTY_TYPES, type BookingQuoteInput, type BookingService } from '@/generated/booking-contract';
import { BOOKING_FREQUENCY_LABELS, BOOKING_LINEN_LABELS, BOOKING_PROPERTY_LABELS, BOOKING_REFERRAL_MESSAGES, BOOKING_SERVICE_DETAILS, bookingCrewCap, bookingDateInSast, bookingExtrasFor, bookingServiceForProperty, bookingStartSlots, bookingWeekday, formatBookingMoney, type BookingQuoteResponse } from '@/generated/booking-flow';
import { loadPublicXooters, requestBookingQuote, type PublicXooter } from '@/lib/booking-api';
import { nativeBookingIssue, nativeBookingPrefill, validBookingDate, withBookingDate, withBookingProperty, withBookingRooms, withNativeBookingService, type NativeBookingParams } from '@/lib/native-booking-input';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SERVICES: BookingService[] = ['regular', 'airbnb', 'express', 'office', 'moving'];

function Copy({ children, strong = false }: { children: ReactNode; strong?: boolean }) {
  return <Text selectable style={[s.copy, strong && s.strong]}>{children}</Text>;
}
function Label({ children }: { children: ReactNode }) {
  return <Text selectable style={s.label}>{children}</Text>;
}
function ServiceTile({ label, service, selected = false, disabled = false, onPress }: {
  label: string; service: ServiceIconName; selected?: boolean; disabled?: boolean; onPress?: () => void;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={disabled ? `${label}. Currently unavailable` : label}
    accessibilityState={{ selected, disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [s.serviceTile, selected && s.selected, pressed && s.pressed]}>
    <ServiceIcon service={service} />
    <Text style={[s.choiceText, s.center, s.serviceLabel]}>{label}</Text>
    {disabled && <Text style={[s.detail, s.center]}>Currently unavailable</Text>}
  </Pressable>;
}
function Choice({ label, detail, selected = false, disabled = false, onPress, children, checkbox = false }: {
  label: string; detail?: string; selected?: boolean; disabled?: boolean; onPress?: () => void; children?: ReactNode; checkbox?: boolean;
}) {
  return <Pressable accessibilityLabel={detail ? `${label}. ${detail}` : label} accessibilityRole={checkbox ? 'checkbox' : 'button'}
    accessibilityState={checkbox ? { checked: selected, disabled } : { selected, disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [s.choice, selected && s.selected, disabled && s.unavailable, pressed && s.pressed]}>
    {children}
    <View style={s.grow}><Text style={[s.choiceText, selected && s.selectedText]}>{label}</Text>{detail && <Text style={s.detail}>{detail}</Text>}</View>
    {selected && <CoreIcon name="check" size={18} color={p.violetDark} />}
  </Pressable>;
}
function Action({ children, onPress, disabled = false, secondary = false }: { children: string; onPress: () => void; disabled?: boolean; secondary?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [s.action, secondary && s.secondaryAction, disabled && s.unavailable, pressed && s.pressed]}>
    <Text style={[s.actionText, secondary && s.secondaryText]}>{children}</Text>
  </Pressable>;
}
function Field({ label, value, onChange, placeholder, multiline = false, maxLength = 500 }: {
  label: string; value: string; onChange: (value: string) => void; placeholder?: string; multiline?: boolean; maxLength?: number;
}) {
  return <View style={s.group}><Label>{label}</Label><TextInput accessibilityLabel={label} value={value} onChangeText={onChange}
    autoCorrect={false} autoCapitalize="none" placeholder={placeholder} placeholderTextColor={p.inkSoft} multiline={multiline}
    maxLength={maxLength} style={[s.field, multiline && { minHeight: 88, textAlignVertical: 'top' }]} /></View>;
}
function Stepper({ label, value, min, max, step = 1, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => void;
}) {
  return <View style={s.row}><View style={s.grow}><Copy strong>{label}</Copy></View><View style={s.counter}>
    <Pressable accessibilityLabel={`Decrease ${label}`} accessibilityRole="button" accessibilityState={{ disabled: value <= min }} disabled={value <= min}
      onPress={() => onChange(Math.max(min, value - step))} style={[s.counterButton, value <= min && s.unavailable]}><Text style={s.counterSymbol}>−</Text></Pressable>
    <Text accessibilityLabel={`${label}: ${value}`} style={s.number}>{value}</Text>
    <Pressable accessibilityLabel={`Increase ${label}`} accessibilityRole="button" accessibilityState={{ disabled: value >= max }} disabled={value >= max}
      onPress={() => onChange(Math.min(max, value + step))} style={[s.counterButton, value >= max && s.unavailable]}><Text style={s.counterSymbol}>+</Text></Pressable>
  </View></View>;
}
function Fact({ label, value }: { label: string; value: string }) {
  return <View style={s.fact}><Text selectable style={s.detail}>{label}</Text><Text selectable style={[s.copy, s.strong]}>{value}</Text></View>;
}

export function NativeBookingFlow({ params }: { params: NativeBookingParams }) {
  const [prefill] = useState(() => nativeBookingPrefill(params));
  const [input, setInput] = useState(prefill.input);
  const [address, setAddress] = useState('');
  const [area, setArea] = useState(prefill.area);
  const [notes, setNotes] = useState('');
  const [access, setAccess] = useState("I'll be home");
  const [bedrooms, setBedrooms] = useState(2);
  const [bathrooms, setBathrooms] = useState(1);
  const [stage, setStage] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [quote, setQuote] = useState<BookingQuoteResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteRetry, setQuoteRetry] = useState(0);
  const [accepted, setAccepted] = useState(false);
  const [roster, setRoster] = useState<PublicXooter[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [rosterRetry, setRosterRetry] = useState(0);
  const [chosen, setChosen] = useState<string[]>([]);
  const sequence = useRef(0);
  const scroll = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const issue = nativeBookingIssue(input, address, now);
  const propertyService = bookingServiceForProperty(input);
  const serviceMismatch = propertyService !== input.service;
  const slots = validBookingDate(input.date, now) ? bookingStartSlots(input, now) : [];
  const details = BOOKING_SERVICE_DETAILS[input.service];
  const steps = ['Service', input.service === 'office' ? 'Your office' : 'Your home', 'When', 'Your Xooter', 'Review'];
  const priced = quote?.quote;

  const clearConsent = () => setAccepted(false);
  const invalidate = () => {
    sequence.current += 1;
    setQuote(null);
    setQuoteLoading(false);
    setQuoteError(null);
    clearConsent();
  };
  const change = (next: BookingQuoteInput) => {
    invalidate();
    setInput(next);
    setChosen(current => current.slice(0, next.crewSize));
  };
  const patch = (value: Partial<BookingQuoteInput>) => change({ ...input, ...value });
  const go = (next: number) => {
    setNow(Date.now());
    setStage(next);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  const retryQuote = () => { invalidate(); setQuoteRetry(value => value + 1); };

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') setNow(Date.now()); });
    return () => { clearInterval(timer); subscription.remove(); sequence.current += 1; };
  }, []);

  useEffect(() => {
    const version = ++sequence.current;
    let active = true;
    setQuote(null);
    setAccepted(false);
    setQuoteError(null);
    setQuoteLoading(false);
    if (stage !== 4 || issue) return;
    setQuoteLoading(true);
    // Only the public pricing contract leaves the device; address, notes and Xooter preferences stay local.
    void requestBookingQuote(input).then(result => {
      if (active && version === sequence.current) setQuote(result);
    }).catch(() => {
      if (active && version === sequence.current) setQuoteError('Your quote could not be loaded or verified. Check your selections and connection, then try again.');
    }).finally(() => {
      if (active && version === sequence.current) setQuoteLoading(false);
    });
    return () => { active = false; sequence.current += 1; };
  }, [input, stage, issue, quoteRetry]);

  useEffect(() => {
    if (stage !== 3) return;
    let active = true;
    setRosterLoading(true);
    setRosterError(null);
    void loadPublicXooters().then(people => {
      if (!active) return;
      setRoster(people);
      setChosen(current => current.filter(id => people.some(person => person.id === id)).slice(0, input.crewSize));
      setAccepted(false);
    }).catch(() => {
      if (active) { setRoster([]); setChosen([]); setRosterError('The Xooter roster could not be loaded. You can retry or let Xoot match your crew.'); }
    }).finally(() => { if (active) setRosterLoading(false); });
    return () => { active = false; };
  }, [stage, rosterRetry, input.crewSize]);

  return <ScrollView ref={scroll} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
    style={s.screen} contentContainerStyle={[s.content, { paddingTop: Math.max(16, insets.top), paddingBottom: insets.bottom + 112 }]}>
    <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel={stage ? 'Previous booking step' : 'Back to home'} style={s.counterButton}
        onPress={() => stage ? go(stage - 1) : router.replace('/')}><CoreIcon name="arrow-left" /></Pressable>
      <View style={s.grow}><Text accessibilityRole="header" style={s.headerTitle}>{steps[stage]}</Text><Text style={s.detail}>Step {stage + 1} of 5</Text></View>
      <Wordmark size={26} />
    </View>
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: 5, now: stage + 1, text: `Step ${stage + 1} of 5` }} style={s.progress}>
      {steps.map((name, index) => <View key={name} style={[s.segment, index <= stage && s.segmentOn]} />)}
    </View>

    {stage === 0 && <>
      <DisplayTitle>What do you need done?</DisplayTitle>
      {prefill.assisted && <Card style={{ backgroundColor: p.violetWash }}><Copy>Your booking request is started. Review the details here; nothing has been booked or paid.</Copy></Card>}
      <View style={s.tiles}>{SERVICES.map(service => <ServiceTile key={service} label={BOOKING_SERVICE_DETAILS[service].title}
        service={service} selected={input.service === service} onPress={() => change(withNativeBookingService(input, service))} />)}
        <ServiceTile label="Laundry" service="laundry" disabled /><ServiceTile label="Lux" service="lux" disabled /></View>
      <Copy>{details.detail}. Your price will be confirmed in your reviewed quote.</Copy>
    </>}

    {stage === 1 && <>
      <DisplayTitle>Tell us about your place</DisplayTitle>
      <Field label="Where do you need us? Full address" value={address} onChange={value => { clearConsent(); setAddress(value); }} placeholder="Street address, suburb and city" />
      <Field label="Area / suburb" value={area} onChange={value => { clearConsent(); setArea(value); }} maxLength={120} />
      <Copy>Your address and access notes stay in this form until a booking can be submitted.</Copy>
      <Label>What kind of place is it?</Label>
      <View style={s.tiles}>{BOOKING_PROPERTY_TYPES.map(property => <View key={property} style={s.tile}>
        <Choice label={BOOKING_PROPERTY_LABELS[property]} selected={input.propertyType === property} onPress={() => {
          if (property === input.propertyType) return;
          change(withBookingProperty(input, property));
        }} />
      </View>)}</View>
      <Copy>Changing the property clears your extras and linen choices. We check the service, then show any correction and its price for your review.</Copy>
      {serviceMismatch && <Card style={s.group}><Copy strong>{BOOKING_SERVICE_DETAILS[propertyService].title} suits this property</Copy>
        <Copy>Keep your current request to review the corrected service and default hours in your quote, or change the service now.</Copy>
        <Action secondary onPress={() => change(withNativeBookingService(input, propertyService))}>Change to the suggested service</Action></Card>}
      {['flat', 'house', 'townhouse'].includes(input.propertyType) && !['regular', 'express'].includes(input.service) && <Card style={s.group}>
        <Copy>Choose a home cleaning service for this property.</Copy><Action secondary onPress={() => change(withNativeBookingService(input, 'regular'))}>Choose regular cleaning</Action></Card>}
      {input.service !== 'office' && input.propertyType !== 'office' && <Card style={s.group}>
        <Stepper label="Bedrooms" min={0} max={8} value={bedrooms} onChange={value => {
          setBedrooms(value);
          change(withBookingRooms(input, value, bathrooms));
        }} />
        <Copy>Common areas always included</Copy>
        <Stepper label="Bathrooms" min={1} max={6} value={bathrooms} onChange={value => { setBathrooms(value); change(withBookingRooms(input, bedrooms, value)); }} />
      </Card>}
      <Card style={s.group}>{serviceMismatch ? <Copy>Base hours will be reset to the {BOOKING_SERVICE_DETAILS[propertyService].title.toLowerCase()} default in your quote. Change to that service above to adjust its hours.</Copy> : <Stepper label="Base cleaning hours" min={details.min} max={details.max} step={0.5} value={input.hours} onChange={hours => patch({ hours })} />}
        <Copy>Room counts set the starting duration for regular cleaning. Adjust in half-hour steps. Extras and crew affect the duration in your reviewed quote.</Copy></Card>
      {propertyService === 'airbnb' && <View style={s.group}><Label>Linen</Label>{BOOKING_LINEN_OPTIONS.map(linen =>
        <Choice key={linen} label={BOOKING_LINEN_LABELS[linen]} selected={input.linen === linen} disabled={serviceMismatch && linen === 'wash_dry_repack'}
          detail={serviceMismatch && linen === 'wash_dry_repack' ? 'Change to Airbnb cleaning first to choose the required hours.' : undefined} onPress={() => patch({ linen })} />)}
        {input.linen === 'wash_dry_repack' && (serviceMismatch || input.hours < 5) && <Copy>Choose Airbnb cleaning and at least 5 base hours for wash, dry and repack.</Copy>}</View>}
      {bookingExtrasFor(propertyService).length > 0 && <View style={s.group}><Label>Anything extra?</Label>{bookingExtrasFor(propertyService).map(extra =>
        <Choice key={extra} label={BOOKING_ADD_ONS[extra].label} checkbox selected={input.addOns.includes(extra)}
          onPress={() => patch({ addOns: input.addOns.includes(extra) ? input.addOns.filter(value => value !== extra) : [...input.addOns, extra] })} />)}</View>}
    </>}

    {stage === 2 && <>
      <DisplayTitle>When suits you?</DisplayTitle>
      <Label>How often</Label><View style={s.wrap}>{(Object.keys(BOOKING_FREQUENCY_LABELS) as (keyof typeof BOOKING_FREQUENCY_LABELS)[]).map(frequency =>
        <Choice key={frequency} label={BOOKING_FREQUENCY_LABELS[frequency]} selected={input.frequency === frequency}
          onPress={() => patch({ frequency, repeatDays: frequency === 'once' ? [] : validBookingDate(input.date, now) ? [bookingWeekday(input.date)] : [] })} />)}</View>
      <Label>Which day</Label><View style={s.wrap}>{[0, 1].map(days => <Choice key={days} label={days ? 'Tomorrow' : 'Today'}
        disabled={!bookingStartSlots({ ...input, date: bookingDateInSast(now, days) }, now).length} selected={input.date === bookingDateInSast(now, days)}
        onPress={() => change(withBookingDate(input, bookingDateInSast(now, days), Date.now()))} />)}</View>
      <Field label="Pick a date (YYYY-MM-DD)" value={input.date} onChange={date => change(withBookingDate(input, date))} placeholder="YYYY-MM-DD" maxLength={10} />
      {!validBookingDate(input.date, now) && <Copy>Choose a real date within the next year.</Copy>}
      <Label>Start time · South African time</Label>
      <View style={s.wrap}>{slots.map(time => <Choice key={time} label={time} selected={time === input.time} onPress={() => patch({ time })} />)}</View>
      {!slots.length && <Copy>No future start times for this date. Try tomorrow or choose another date.</Copy>}
      <Copy>{propertyService === 'airbnb' ? 'Airbnb visits must start by 14:00. ' : ''}These are requested times. Availability is confirmed after review.</Copy>
      <Card style={s.group}><Stepper label="Xooters in your crew" value={input.crewSize} min={1} max={bookingCrewCap(propertyService, input.homeSize)} onChange={crewSize => patch({ crewSize })} />
        <Copy>Your crew works together on one visit. The quote includes the crew and estimated duration.</Copy></Card>
      {input.frequency !== 'once' && <View style={s.group}><Label>Which weekdays?</Label><View style={s.wrap}>{DAYS.map((day, index) =>
        <Choice key={day} label={day} checkbox selected={input.repeatDays.includes(index)}
          disabled={validBookingDate(input.date, now) && index === bookingWeekday(input.date)} onPress={() => patch({ repeatDays: input.repeatDays.includes(index) ? input.repeatDays.filter(value => value !== index) : [...input.repeatDays, index].sort() })} />)}</View>
        <Copy>The first visit’s weekday stays included in your repeat pattern.</Copy></View>}
      <Label>Getting in</Label>{["I'll be home", 'Key with the concierge', 'Gate code — see notes', 'Key in the lockbox'].map(option =>
        <Choice key={option} label={option} selected={access === option} onPress={() => { clearConsent(); setAccess(option); }} />)}
      <Field label="Anything your Xooter should know? (optional)" value={notes} onChange={value => { clearConsent(); setNotes(value); }} multiline maxLength={1000} />
    </>}

    {stage === 3 && <>
      <DisplayTitle>Who feels right?</DisplayTitle>
      <Copy>Choose up to {input.crewSize} preferred {input.crewSize === 1 ? 'Xooter' : 'Xooters'} from the approved roster. This is a preference; date availability and your crew are confirmed after review.</Copy>
      <Choice label="Let Xoot match my crew" selected={chosen.length === 0} onPress={() => { clearConsent(); setChosen([]); }}><CoreIcon name="sparkles" color={p.violetDark} /></Choice>
      {rosterLoading && <ActivityIndicator accessibilityLabel="Loading the Xooter roster" color={p.violetDark} />}
      {rosterError && <Text selectable accessibilityRole="alert" style={s.error}>{rosterError}</Text>}
      {!rosterLoading && !rosterError && !roster.length && <Card><Copy>No Xooters are listed right now. You can retry or keep the matching preference.</Copy></Card>}
      {!rosterLoading && roster.map(person => <Choice key={person.id} label={person.name} checkbox selected={chosen.includes(person.id)}
        detail={[person.role, person.suburb_coverage.join(', ')].filter(Boolean).join(' · ')} disabled={!chosen.includes(person.id) && chosen.length >= input.crewSize}
        onPress={() => { clearConsent(); setChosen(current => current.includes(person.id) ? current.filter(id => id !== person.id) : [...current, person.id].slice(0, input.crewSize)); }}>
        <Avatar name={person.name} uri={person.photo_url} />
      </Choice>)}
      <Action secondary disabled={rosterLoading} onPress={() => setRosterRetry(value => value + 1)}>Refresh Xooter roster</Action>
    </>}

    {stage === 4 && <>
      <DisplayTitle>A fresh start, reviewed.</DisplayTitle>
      <Card style={s.group}>
        <Fact label="Service" value={BOOKING_SERVICE_DETAILS[priced?.service ?? input.service].title} />
        <Fact label="Property" value={BOOKING_PROPERTY_LABELS[input.propertyType]} />
        {input.service !== 'office' && input.propertyType !== 'office' && <Fact label="Home" value={`${bedrooms} bedrooms · ${bathrooms} bathrooms`} />}
        <Fact label="Crew" value={`${priced?.crewSize ?? input.crewSize} ${(priced?.crewSize ?? input.crewSize) === 1 ? 'Xooter' : 'Xooters'}, working on one visit`} />
        <Fact label="When" value={`${input.date} · ${input.time || 'Choose a time'} SAST`} />
        <Fact label="Frequency" value={`${BOOKING_FREQUENCY_LABELS[input.frequency]}${input.frequency !== 'once' ? ` · ${input.repeatDays.map(day => DAYS[day]).join(', ')}` : ''}`} />
        {priced && <Fact label="Estimated duration" value={`${priced.estimatedDurationHours} hours with your crew`} />}
        <Fact label="Where" value={[address, area].filter(Boolean).join(' · ')} />
        <Fact label="Getting in" value={access} />
        {notes.trim() && <Fact label="Your note" value={notes.trim()} />}
        <Fact label="Xooter preference" value={chosen.length ? roster.filter(person => chosen.includes(person.id)).map(person => person.name).join(', ') : 'Let Xoot match my crew'} />
      </Card>
      <Field label="Friend’s referral code (optional)" value={input.referralCode} maxLength={32} onChange={referralCode => patch({ referralCode })} />
      <Copy>A qualifying first booking can receive R100 off. Your quote checks the code and shows any discount.</Copy>
      <Choice label="Use my available Xoot credit" detail="Your quote checks your balance and applies the eligible amount." checkbox selected={input.requestedCreditCents > 0}
        onPress={() => patch({ requestedCreditCents: input.requestedCreditCents ? 0 : 100_000_000 })} />
      <Card><Copy strong>Visit cover is currently unavailable</Copy><Copy>No cover charge is added to this request.</Copy></Card>
      {issue && <><Text selectable accessibilityRole="alert" style={s.error}>{issue}</Text><Action secondary onPress={() => go(1)}>Edit property and service</Action><Action secondary onPress={() => go(2)}>Edit schedule</Action></>}
      {quoteLoading && <View style={s.row}><ActivityIndicator accessibilityLabel="Reviewing your quote" color={p.violetDark} /><Copy>Reviewing your quote…</Copy></View>}
      {quoteError && <Text selectable accessibilityRole="alert" style={s.error}>{quoteError}</Text>}
      {priced && !issue && <>
        {priced.serviceCorrection && <Card style={{ backgroundColor: p.honeyWash }}><Copy strong>Priced as {BOOKING_SERVICE_DETAILS[priced.service].title.toLowerCase()}</Copy>
          <Copy>{priced.serviceCorrection.reason}. Please review the corrected service and total below.</Copy>
          <Fact label="Corrected base hours" value={`${priced.input.hours} hours`} /></Card>}
        <Card style={s.group}>
          {priced.lines.map((line, index) => <View key={`${line.id}-${index}`} style={s.priceRow}><Text selectable style={[s.copy, s.grow]}>{line.label}</Text><Text selectable style={s.money}>{formatBookingMoney(line.amountCents)}</Text></View>)}
          <View style={s.divider} /><View style={s.priceRow}><Text style={s.total}>Total</Text><Text selectable style={s.total}>{formatBookingMoney(priced.totalCents)}</Text></View>
          <Copy>{BOOKING_REFERRAL_MESSAGES[priced.referral.status]}</Copy>
        </Card>
        <Choice checkbox label={`I accept ${BOOKING_SERVICE_DETAILS[priced.service].title.toLowerCase()} and the reviewed total of ${formatBookingMoney(priced.totalCents)}`}
          detail="This records your review in this form only. It does not create a booking or take payment." selected={accepted}
          onPress={() => { if (!nativeBookingIssue(input, address, Date.now())) setAccepted(value => !value); else setNow(Date.now()); }} />
        <Card style={{ backgroundColor: p.honeyWash }}><Copy strong>Online confirmation is not available in the app yet</Copy>
          <Copy>{accepted ? 'You have reviewed this quote. ' : ''}No visit has been booked and no payment has been taken. Contact support for help.</Copy></Card>
      </>}
      <Action secondary disabled={quoteLoading || !!issue} onPress={retryQuote}>{quoteError ? 'Retry quote' : 'Refresh quote'}</Action>
      <Action onPress={() => router.push('/concierge')}>Contact Xoot support</Action>
    </>}
    {stage < 4 && <>
      {stage === 1 && address.trim().length < 5 && <Copy>Enter your full address to continue.</Copy>}
      {stage === 2 && issue && <Text selectable accessibilityRole="alert" style={s.error}>{issue}</Text>}
      <Action disabled={(stage === 1 && (address.trim().length < 5 || (propertyService === 'airbnb' && input.linen === 'wash_dry_repack' && (serviceMismatch || input.hours < 5)))) || (stage >= 2 && !!issue)}
        onPress={() => go(stage + 1)}>{stage === 3 ? 'Review my visit' : 'Continue'}</Action>
      <Text style={s.footer}>Your quote is reviewed before any booking is submitted.</Text>
    </>}
  </ScrollView>;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: p.page }, content: { paddingHorizontal: 20, gap: 16, alignSelf: 'center', width: '100%', maxWidth: 680 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 }, headerTitle: { fontFamily: nativeFonts.bodyBold, fontSize: 17, color: p.ink },
  grow: { flex: 1, flexShrink: 1, minWidth: 0 }, copy: { color: p.inkSoft, fontFamily: nativeFonts.body, fontSize: 14, lineHeight: 21 },
  strong: { fontFamily: nativeFonts.bodyBold, color: p.ink }, detail: { color: p.inkSoft, fontFamily: nativeFonts.body, fontSize: 12, lineHeight: 18 },
  label: { color: p.inkSoft, fontFamily: nativeFonts.bodyBold, fontSize: 12, letterSpacing: 0.6 },
  group: { gap: 12 }, row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, tile: { flexBasis: 150, flexGrow: 1 },
  serviceTile: { flexBasis: '30%', flexGrow: 1, minWidth: 78, alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 112, borderWidth: 1, borderColor: p.border, borderRadius: 16, paddingHorizontal: 8, paddingVertical: 14 },
  serviceLabel: { fontSize: 11.5, lineHeight: 14.5 }, center: { textAlign: 'center' },
  choice: { flexDirection: 'row', gap: 10, alignItems: 'center', minHeight: 50, padding: 13, borderWidth: 1, borderColor: p.border, backgroundColor: p.card, borderRadius: 16, borderCurve: 'continuous' },
  selected: { borderColor: p.violet, backgroundColor: p.violetWash, borderWidth: 2, padding: 12 }, choiceText: { fontFamily: nativeFonts.bodyBold, color: p.ink, fontSize: 14, lineHeight: 20 }, selectedText: { color: p.violetDark },
  unavailable: { opacity: 0.58 }, pressed: { opacity: 0.8 }, field: { borderWidth: 1, borderColor: p.borderStrong, borderRadius: 14, minHeight: 52, backgroundColor: p.card, paddingHorizontal: 14, paddingVertical: 12, fontFamily: nativeFonts.body, fontSize: 16, color: p.ink },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 8 }, counterButton: { minHeight: 48, minWidth: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 24, borderWidth: 1, borderColor: p.border, backgroundColor: p.card },
  counterSymbol: { fontFamily: nativeFonts.body, fontSize: 24, color: p.ink }, number: { minWidth: 34, textAlign: 'center', fontFamily: nativeFonts.mono, fontVariant: ['tabular-nums'], color: p.ink, fontSize: 16 },
  progress: { flexDirection: 'row', gap: 5, paddingBottom: 8 }, segment: { flex: 1, height: 4, backgroundColor: p.border, borderRadius: 4 }, segmentOn: { backgroundColor: p.violet },
  action: { backgroundColor: p.ink, borderRadius: 28, paddingHorizontal: 20, paddingVertical: 15, minHeight: 52, alignItems: 'center', justifyContent: 'center' }, actionText: { fontFamily: nativeFonts.bodyBold, fontSize: 15, lineHeight: 22, color: p.card, textAlign: 'center' },
  secondaryAction: { borderWidth: 1, borderColor: p.borderStrong, backgroundColor: p.card }, secondaryText: { color: p.ink }, footer: { color: p.inkSoft, fontFamily: nativeFonts.body, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  fact: { gap: 3 }, priceRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }, money: { fontFamily: nativeFonts.mono, color: p.ink, fontSize: 14 },
  total: { fontFamily: nativeFonts.bodyBold, fontSize: 22, color: p.ink }, divider: { height: 1, backgroundColor: p.border }, error: { color: p.honeyInk, backgroundColor: p.honeyWash, borderRadius: 12, padding: 12, fontFamily: nativeFonts.body, fontSize: 14, lineHeight: 21 },
});
