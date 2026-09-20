import { router, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Avatar, Card, CoreIcon, EmptyState, IconButton, Screen, SectionLabel, nativeCoreStyles, nativeFonts, nativePalette, useNativeCoreData, type CoreIconName } from '@/components/native-core';
import { mobileEnv } from '@/lib/env';
import { buildNativeSearchIndex, matchesNativeSearch, searchableServices, type NativeSearchEntry } from '@/lib/handoff-search';
import { useAuth } from '@/providers/auth-provider';

export default function SearchScreen() {
  const { user } = useAuth();
  const { profile, bookings } = useNativeCoreData();
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const term = query.trim();
  const index = useMemo(() => buildNativeSearchIndex(profile, user?.email), [profile, user?.email]);
  const entries = index.filter((entry) => matchesNativeSearch(term, entry.title, entry.detail, entry.keywords));
  const services = searchableServices.filter((service) => matchesNativeSearch(term, service.title, service.keywords));
  const people = [...new Map(bookings.filter((booking) => ['completed', 'rated'].includes(booking.status) && booking.xooter?.id)
    .map((booking) => [booking.xooter!.id, booking.xooter!])).values()]
    .filter((person) => matchesNativeSearch(term, person.name));
  const ask = () => router.push({ pathname: '/concierge', params: { question: term } });

  const openEntry = async (entry: NativeSearchEntry) => {
    setError(null);
    if (entry.href) { router.push(entry.href as Href); return; }
    if (entry.websitePath) {
      try { await Linking.openURL(new URL(entry.websitePath, mobileEnv.siteUrl || 'https://xoot.co.za').href); }
      catch { setError('The policy could not be opened. Check your connection and try again.'); }
    }
  };

  return <Screen>
    <View style={styles.header}>
      <IconButton icon="arrow-left" label="Back" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} />
      <View style={styles.search}>
        <CoreIcon name="search" color={nativePalette.muted} size={17} />
        <TextInput accessibilityLabel="Search anything in Xoot" autoFocus autoCorrect={false} value={query} onChangeText={setQuery}
          placeholder="Search anything in Xoot" placeholderTextColor={nativePalette.muted} returnKeyType="search" style={styles.input} />
        {query ? <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={8} onPress={() => setQuery('')}><Text style={styles.clear}>×</Text></Pressable> : null}
      </View>
    </View>
    {error ? <Text accessibilityRole="alert" selectable style={styles.error}>{error}</Text> : null}
    {!term ? <>
      <Pressable accessibilityRole="button" onPress={ask} style={({ pressed }) => pressed && nativeCoreStyles.pressed}>
        <Card style={styles.concierge}><CoreIcon name="sparkles" color={nativePalette.violetDark} size={24} /><View style={styles.flex}>
          <Text style={styles.title}>Ask Xoot Concierge</Text><Text style={styles.detail}>When is my Xooter arriving?</Text>
        </View><CoreIcon name="chevron-right" size={17} /></Card>
      </Pressable>
      <SectionLabel>Try</SectionLabel>
      <View style={styles.tags}>{['Gate code', 'Visits', 'Care+', 'Terms', 'Cancel'].map((word) => <Pressable key={word} accessibilityRole="button" onPress={() => setQuery(word)} style={styles.tag}><Text style={styles.tagText}>{word}</Text></Pressable>)}</View>
      <SectionLabel>Services</SectionLabel>
      {searchableServices.slice(0, 3).map((service) => <SearchRow key={service.key} icon={service.icon} title={service.title} detail={service.detail} onPress={() => router.push({ pathname: '/book', params: { service: service.key } })} />)}
    </> : <>
      {services.length ? <><SectionLabel count={services.length}>Services</SectionLabel>{services.map((service) => <SearchRow key={service.key} icon={service.icon} title={service.title} detail={service.detail} onPress={() => router.push({ pathname: '/book', params: { service: service.key } })} />)}</> : null}
      {people.length ? <><SectionLabel count={people.length}>Xooters you&apos;ve had</SectionLabel>{people.map((person) => <Pressable key={person.id} accessibilityRole="button" onPress={() => router.push('/bookings')} style={({ pressed }) => pressed && nativeCoreStyles.pressed}><Card style={styles.row}><Avatar name={person.name} uri={person.photo_url} /><View style={styles.flex}><Text style={styles.title}>{person.name}</Text><Text style={styles.detail}>View your visits together</Text></View><CoreIcon name="chevron-right" size={17} /></Card></Pressable>)}</> : null}
      {(['Your details', 'Settings', 'Care+', 'Help & policies'] as const).map((group) => {
        const rows = entries.filter((entry) => entry.group === group);
        return rows.length ? <View key={group} style={styles.group}><SectionLabel count={rows.length}>{group}</SectionLabel>{rows.map((entry) => <SearchRow key={entry.id} icon={entry.icon} title={entry.title} detail={entry.detail} onPress={() => void openEntry(entry)} />)}</View> : null;
      })}
      {!services.length && !people.length && !entries.length ? <EmptyState title={`Nothing matching “${term}”`} detail="Concierge might know — it can answer things the index can’t." action="Ask Xoot Concierge" onAction={ask} /> : null}
    </>}
  </Screen>;
}

function SearchRow({ icon, title, detail, onPress }: { icon: CoreIconName; title: string; detail: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => pressed && nativeCoreStyles.pressed}><Card style={styles.row}>
    <View style={styles.glyph}><CoreIcon name={icon} size={19} /></View><View style={styles.flex}><Text numberOfLines={2} style={styles.title}>{title}</Text><Text style={styles.detail}>{detail}</Text></View><CoreIcon name="chevron-right" color={nativePalette.muted} size={17} />
  </Card></Pressable>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: -4, marginBottom: 2 },
  search: { flex: 1, minHeight: 46, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 14, backgroundColor: nativePalette.card, borderWidth: 1, borderColor: nativePalette.border },
  input: { flex: 1, minWidth: 0, color: nativePalette.ink, fontFamily: nativeFonts.body, fontSize: 14, minHeight: 44 },
  clear: { color: nativePalette.inkSoft, fontSize: 22 }, flex: { flex: 1, minWidth: 0, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: nativePalette.border, boxShadow: 'none', padding: 16 },
  glyph: { width: 38, height: 38, borderRadius: 12, backgroundColor: nativePalette.sunken, alignItems: 'center', justifyContent: 'center' },
  title: { color: nativePalette.ink, fontFamily: nativeFonts.bodyBold, fontSize: 14 },
  detail: { color: nativePalette.inkSoft, fontFamily: nativeFonts.body, fontSize: 12, lineHeight: 18 },
  concierge: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: nativePalette.violetWash },
  tags: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' }, tag: { borderRadius: 999, paddingHorizontal: 13, paddingVertical: 9, backgroundColor: nativePalette.sunken },
  tagText: { color: nativePalette.inkSoft, fontFamily: nativeFonts.bodyBold, fontSize: 12 }, group: { gap: 8 },
  error: { color: nativePalette.careInk, fontFamily: nativeFonts.body, fontSize: 13 },
});
