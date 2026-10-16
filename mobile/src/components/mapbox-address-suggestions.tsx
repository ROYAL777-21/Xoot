import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { mobileEnv } from '@/lib/env';
import { nativeMapboxSearchUrl, parseNativeMapboxSuggestions, type NativeMapboxSuggestion } from '@/lib/mapbox-geocoding';
import { nativePalette as p } from '@/constants/handoff';
import { nativeFonts } from '@/components/native-core';

/** Optional user-consented search. Existing native address TextInput remains the fallback. */
export function MobileMapboxAddressSuggestions({ value, onSelect }: { value: string; onSelect: (address: string) => void }) {
  const token = mobileEnv.mapboxPublicToken;
  const [enabled, setEnabled] = useState(false);
  const [items, setItems] = useState<NativeMapboxSuggestion[]>([]);
  const [state, setState] = useState<'idle'|'loading'|'empty'|'error'>('idle');
  const [selected, setSelected] = useState('');
  const [confirming, setConfirming] = useState(false);
  const seq = useRef(0);
  const chosen = useRef<AbortController | null>(null);

  useEffect(() => () => chosen.current?.abort(), []);
  // A changed address invalidates an outstanding Permanent Geocoding confirmation.
  // A slow provider response must not overwrite newer customer-typed text.
  useEffect(() => {
    chosen.current?.abort();
    setConfirming(false);
  }, [value]);

  useEffect(() => {
    const url = enabled && selected !== value ? nativeMapboxSearchUrl(value, token) : null;
    if (!url) { setItems([]); setState('idle'); return; }
    const controller = new AbortController();
    const current = ++seq.current;
    setState('loading'); setItems([]);
    const timer = setTimeout(() => {
      void fetch(url, { signal: controller.signal, cache: 'no-store' }).then(async response => {
        if (!response.ok) throw new Error('Suggestions unavailable');
        const data: unknown = await response.json();
        if (controller.signal.aborted || current !== seq.current) return;
        const result = parseNativeMapboxSuggestions(data);
        setItems(result); setState(result.length ? 'idle' : 'empty');
      }).catch(() => {
        if (controller.signal.aborted || current !== seq.current) return;
        setItems([]); setState('error');
      });
    }, 450);
    return () => { clearTimeout(timer); controller.abort(); seq.current += 1; };
  }, [enabled, selected, token, value]);

  async function choose(item: NativeMapboxSuggestion) {
    // Temporary results are never stored: reconfirm selected ID under Permanent Geocoding.
    chosen.current?.abort();
    const url = nativeMapboxSearchUrl(item.label, token, true);
    if (!url) { setState('error'); return; }
    const controller = new AbortController();
    chosen.current = controller;
    seq.current += 1;
    setItems([]); setConfirming(true);
    try {
      const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
      if (!response.ok) throw new Error('Permanent address confirmation unavailable');
      const body: unknown = await response.json();
      if (controller.signal.aborted) return;
      const verified = parseNativeMapboxSuggestions(body).find(x => x.id === item.id);
      if (!verified) throw new Error('Address not confirmed');
      setSelected(verified.label);
      setState('idle');
      onSelect(verified.label);
    } catch { if (!controller.signal.aborted) setState('error'); }
    finally { if (!controller.signal.aborted) setConfirming(false); }
  }

  if (!token.startsWith('pk.')) return null;
  return <View style={s.group}>
    <Pressable accessibilityRole="button" accessibilityState={{ selected: enabled }}
      accessibilityLabel={enabled ? 'Disable Mapbox address suggestions' : 'Enable Mapbox address suggestions'}
      onPress={() => { chosen.current?.abort(); setConfirming(false); setEnabled(x => !x); setItems([]); setState('idle'); }}
      style={s.toggle}><Text style={s.toggleLabel}>{enabled ? 'Disable address suggestions' : 'Suggest South African addresses'}</Text></Pressable>
    <Text style={s.note}>{enabled ? 'Your typed search is being sent to Mapbox.' : 'Optional: when enabled, the address you type is sent to Mapbox. Manual entry works without this.'}</Text>
    {enabled && items.map(item => <Pressable key={item.id} accessibilityRole="button"
      accessibilityLabel={`Use suggested address: ${item.label}`}
      style={s.suggestion} onPress={() => void choose(item)}>
      <Text style={s.label}>{item.label}</Text></Pressable>)}
    {enabled && confirming && <Text accessibilityLiveRegion="polite" style={s.note}>Confirming selected address…</Text>}
    {enabled && state === 'loading' && !confirming && <Text accessibilityLiveRegion="polite" style={s.note}>Searching Mapbox addresses…</Text>}
    {enabled && state === 'error' && <Text accessibilityLiveRegion="polite" style={s.note}>Suggestions unavailable. Enter your address manually.</Text>}
    {enabled && state === 'empty' && <Text accessibilityLiveRegion="polite" style={s.note}>No suggestions found. Enter your address manually.</Text>}
    {enabled && <Text style={s.note}>Selected Mapbox suggestions require Permanent Geocoding before being included in your booking. Coverage is confirmed separately.</Text>}
  </View>;
}

const s = StyleSheet.create({
  group: { gap: 8 },
  toggle: { alignSelf: 'flex-start', borderWidth: 1, borderColor: p.border, borderRadius: 18, paddingHorizontal: 14,
    paddingVertical: 10, minHeight: 44, justifyContent: 'center', backgroundColor: p.card },
  toggleLabel: { fontFamily: nativeFonts.bodyBold, color: p.violetDark, fontSize: 13 },
  note: { color: p.inkSoft, fontFamily: nativeFonts.body, fontSize: 12, lineHeight: 18 },
  suggestion: { borderColor: p.border, borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 44,
    justifyContent: 'center', backgroundColor: p.card },
  label: { color: p.ink, fontFamily: nativeFonts.body, fontSize: 13 },
});
