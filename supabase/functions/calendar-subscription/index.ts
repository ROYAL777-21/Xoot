import {getAllowedOrigins,getAuthUser,getServiceClient,readJson} from "../_shared/action-utils.ts";
import {consumeRateLimit} from "../_shared/governance-utils.ts";
import {makeCalendarSubscriptionHandler} from "./handler.ts";
const preview="https://xoot-git-design-xooter-onboarding-8c61bd-royal777-21s-projects.vercel.app";
const origins=()=>[...getAllowedOrigins(),...(Deno.env.get("SUPABASE_URL")==="https://fxmxyabdjqviqbcxmvlp.supabase.co"?[preview]:[])];
const active=(row:{token_hash:string|null;revoked_at:string|null;expires_at:string}|null)=>({active:!!row?.token_hash&&!row.revoked_at&&Date.parse(row.expires_at)>Date.now(),expiresAt:row?.expires_at??null});
Deno.serve(makeCalendarSubscriptionHandler({
  allowed:origin=>!origin||origins().includes(origin),
  cors:origin=>({"Access-Control-Allow-Origin":origin&&origins().includes(origin)?origin:origins()[0],"Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS",Vary:"Origin"}),
  authenticate:async req=>(await getAuthUser(req)).user?.id??null,
  readBody:async req=>{const body=await readJson(req,2048);return body&&typeof body==="object"&&!Array.isArray(body)?body:{};},
  consume:async owner=>(await consumeRateLimit(getServiceClient(),{bucket:"calendar_settings",actor:owner,action:"calendar_settings",limitCount:30,windowSeconds:600})).allowed,
  status:async owner=>{const{data,error}=await getServiceClient().from("xoot_calendar_subscriptions").select("token_hash,revoked_at,expires_at").eq("user_id",owner).maybeSingle();if(error)throw error;return active(data);},
  enable:async(owner,hash)=>{
    const now=new Date(),expires=new Date(now.getTime()+365*86400000);
    const{data,error}=await getServiceClient().from("xoot_calendar_subscriptions").upsert({user_id:owner,token_hash:hash,issued_at:now.toISOString(),expires_at:expires.toISOString(),revoked_at:null,fetch_window:now.toISOString(),fetch_count:0},{onConflict:"user_id"}).select("token_hash,revoked_at,expires_at").single();
    if(error||data?.token_hash!==hash)throw new Error("Calendar settings not saved");return active(data);
  },
  disable:async owner=>{const{error}=await getServiceClient().from("xoot_calendar_subscriptions").update({token_hash:null,revoked_at:new Date().toISOString()}).eq("user_id",owner);if(error)throw error;},
}));
