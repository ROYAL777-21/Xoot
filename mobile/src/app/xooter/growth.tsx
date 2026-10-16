import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import {
  Card, CoreIcon, DisplayTitle, EmptyState, LoadingRows, Pill, PrimaryAction,
  Screen, SectionLabel, nativeFonts, nativePalette,
} from '@/components/native-core';
import { supabase } from '@/lib/supabase';
import { summariseXooterGrowth, xooterGrowthPercentage } from '@/lib/native-xooter-growth';
import {
  parseTrainingModule, parseTrainingProgress,
  type XooterTrainingModule, type XooterTrainingProgress,
} from '@/lib/native-xooter-trust';
import { useAuth } from '@/providers/auth-provider';

type GrowthState = {
  loading: boolean;
  error: string | null;
  modules: XooterTrainingModule[];
  progress: XooterTrainingProgress[];
  hasXooterProfile: boolean;
  truncated: boolean;
};

const initial: GrowthState = {
  loading: true, error: null, modules: [], progress: [],
  hasXooterProfile: false, truncated: false,
};

function ProgressBar({ done, total, label }: { done: number; total: number; label: string }) {
  const progress = xooterGrowthPercentage(done, total);
  return <View accessible accessibilityLabel={`${label}: ${done} of ${total} complete`} style={s.barContainer}>
    <View style={s.barTrack}>
      <View style={[s.barFill, { width: `${progress}%` }]} />
    </View>
    <Text style={s.small}>{done} of {total} completed</Text>
  </View>;
}

function ModuleCard({ module, completed }: {
  module: XooterTrainingModule; completed: boolean;
}) {
  return <Card style={s.module}>
    <View style={s.moduleIcon}>
      <CoreIcon name={completed ? 'check' : 'book-open'}
        color={completed ? nativePalette.sageInk : nativePalette.violetDark} size={21}/>
    </View>
    <View style={s.flex}>
      <Text style={s.moduleTitle}>{module.title}</Text>
      {module.description ? <Text style={s.body}>{module.description}</Text> : null}
      <View style={s.tags}>
        <Pill tone={completed ? 'success' : module.required ? 'warning' : 'neutral'}>
          {completed ? 'Recorded complete' : module.required ? 'Required' : 'Optional'}
        </Pill>
        {module.rank_points !== null ? <Text style={s.tag}>
          {completed ? '+' : ''}{module.rank_points} recognition points
        </Text> : null}
      </View>
      {module.badge_label ? <Text style={s.badge}>
        {completed ? 'Earned recognition: ' : 'Recognition available: '}{module.badge_label}
      </Text> : null}
    </View>
  </Card>;
}

