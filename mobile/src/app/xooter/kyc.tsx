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
  getVerificationSteps, parseXooterApplication, parseXooterDocumentStatus,
  readableReviewStatus, reviewTone, type XooterApplicationStatus, type XooterDocumentStatus,
} from '@/lib/native-xooter-trust';
import { useAuth } from '@/providers/auth-provider';

const verificationPortal='https://xoot.co.za/xooter/kyc';
const applicationPortal='https://xoot.co.za/xooter/apply';
type State={
  loading:boolean;error:string|null;application:XooterApplicationStatus|null;
  documents:XooterDocumentStatus[];hasMore:boolean;
};
const initial:State={loading:true,error:null,application:null,documents:[],hasMore:false};

function VerificationForAccount({userId}:{userId:string}){
  const [state,setState]=useState<State>(initial);
  const [retry,setRetry]=useState(0);
  const reload=useCallback(()=>setRetry(previous=>previous+1),[]);
  useEffect(()=>{
    let current=true;
    setState(initial);
    void (async()=>{
      try{
        // No ID number, bank details, selfie paths, access codes or documents are fetched.
        const [a,d]=await Promise.all([
          supabase.from('xooter_applications')
            .select('id,status,background_check_status,id_verification_status,selfie_verification_status,address_verification_status,banking_verification_status,reference_verification_status')
            .eq('user_id',userId).maybeSingle(),
          supabase.from('xooter_documents')
            .select('id,doc_type,status,created_at')
            .eq('user_id',userId).order('created_at',{ascending:false}).limit(31),
        ]);
        if(!current)return;
        if(a.error||d.error||!d.data)throw new Error('Verification unavailable');
        const application=a.data?parseXooterApplication(a.data):null;
        if(a.data&&!application)throw new Error('Invalid application record');
        const docs=d.data.map(row=>parseXooterDocumentStatus(row));
        if(docs.some(row=>row===null))throw new Error('Invalid document response');
        setState({loading:false,error:null,application,documents:docs.slice(0,30) as XooterDocumentStatus[],hasMore:docs.length>30});
      }catch{
        if(current)setState({loading:false,error:'Your verification records could not be loaded. Please retry.',application:null,documents:[],hasMore:false});
      }
    })();
    return ()=>{current=false;};
  },[retry,userId]);
  const steps=state.application?getVerificationSteps(state.application):[];
  return <Screen refreshControl={<RefreshControl refreshing={state.loading} onRefresh={reload} tintColor={nativePalette.violet} />}>
    <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to Xooter jobs" style={s.back}
        onPress={()=>router.push('/xooter/jobs')}><CoreIcon name="arrow-left" size={19}/></Pressable>
      <View style={s.grow}><Text style={s.eyebrow}>WORK WITH XOOT</Text><DisplayTitle>Verification</DisplayTitle></View>
    </View>
    <Text style={s.copy}>Your application and submitted-document statuses come from your private Xoot record. Review is handled by the trust team.</Text>
    {state.loading?<LoadingRows/>:state.error?
      <EmptyState title="Verification unavailable" detail={state.error} action="Try again" onAction={reload}/>:
      !state.application?
        <EmptyState title="No application yet" detail="Your Xooter application has not been found for this signed-in account."
          action="Apply on Xoot web" onAction={()=>void WebBrowser.openBrowserAsync(applicationPortal)}/>:
      <>
        <Card style={s.hero}>
          <CoreIcon name="shield" size={29} color={nativePalette.violetDark}/>
          <Text style={s.heroTitle}>Your application</Text>
          <Pill tone={reviewTone(state.application.status)}>{readableReviewStatus(state.application.status)}</Pill>
          <Text style={s.copy}>Application approval alone is not a guarantee that background checks, activation or job eligibility are complete.</Text>
        </Card>
        <SectionLabel>Verification checks</SectionLabel>
        <Card style={s.list}>
          {steps.map(step=><View key={step.label} style={s.row}>
            <Text style={s.label}>{step.label}</Text><Pill tone={step.tone}>{step.status}</Pill>
          </View>)}
        </Card>
        <SectionLabel count={state.documents.length}>Submitted documents</SectionLabel>
        {state.documents.length===0?
          <Card><Text style={s.copy}>No documents have been recorded for this account yet.</Text></Card>:
          state.documents.map(doc=><Card key={doc.id} style={s.document}>
            <View style={s.grow}><Text style={s.label}>{readableReviewStatus(doc.doc_type)}</Text>
              <Text style={s.small}>Uploaded {new Date(doc.created_at).toLocaleDateString('en-ZA')}</Text></View>
            <Pill tone={reviewTone(doc.status)}>{readableReviewStatus(doc.status)}</Pill>
          </Card>)}
        {state.hasMore?<Text style={s.copy}>Only your newest 30 document records are shown. Open the web workspace for the full history.</Text>:null}
        <Card style={s.notice}>
          <CoreIcon name="lock" color={nativePalette.sageInk} size={19}/>
          <View style={s.grow}><Text style={s.label}>Your documents stay private</Text>
            <Text style={s.copy}>This screen shows status only. It never displays identity numbers, account numbers, uploaded files or secure storage locations.</Text></View>
        </Card>
        <PrimaryAction icon="shield" onPress={()=>void WebBrowser.openBrowserAsync(verificationPortal)}>
          Open secure verification workspace
        </PrimaryAction>
        {['draft','rejected'].includes(state.application.status)?
          <Pressable accessibilityRole="button" style={s.link}
            onPress={()=>void WebBrowser.openBrowserAsync(applicationPortal)}>
            <Text style={s.linkLabel}>Continue or resubmit your application</Text>
            <CoreIcon name="chevron-right" color={nativePalette.violetDark} size={18}/>
          </Pressable>:null}
      </>}
  </Screen>;
}
export default function NativeXooterVerification(){
  const {user,isLoading}=useAuth();
  if(isLoading)return <Screen><LoadingRows/></Screen>;
  if(!user)return <Screen><DisplayTitle>Verification</DisplayTitle>
    <EmptyState title="Sign in to verify your account"
      detail="Your application and identity checks are accessible only to the applicant."
      action="Sign in" onAction={()=>router.push('/account')}/></Screen>;
  return <VerificationForAccount key={user.id} userId={user.id}/>;
}
const s=StyleSheet.create({
  header:{flexDirection:'row',alignItems:'center',gap:12},
  back:{width:42,height:42,borderWidth:1,borderColor:nativePalette.border,
    borderRadius:24,backgroundColor:nativePalette.card,alignItems:'center',justifyContent:'center'},
  grow:{flex:1,minWidth:0},
  eyebrow:{fontFamily:nativeFonts.bodyBold,fontSize:10,letterSpacing:1.3,color:nativePalette.violetDark},
  hero:{backgroundColor:nativePalette.violetWash,borderRadius:24,gap:10},
  heroTitle:{fontFamily:nativeFonts.displayStrong,color:nativePalette.ink,fontSize:24},
  copy:{fontFamily:nativeFonts.body,color:nativePalette.inkSoft,fontSize:12,lineHeight:19},
  list:{gap:0},
  row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap',
    minHeight:47,borderBottomWidth:1,borderColor:nativePalette.border},
  label:{fontFamily:nativeFonts.bodyBold,color:nativePalette.ink,fontSize:13},
  small:{fontFamily:nativeFonts.body,color:nativePalette.muted,fontSize:11,marginTop:3},
  document:{flexDirection:'row',alignItems:'center',gap:10},
  notice:{backgroundColor:nativePalette.sageWash,flexDirection:'row',alignItems:'flex-start',gap:10},
  link:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',minHeight:48,gap:8},
  linkLabel:{fontFamily:nativeFonts.bodyBold,color:nativePalette.violetDark,fontSize:12,flex:1},
});
