import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { CoreIcon, EmptyState, IconButton, LoadingRows, Screen, nativeCoreStyles, nativeFonts, nativePalette, useNativeCoreData } from '@/components/native-core';
import { nativeNotificationDestination } from '@/lib/handoff-search';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export default function NotificationsScreen() {
  const { user } = useAuth();
  const { unreadNotifications, refresh } = useNativeCoreData();
  const client = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const queryKey = ['native-notifications', user?.id];
  const feed = useQuery({ queryKey, enabled: Boolean(user), queryFn: async () => {
    const { data, error: failure } = await supabase.from('notifications').select('id,title,body,kind,link,read,created_at')
      .eq('user_id', user!.id).order('created_at', { ascending: false }).limit(100);
    if (failure) throw failure;
    return data;
  } });
  const markRead = useMutation({ mutationFn: async (id?: string) => {
    if (!user) throw new Error('Sign in to update notifications.');
    let request = supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
    if (id) request = request.eq('id', id);
    const { error: failure } = await request;
    if (failure) throw failure;
  }, onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey }), refresh()]); } });
  const open = async (id: string | undefined, link: string | null = null) => {
    setError(null);
    try {
      await markRead.mutateAsync(id);
      const destination = nativeNotificationDestination(link);
      if (destination) router.push(destination as Href);
    } catch { setError('The read status could not be saved. Please try again.'); }
  };

  return <Screen refreshControl={<RefreshControl refreshing={feed.isFetching} onRefresh={() => { if (user) void feed.refetch(); }} tintColor={nativePalette.violet} />}>
    <View style={styles.header}>
      <IconButton icon="arrow-left" label="Back" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} />
      <View style={styles.flex}><Text accessibilityRole="header" style={styles.heading}>Notifications</Text><Text style={styles.detail}>{user ? unreadNotifications ? `${unreadNotifications} new` : 'All caught up' : 'Your Xoot updates'}</Text></View>
      {user && unreadNotifications > 0 ? <Pressable accessibilityRole="button" disabled={markRead.isPending} onPress={() => void open(undefined)}><Text style={styles.mark}>{markRead.isPending ? 'Saving…' : 'Mark all read'}</Text></Pressable> : null}
    </View>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    {!user ? <EmptyState title="Your updates, together" detail="Sign in to see real booking and account notifications." action="Sign in" onAction={() => router.push('/account')} />
      : feed.isPending ? <LoadingRows />
      : feed.isError ? <EmptyState title="Updates could not be loaded" detail="Check your connection and try again." action="Try again" onAction={() => void feed.refetch()} />
      : !feed.data.length ? <EmptyState title="All quiet for now" detail="Booking and account updates will appear here when there is something new." />
      : feed.data.map((item) => <Pressable key={item.id} accessibilityRole={item.read && !nativeNotificationDestination(item.link) ? 'text' : 'button'} accessibilityLabel={`${item.read ? '' : 'Unread. '}${item.title}. ${item.body}`}
        disabled={markRead.isPending || (item.read && !nativeNotificationDestination(item.link))} onPress={() => void open(item.id, item.link)}
        style={({ pressed }) => [styles.item, item.read ? styles.read : styles.unread, pressed && nativeCoreStyles.pressed]}>
        <View style={styles.glyph}><CoreIcon name={/booking|visit/.test(item.kind) ? 'calendar' : /payment|credit/.test(item.kind) ? 'wallet' : 'bell'} size={19} /></View>
        <View style={styles.flex}><Text selectable style={styles.title}>{item.title}</Text><Text selectable style={styles.body}>{item.body}</Text>
          <Text selectable style={styles.when}>{new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(item.created_at))}</Text></View>
        {!item.read ? <View style={styles.dot} /> : null}
      </Pressable>)}
    {feed.data?.length === 100 ? <Text style={styles.detail}>Showing your latest 100 updates.</Text> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: -4, marginBottom: 4 }, flex: { flex: 1, minWidth: 0, gap: 2 },
  heading: { fontFamily: nativeFonts.display, fontSize: 24, color: nativePalette.ink }, detail: { fontFamily: nativeFonts.body, fontSize: 11, color: nativePalette.inkSoft },
  mark: { fontFamily: nativeFonts.bodyBold, fontSize: 11, color: nativePalette.violetDark },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16, borderRadius: 20, borderWidth: 1 },
  read: { borderColor: nativePalette.border }, unread: { backgroundColor: nativePalette.card, borderColor: nativePalette.card },
  glyph: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: nativePalette.blushWash },
  title: { fontFamily: nativeFonts.bodyBold, fontSize: 14, color: nativePalette.ink }, body: { fontFamily: nativeFonts.body, fontSize: 12, color: nativePalette.inkSoft, lineHeight: 18 },
  when: { fontFamily: nativeFonts.body, fontSize: 10, color: nativePalette.muted, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: nativePalette.violet, marginTop: 6 }, error: { color: nativePalette.careInk, fontFamily: nativeFonts.body, fontSize: 13 },
});