function XooterGrowthForAccount({ userId }: { userId: string }) {
  const [state, setState] = useState<GrowthState>(initial);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const retry = useCallback(() => setRefreshVersion(value => value + 1), []);

  useEffect(() => {
    let alive = true;
    setState(initial);
    void (async () => {
      try {
        const [catalog, owner] = await Promise.all([
          // Never request quiz_questions or marking keys.
          supabase.from('training_modules')
            .select('id,title,description,required,duration_min,badge_label,rank_points', { count: 'exact' })
            .order('required', { ascending: false })
            .order('title', { ascending: true }).limit(101),
          supabase.from('xooters')
            .select('id,user_id').eq('user_id', userId).maybeSingle(),
        ]);
        if (!alive) return;
        if (catalog.error || !catalog.data || owner.error) throw new Error('Training data unavailable');
        if (owner.data && owner.data.user_id !== userId) throw new Error('Owner mismatch');
        const parsedModules = catalog.data.map(row => parseTrainingModule(row));
        if (parsedModules.some(module => !module)) throw new Error('Malformed training catalogue');

        let progress: XooterTrainingProgress[] = [];
        let truncated = catalog.count === null || catalog.count > 100 || catalog.data.length > 100;
        if (owner.data) {
          const result = await supabase.from('xooter_training_progress')
            .select('module_id,completed,completed_at', { count: 'exact' })
            .eq('xooter_id', owner.data.id).limit(101);
          if (!alive) return;
          if (result.error || !result.data) throw new Error('Training progress unavailable');
          const parsedProgress = result.data.map(row => parseTrainingProgress(row));
          if (parsedProgress.some(row => !row)) throw new Error('Malformed progress data');
          progress = parsedProgress.slice(0, 100) as XooterTrainingProgress[];
          truncated ||= result.count === null || result.count > 100 || result.data.length > 100;
        }
        const modules = parsedModules.slice(0, 100) as XooterTrainingModule[];
        // When a server response is incomplete, do NOT claim an exact sum/badge
        // total as though it were a complete catalogue or progress ledger.
        if (!truncated && !summariseXooterGrowth(modules, progress)) {
          throw new Error('Unverifiable training progress');
        }
        setState({
          loading: false, error: null, hasXooterProfile: Boolean(owner.data),
          truncated, modules, progress,
        });
      } catch {
        if (alive) setState({
          loading: false, error: 'Your training and recognition records could not be verified. Retry or open Training.',
          hasXooterProfile: false, truncated: false, modules: [], progress: [],
        });
      }
    })();
    return () => { alive = false; };
  }, [userId, refreshVersion]);

  const summary = !state.truncated && state.hasXooterProfile
    ? summariseXooterGrowth(state.modules, state.progress)
    : null;
  const required = state.modules.filter(module => module.required);
  const optional = state.modules.filter(module => !module.required);

  return <Screen contentStyle={s.screen}
    refreshControl={<RefreshControl refreshing={state.loading} onRefresh={retry} tintColor={nativePalette.violet} />}>
    <View style={s.header}>
      <Pressable accessibilityLabel="Back to Xooter workspace" accessibilityRole="button"
        onPress={() => router.back()} style={s.back}>
        <CoreIcon name="arrow-left" size={20}/>
      </Pressable>
      <View style={s.flex}>
        <Text style={s.eyebrow}>RECOGNITION · NOT A PAY GRADE</Text>
        <DisplayTitle>Your growth</DisplayTitle>
      </View>
    </View>
    <Text style={s.body}>
      Every module counts towards building confidence. Badges recognise completed learning;
      they do not change your pay, employment status or which jobs you are offered.
    </Text>
    {state.loading ? <LoadingRows/> : state.error
      ? <EmptyState title="Progress unavailable" detail={state.error}
          action="Try again" onAction={retry}/>
      : <>
        <Card style={s.hero}>
          <View style={s.orb}><CoreIcon name="trophy" color={nativePalette.violetDark} size={35}/></View>
          {summary ?
            <>
              <Text style={s.points}>{summary.earnedPoints} points</Text>
              <Text style={s.body}>Recorded recognition points from your completed modules.</Text>
              <ProgressBar label="Recognised learning"
                done={summary.earnedPoints} total={summary.availablePoints}/>
              <Pill tone={summary.requiredTotal > 0 &&
                summary.requiredCompleted === summary.requiredTotal ? 'success' : 'warning'}>
                {summary.requiredTotal > 0 && summary.requiredCompleted === summary.requiredTotal
                  ? 'Required modules recorded complete' : 'Required learning not yet confirmed'}
              </Pill>
            </>
            : <>
              <Text style={s.points}>Progress unverified</Text>
              <Text style={s.body}>{state.truncated
                ? 'The catalogue or completion list exceeds the first 100 records. Exact recognition totals are not shown.'
                : 'A Xooter profile is needed before training achievements can be confirmed.'}</Text>
            </>}
        </Card>

        <SectionLabel count={required.length}>Xoot Standard · required</SectionLabel>
        <Text style={s.body}>These foundational modules are required. They are not optional badges
          and completion does not alone approve an application or background check.</Text>
        {summary && required.length ? <ProgressBar label="Required training"
          done={summary.requiredCompleted} total={summary.requiredTotal}/> : null}
        {required.length ? required.map(module => <ModuleCard key={module.id}
          module={module} completed={Boolean(summary?.completeModuleIds.has(module.id))}/>)
          : <Card><Text style={s.body}>No required modules returned by the current catalogue.</Text></Card>}

        <SectionLabel count={optional.length}>Specialisms · optional</SectionLabel>
        <Text style={s.body}>Explore training on your terms. These modules offer recognition,
          not an automatic pay rise or an offer of work.</Text>
        {optional.length ? optional.map(module => <ModuleCard key={module.id}
          module={module} completed={Boolean(summary?.completeModuleIds.has(module.id))}/>)
          : <Card><Text style={s.body}>No optional specialisms are published yet.</Text></Card>}

        {summary && summary.badges.length ? <Card style={s.badges}>
          <Text style={s.heading}>Recognition on your record</Text>
          {summary.badges.map(badge => <View key={badge.moduleId} style={s.earned}>
            <CoreIcon name="check" color={nativePalette.sageInk} size={18}/>
            <View style={s.flex}><Text style={s.moduleTitle}>{badge.label}</Text>
              <Text style={s.small}>{badge.title}</Text></View>
          </View>)}
        </Card> : null}
        {state.truncated ? <Card style={s.notice}>
          <Text style={s.body}>This is a limited catalogue view. No achievement
            total or completion status is being certified here.</Text>
        </Card> : null}
        <Card style={s.notice}>
          <CoreIcon name="shield" color={nativePalette.sageInk} size={20}/>
          <View style={s.flex}><Text style={s.moduleTitle}>How progress is verified</Text>
            <Text style={s.body}>Only Xoot's stored, owner-bound training completions can
              produce recognition here. Tapping a badge cannot award it; quizzes and grading
              happen in the approved training workspace.</Text></View>
        </Card>
        <PrimaryAction icon="book-open" onPress={() => router.push('/xooter/training')}>
          Explore training
        </PrimaryAction>
      </>}
  </Screen>;
}

