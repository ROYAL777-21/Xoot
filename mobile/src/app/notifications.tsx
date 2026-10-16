import { useInfiniteQuery } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import {
  Card, CoreIcon, EmptyState, IconButton, LoadingRows, Screen,
  nativeCoreStyles, nativeFonts, nativePalette, useNativeCoreData,
} from '@/components/native-core';
import { nativeNotificationDestination } from '@/lib/handoff-search';
import {
  NATIVE_NOTIFICATION_PAGE_SIZE, olderNativeNotificationFilter,
  parseNativeNotificationPage, validateNativeNotificationHistory,
  type NativeNotification, type NativeNotificationCursor,
} from '@/lib/native-notifications';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

type NotificationPage = { items: NativeNotification[]; hasMore: boolean };
const dateFormat = new Intl.DateTimeFormat('en-ZA', {
  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
});

function NotificationsForOwner({ userId }: { userId: string }) {
  const { unreadNotifications, refresh: refreshCore } = useNativeCoreData();
  const [refreshNumber, setRefreshNumber] = useState(0);
  const snapshot = useMemo(() => new Date().toISOString(), [refreshNumber]);
  const [saving, setSaving] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const active = useRef(true);
  const savingRef = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);
  const feed = useInfiniteQuery({
    queryKey: ['native-notifications', userId, snapshot],
    initialPageParam: null as NativeNotificationCursor | null,
    queryFn: async ({ pageParam, signal }): Promise<NotificationPage> => {
      let request = supabase.from('notifications')
        .select('id,user_id,title,body,kind,link,read,created_at')
        .eq('user_id', userId)
        .lte('created_at', snapshot)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(NATIVE_NOTIFICATION_PAGE_SIZE + 1)
        .abortSignal(signal);
      if (pageParam) {
        const predicate = olderNativeNotificationFilter(pageParam);
        if (!predicate) throw new Error('Invalid notification cursor');
        request = request.or(predicate);
      }
      const { data, error } = await request;
      if (error || !data) throw new Error('Unable to verify notification history');
      const parsed = parseNativeNotificationPage(data, {
        owner: userId, snapshot, cursor: pageParam ?? undefined,
      });
      if (!parsed) throw new Error('Notification history failed owner or ordering checks');
      return {
        items: parsed.slice(0, NATIVE_NOTIFICATION_PAGE_SIZE),
        hasMore: parsed.length > NATIVE_NOTIFICATION_PAGE_SIZE,
      };
    },
    getNextPageParam: (page) => page.hasMore ? page.items[page.items.length - 1] : undefined,
    retry: 1,
  });
  const pages = feed.data?.pages ?? [];
  const verified = validateNativeNotificationHistory(pages);
  const items = verified ? pages.flatMap(page => page.items) : [];
  const refresh = () => {
    setActionError(null);
    setRefreshNumber(value => value + 1);
    void refreshCore();
  };
  const changeReadState = async (item?: NativeNotification) => {
    if (savingRef.current) return;
    const destination = item ? nativeNotificationDestination(item.link) : null;
    if (item?.read) {
      if (destination) router.push(destination as Href);
      return;
    }
    savingRef.current = true;
    setSaving(item?.id ?? 'all');
    setActionError(null);
    try {
      let update = supabase.from('notifications')
        .update({ read: true }).eq('user_id', userId).eq('read', false);
      if (item) update = update.eq('id', item.id);
      const { error } = await update;
      if (error) throw error;
      if (!active.current) return;
      setRefreshNumber(value => value + 1);
      await refreshCore();
      if (active.current && destination) router.push(destination as Href);
    } catch {
      if (active.current) setActionError('Read status could not be confirmed. Please retry.');
    } finally {
      savingRef.current = false;
      if (active.current) setSaving(null);
    }
  };

  return <Screen refreshControl={<RefreshControl
    refreshing={feed.isRefetching} onRefresh={refresh} tintColor={nativePalette.violet} />}>
    <View style={styles.header}>
      <IconButton icon="arrow-left" label="Back"
        onPress={() => router.canGoBack() ? router.back() : router.replace('/')} />
      <View style={styles.flex}>
        <Text accessibilityRole="header" style={styles.heading}>Notifications</Text>
        <Text style={styles.detail}>{unreadNotifications > 0 ? `${unreadNotifications} unread` : 'All caught up'}</Text>
      </View>
      {unreadNotifications > 0 ? <Pressable accessibilityRole="button" disabled={saving !== null}
        onPress={() => void changeReadState()} style={styles.markAction}>
        <Text style={styles.mark}>{saving === 'all' ? 'Saving…' : 'Mark all read'}</Text>
      </Pressable> : null}
    </View>
    {actionError ? <Text accessibilityRole="alert" style={styles.error}>{actionError}</Text> : null}
    {feed.isPending ? <LoadingRows />
      : feed.isError || !verified
        ? <EmptyState title="Updates could not be verified"
            detail="Your notification history is temporarily unavailable. No read status was changed."
            action="Try again" onAction={refresh} />
        : items.length === 0
          ? <EmptyState title="All quiet for now"
              detail="Booking and account updates will appear when there is something new." />
          : <>
            <View style={styles.feedIntro}>
              <Text style={styles.intro}>Your Xoot updates</Text>
              <Text style={styles.detail}>Only updates belonging to this account are shown.</Text>
            </View>
            {items.map(item => {
              const destination = nativeNotificationDestination(item.link);
              const actionable = !item.read || Boolean(destination);
              return <Pressable key={item.id}
                accessibilityRole={actionable ? 'button' : 'text'}
                accessibilityLabel={`${item.read ? '' : 'Unread. '}${item.title}. ${item.body}`}
                disabled={saving !== null || !actionable}
                onPress={() => void changeReadState(item)}
                style={({ pressed }) => [
                  styles.item, item.read ? styles.read : styles.unread,
                  pressed && nativeCoreStyles.pressed,
                ]}>
                <View style={styles.glyph}>
                  <CoreIcon name={/booking|visit/i.test(item.kind) ? 'calendar'
                    : /payment|credit/i.test(item.kind) ? 'wallet' : 'bell'} size={19} />
                </View>
                <View style={styles.flex}>
                  <Text selectable style={styles.title}>{item.title}</Text>
                  <Text selectable style={styles.body}>{item.body}</Text>
                  <Text selectable style={styles.when}>{dateFormat.format(new Date(item.created_at))}</Text>
                </View>
                {!item.read ? <View style={styles.dot} /> : null}
              </Pressable>;
            })}
            <Card style={styles.footer}>
              <Text style={styles.detail}>{items.length} recorded updates loaded</Text>
              {feed.hasNextPage ? <Pressable accessibilityRole="button"
                disabled={feed.isFetchingNextPage || saving !== null}
                onPress={() => void feed.fetchNextPage()}
                style={styles.more}>
                {feed.isFetchingNextPage ? <ActivityIndicator color={nativePalette.violet} /> : null}
                <Text style={styles.moreText}>{feed.isFetchingNextPage ? 'Loading older updates…' : 'Load older updates'}</Text>
              </Pressable> : <Text style={styles.detail}>End of your available history.</Text>}
              {feed.isFetchNextPageError ? <Text accessibilityRole="alert" style={styles.error}>
                Older updates could not be verified. Tap ‘Load older updates’ to retry.</Text> : null}
            </Card>
          </>}
  </Screen>;
}

