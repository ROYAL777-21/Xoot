import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import {
  Card, CoreIcon, DisplayTitle, EmptyState, LoadingRows, Pill,
  PrimaryAction, Screen, SectionLabel, nativeFonts, nativePalette,
} from '@/components/native-core';
import { supabase } from '@/lib/supabase';
import {
  completedTrainingIds, parseTrainingModule, parseTrainingProgress,
  type XooterTrainingModule, type XooterTrainingProgress,
} from '@/lib/native-xooter-trust';
import { useAuth } from '@/providers/auth-provider';

const trainingPortal='https://xoot.co.za/xooter/training';
type State={loading:boolean;error:string|null;modules:XooterTrainingModule[];
  progress:XooterTrainingProgress[];hasXooterProfile:boolean;limited:boolean};
const blank:State={loading:true,error:null,modules:[],progress:[],hasXooterProfile:false,limited:false};

function TrainingForAccount({userId}:{userId:string}){
  const [state,setState]=useState<State>(blank);
  const [retry,setRetry]=useState(0);
  const reload=useCallback(()=>setRetry(value=>value+1),[]);
  useEffect(()=>{
    let current=true;setState(blank);
    void (async()=>{
      try{
        const [catalog,owner]=await Promise.all([
          // Never select quiz_questions: the browser must not receive an answer key.
          supabase.from('training_modules')
            .select('id,title,description,required,duration_min,badge_label,rank_points')
            .order('required',{ascending:false}).order('title').limit(101),
          supabase.from('xooters').select('id,user_id').eq('user_id',userId).maybeSingle(),
        ]);
        if(!current)return;
        if(catalog.error||!catalog.data||owner.error)throw new Error('Training unavailable');
        if(owner.data&&owner.data.user_id!==userId)throw new Error('Cross-account record');
        const modules=catalog.data.map(row=>parseTrainingModule(row));
        if(modules.some(module=>module===null))throw new Error('Invalid module catalogue');
        let progress:XooterTrainingProgress[]=[];
        let truncated=catalog.data.length>100;
        if(owner.data){
          const result=await supabase.from('xooter_training_progress')
            .select('module_id,completed,completed_at')
            .eq('xooter_id',owner.data.id).limit(101);
          if(!current)return;
          if(result.error||!result.data)throw new Error('Training progress unavailable');
          const parsed=result.data.map(row=>parseTrainingProgress(row));
          if(parsed.some(row=>row===null))throw new Error('Invalid progress records');
          progress=parsed.slice(0,100) as XooterTrainingProgress[];
          truncated ||= result.data.length>100;
        }
        setState({loading:false,error:null,modules:modules.slice(0,100) as XooterTrainingModule[],
          progress,hasXooterProfile:Boolean(owner.data),limited:truncated});
      }catch{
        if(current)setState({loading:false,error:'The live training catalogue or your progress could not be verified. Please retry.',
          modules:[],progress:[],hasXooterProfile:false,limited:false});
      }
    })();
    return()=>{current=false;};
  },[retry,userId]);
  const completed=completedTrainingIds(state.progress,state.modules);
  const required=state.modules.filter(module=>module.required);
  return <Screen refreshControl={<RefreshControl refreshing={state.loading} onRefresh={reload} tintColor={nativePalette.violet}/>}>
    <View style={s.header}>
      <Pressable accessibilityLabel="Back to Xooter jobs" accessibilityRole="button" style={s.back}
        onPress={()=>router.push('/xooter/jobs')}><CoreIcon name="arrow-left" size={19}/></Pressable>
      <View style={s.grow}><Text style={s.eyebrow}>WORK WITH XOOT</Text><DisplayTitle>Training</DisplayTitle></View>
    </View>
    <Text style={s.body}>Build confidence for every visit. Additional learning beyond the required module is optional. Recognition points are never wages or an increase in your job rate.</Text>
    {state.loading?<LoadingRows/>:state.error?
      <EmptyState title="Training unavailable" detail={state.error} action="Try again" onAction={reload}/>:
      <>
        <Card style={s.hero}>
          <CoreIcon name="trophy" size={27} color={nativePalette.violetDark}/>
          <Text style={s.title}>A standard worth working towards.</Text>
          <Text style={s.body}>{state.hasXooterProfile
            ? String(completed.size)+' of '+String(state.modules.length)+' listed modules marked complete in your Xoot record.'
            : 'You can explore the training catalogue. Completion progress appears once your Xooter profile is registered.'}</Text>
          <Pill tone={state.hasXooterProfile&&required.every(module=>completed.has(module.id))&&required.length>0?'success':'neutral'}>
            {state.hasXooterProfile&&required.every(module=>completed.has(module.id))&&required.length>0
              ? 'Required modules recorded complete':'Required training status not confirmed'}
          </Pill>
        </Card>
        <SectionLabel count={required.length}>Required foundation</SectionLabel>
        {state.modules.length===0?<EmptyState title="No published modules"
          detail="The training service has not returned any modules yet. No completion or badge can be claimed."/>:
          state.modules.map(module=><Card key={module.id} style={s.module}>
            <View style={s.moduleTop}>
              <View style={s.grow}>
                <Text style={s.moduleTitle}>{module.title}</Text>
                {module.description?<Text style={s.body}>{module.description}</Text>:null}
              </View>
              <Pill tone={state.hasXooterProfile&&completed.has(module.id)?'success':module.required?'warning':'neutral'}>
                {state.hasXooterProfile&&completed.has(module.id)?'Recorded complete':module.required?'Required':'Optional'}
              </Pill>
            </View>
            <View style={s.tagRow}>
              {module.duration_min!==null?<Text style={s.tag}>{module.duration_min} min</Text>:null}
              {module.badge_label?<Text style={s.tag}>Module: {module.badge_label}</Text>:null}
              {module.rank_points!==null?<Text style={s.tag}>{module.rank_points} recognition points available</Text>:null}
            </View>
          </Card>)}
        {state.limited?<Text style={s.body}>Only the first 100 modules or progress rows are displayed. Open the web workspace for complete records.</Text>:null}
        <Card style={s.notice}>
          <CoreIcon name="shield" size={19} color={nativePalette.sageInk}/>
          <View style={s.grow}><Text style={s.moduleTitle}>Real grading happens on Xoot</Text>
            <Text style={s.body}>This mobile overview does not contain quiz answers, grade locally or award certification. Open the secure training workspace to complete a module.</Text></View>
        </Card>
        <PrimaryAction icon="trophy" onPress={()=>void WebBrowser.openBrowserAsync(trainingPortal)}>
          Open training and quizzes
        </PrimaryAction>
      </>}
  </Screen>;
}
export default function XooterTraining(){
  const {user,isLoading}=useAuth();
  if(isLoading)return <Screen><LoadingRows/></Screen>;
  if(!user)return <Screen><DisplayTitle>Training</DisplayTitle>
    <EmptyState title="Sign in to train" detail="Your progress is protected and associated with your Xooter account."
      action="Sign in" onAction={()=>router.push('/account')}/></Screen>;
  return <TrainingForAccount key={user.id} userId={user.id}/>;
}
const s=StyleSheet.create({
  header:{flexDirection:'row',alignItems:'center',gap:12},
  back:{width:42,height:42,borderRadius:24,borderWidth:1,borderColor:nativePalette.border,
    backgroundColor:nativePalette.card,justifyContent:'center',alignItems:'center'},
  grow:{flex:1,minWidth:0},
  eyebrow:{fontFamily:nativeFonts.bodyBold,color:nativePalette.violetDark,fontSize:10,letterSpacing:1.3},
  body:{fontFamily:nativeFonts.body,color:nativePalette.inkSoft,fontSize:12,lineHeight:19},
  hero:{backgroundColor:nativePalette.violetWash,gap:11},
  title:{fontFamily:nativeFonts.displayStrong,color:nativePalette.ink,fontSize:25},
  module:{gap:12},
  moduleTop:{flexDirection:'row',alignItems:'flex-start',gap:10,flexWrap:'wrap'},
  moduleTitle:{fontFamily:nativeFonts.bodyBold,color:nativePalette.ink,fontSize:14},
  tagRow:{flexDirection:'row',flexWrap:'wrap',gap:6},
  tag:{fontFamily:nativeFonts.body,color:nativePalette.muted,fontSize:11,
    paddingHorizontal:10,paddingVertical:6,backgroundColor:nativePalette.sunken,borderRadius:14},
  notice:{flexDirection:'row',alignItems:'flex-start',gap:10,backgroundColor:nativePalette.sageWash},
});