export default function XooterGrowthScreen() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Screen><LoadingRows/></Screen>;
  if (!user) return <Screen><DisplayTitle>Your growth</DisplayTitle>
    <EmptyState title="Sign in for your recognition"
      detail="Your learning records belong to your own Xooter account."
      action="Sign in" onAction={() => router.push('/account')}/></Screen>;
  // A fresh component for each user prevents previous-worker badges flashing.
  return <XooterGrowthForAccount key={user.id} userId={user.id}/>;
}

const s = StyleSheet.create({
  screen: { gap: 13, paddingBottom: 84 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { borderWidth: 1, borderColor: nativePalette.border, width: 42, height: 42,
    borderRadius: 23, backgroundColor: nativePalette.card, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, minWidth: 0 },
  eyebrow: { fontFamily: nativeFonts.bodyBold, fontSize: 10, letterSpacing: 1.2,
    color: nativePalette.violetDark },
  body: { fontFamily: nativeFonts.body, color: nativePalette.inkSoft, fontSize: 12, lineHeight: 19 },
  hero: { alignItems: 'center', gap: 13, borderRadius: 24, backgroundColor: nativePalette.violetWash, padding: 23 },
  orb: { width: 72, height: 72, borderRadius: 36, alignItems: 'center',
    justifyContent: 'center', backgroundColor: nativePalette.card },
  points: { fontFamily: nativeFonts.displayStrong, color: nativePalette.ink, fontSize: 37 },
  barContainer: { gap: 8, alignSelf: 'stretch' },
  barTrack: { height: 9, borderRadius: 8, backgroundColor: nativePalette.border, overflow: 'hidden' },
  barFill: { height: 9, borderRadius: 8, backgroundColor: nativePalette.sageInk },
  small: { fontFamily: nativeFonts.body, color: nativePalette.muted, fontSize: 11 },
  module: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  moduleIcon: { width: 43, height: 43, borderRadius: 15, alignItems: 'center',
    justifyContent: 'center', backgroundColor: nativePalette.violetWash },
  moduleTitle: { fontFamily: nativeFonts.bodyBold, color: nativePalette.ink, fontSize: 14 },
  tags: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  tag: { fontFamily: nativeFonts.body, fontSize: 11, color: nativePalette.muted },
  badge: { fontFamily: nativeFonts.body, color: nativePalette.violetDark,
    fontSize: 11, marginTop: 6 },
  badges: { backgroundColor: nativePalette.sageWash, gap: 12 },
  heading: { fontFamily: nativeFonts.displayStrong, fontSize: 22, color: nativePalette.ink },
  earned: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  notice: { backgroundColor: nativePalette.sageWash, flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
});
