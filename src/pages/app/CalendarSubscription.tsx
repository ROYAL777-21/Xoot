import {useState} from "react";
import {supabase} from "@/integrations/supabase/client";
import {useAuth} from "@/contexts/AuthContext";
import {useConfirmedSave,useProfileResource} from "./useProfileResource";

type Status={active:boolean;expiresAt:string|null};
async function settings(action:"status"|"enable"|"disable",expectedSubject:string,tokenHash?:string):Promise<Status>{
  const result=await supabase.functions.invoke("calendar-subscription",{body:{action,expectedSubject,...(tokenHash?{tokenHash}:{})}});
  const data=result.data?.data;
  if(result.error||result.data?.success!==true||typeof data?.active!=="boolean"||
    (data.expiresAt!==null&&(typeof data.expiresAt!=="string"||!Number.isFinite(Date.parse(data.expiresAt)))))throw new Error("Your calendar settings could not be saved or loaded.");
  return data;
}
const readStatus=(owner:string)=>settings("status",owner);
async function newPrivateLink(){
  const bytes=crypto.getRandomValues(new Uint8Array(32));
  const token=[...bytes].map(byte=>byte.toString(16).padStart(2,"0")).join("");
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token));
  const hash=[...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,"0")).join("");
  const base=String(import.meta.env.VITE_SUPABASE_URL);
  const parsed=new URL(base);
  if(parsed.protocol!=="https:"||parsed.username||parsed.password||parsed.pathname!=="/")throw new Error("Calendar connection unavailable.");
  return {hash,url:`${parsed.origin}/functions/v1/calendar-feed/${token}.ics`};
}

/** Capability stays in this account's memory; it is not rendered into a field, URL or storage. */
function PrivateSubscription(){
  const resource=useProfileResource(readStatus);
  const save=useConfirmedSave(resource.isCurrent);
  const [link,setLink]=useState<{owner:string;url:string}|null>(null);
  const [message,setMessage]=useState<{owner:string;text:string}|null>(null);
  const url=resource.owner&&link?.owner===resource.owner?link.url:null;
  const enable=()=>void save.submit(async()=>{
    const next=await newPrivateLink();
    if(!resource.isCurrent()||!resource.owner)return;
    const result=await settings("enable",resource.owner,next.hash);
    if(!result.active)throw new Error("Your private calendar link was not enabled.");
    if(resource.isCurrent()&&resource.owner){setLink({owner:resource.owner,url:next.url});setMessage(null);}
  },()=>void resource.refresh());
  const disable=()=>void save.submit(async()=>{
    if(!resource.isCurrent()||!resource.owner)return;
    const result=await settings("disable",resource.owner);if(result.active)throw new Error("Your private calendar link was not disabled.");
  },()=>{setLink(null);setMessage(null);void resource.refresh();});
  const copy=async()=>{
    if(!url||!resource.isCurrent())return;
    try{await navigator.clipboard.writeText(url);if(resource.isCurrent()&&resource.owner)setMessage({owner:resource.owner,text:"Private link copied. Paste it only into your own calendar subscription settings."});}
    catch{if(resource.isCurrent()&&resource.owner)setMessage({owner:resource.owner,text:"Your browser could not copy the private link. Allow clipboard access and try again."});}
  };
  return <section className="xoot-you-card"><h2 className="font-display text-2xl">Automatic calendar updates</h2>
    <p className="my-3">Connect once to keep your visits, changes and cancellations in your calendar. Your calendar chooses when to refresh, so changes may take time to appear.</p>
    <p className="text-sm text-muted-foreground">This is a private, read-only subscription. Your address, email, home notes and live location stay in Xoot. Keep the link private; anyone with it can read the visit times. Links expire after a year.</p>
    {!resource.data?<p className="my-3" role={resource.error?"alert":undefined}>{resource.error??"Loading calendar settings…"}{resource.error&&<button type="button" className="underline ml-2" onClick={()=>void resource.refresh()}>Try again</button>}</p>:<>
      <p className="my-3">{resource.data.active?"Your private calendar link is enabled.":"Your calendar is not connected yet."}</p>
      {resource.data.active&&resource.data.expiresAt&&<p className="text-sm mb-3">Link expires {new Intl.DateTimeFormat("en-ZA",{dateStyle:"medium"}).format(new Date(resource.data.expiresAt))}.</p>}
      {url&&resource.data.active&&!save.saving&&<div className="grid gap-3 mb-4"><button type="button" className="xoot-you-primary" onClick={()=>void copy()}>Copy private calendar link</button><button type="button" className="underline" onClick={()=>{if(resource.isCurrent())window.location.assign(url.replace(/^https:/,"webcal:"));}}>Connect Apple Calendar</button></div>}
      <details className="my-4"><summary>Connect Google or Outlook</summary><p className="my-2">Copy your private link. In Google Calendar on a computer, choose Other calendars → + → From URL. In Outlook, choose Add calendar → Subscribe from web. Paste the link there and confirm. Apple Calendar can use Add Subscription Calendar. Subscribing keeps updates; importing a downloaded file adds a copy.</p></details>
      {resource.data.active&&<p className="text-sm mb-3">Replacing the link stops the old link. Reconnect your calendar with the new one. Turning it off stops future updates; remove the subscribed calendar in your calendar app to remove its saved events.</p>}
      <div className="grid gap-3"><button type="button" disabled={save.saving} className="xoot-you-primary" onClick={enable}>{save.saving?"Saving…":resource.data.active?"Replace private calendar link":"Enable automatic calendar updates"}</button>{resource.data.active&&<button type="button" disabled={save.saving} className="underline" onClick={disable}>Turn off calendar updates</button>}</div>
    </>}
    {save.error&&<p className="xoot-you-error mt-3" role="alert">{save.error}</p>}
    {message?.owner===resource.owner&&<p className="mt-3" role="status">{message.text}</p>}
  </section>;
}
export default function CalendarSubscription(){
  const {user,loading}=useAuth();
  return import.meta.env.VITE_CALENDAR_SYNC_ENABLED==="true"&&user&&!loading?<PrivateSubscription key={user.id}/>:null;
}