export default function NotificationsScreen() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Screen><LoadingRows /></Screen>;
  if (!user) return <Screen>
    <View style={styles.header}>
      <IconButton icon="arrow-left" label="Back"
        onPress={() => router.canGoBack() ? router.back() : router.replace('/')} />
      <Text accessibilityRole="header" style={styles.heading}>Notifications</Text>
    </View>
    <EmptyState title="Your updates, together"
      detail="Sign in to see your real booking and account notifications."
      action="Sign in" onAction={() => router.push('/account')} />
  </Screen>;
  // Remount on identity change; all pages, unread actions and link navigation
  // become invisible synchronously instead of briefly showing another account.
  return <NotificationsForOwner key={user.id} userId={user.id} />;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: -4, marginBottom: 4 },
  flex: { flex: 1, minWidth: 0, gap: 3 },
  heading: { fontFamily: nativeFonts.display, fontSize: 24, color: nativePalette.ink },
  detail: { fontFamily: nativeFonts.body, fontSize: 11, color: nativePalette.inkSoft },
  intro: { fontFamily: nativeFonts.display, fontSize: 19, color: nativePalette.ink },
  feedIntro: { gap: 3, marginTop: 6 },
  markAction: { minHeight: 42, justifyContent: 'center' },
  mark: { fontFamily: nativeFonts.bodyBold, fontSize: 11, color: nativePalette.violetDark },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16,
    borderRadius: 20, borderWidth: 1 },
  read: { borderColor: nativePalette.border },
  unread: { backgroundColor: nativePalette.card, borderColor: nativePalette.card },
  glyph: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, backgroundColor: nativePalette.blushWash },
  title: { fontFamily: nativeFonts.bodyBold, fontSize: 14, color: nativePalette.ink },
  body: { fontFamily: nativeFonts.body, fontSize: 12, color: nativePalette.inkSoft, lineHeight: 18 },
  when: { fontFamily: nativeFonts.body, fontSize: 10, color: nativePalette.muted, marginTop: 5 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: nativePalette.violet, marginTop: 6 },
  error: { color: nativePalette.careInk, fontFamily: nativeFonts.body, fontSize: 13 },
  footer: { gap: 10, alignItems: 'flex-start' },
  more: { minHeight: 43, paddingHorizontal: 16, borderWidth: 1,
    borderColor: nativePalette.border, borderRadius: 22, justifyContent: 'center',
    alignItems: 'center', gap: 8, flexDirection: 'row' },
  moreText: { color: nativePalette.violetDark, fontFamily: nativeFonts.bodyBold, fontSize: 12 },
});
