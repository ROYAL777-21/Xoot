import {useEffect,useRef,useState} from 'react';
import {useAuth} from '@/contexts/AuthContext';
import {supabase} from '@/integrations/supabase/client';
import {Button} from '@/components/ui/button';
import {Switch} from '@/components/ui/switch';
import {HandoffFlowerField} from '@/components/xoot/HeroArtwork';
type Preferences={email_updates:boolean;onboarding_reminders:boolean;tips:boolean;promotions:boolean;revision:number};
const choices=[
  ['email_updates','Account and application emails','Status updates about your Xooter journey. Sign-in and security emails are separate.'],
  ['onboarding_reminders','A little help finishing','Up to two reminders while your application is incomplete. Save these choices to include email reminders.'],
  ['tips','Useful tips and a gentle nudge','Profile, visit and customer-care tips, plus occasional reminders to return.'],
  ['promotions','Offers and Xoot news','Optional promotions when Xoot has a real offer to share.'],
] as const;
function parsePreferences(value:unknown):Preferences {
  const data=value as Preferences;
  if(!data || choices.some(([key])=>typeof data[key]!=='boolean') || !Number.isSafeInteger(data.revision) || data.revision<0)throw Error('Invalid preferences');
  return data;
}
export function useStartXooterJourney(owner:string,token:string) {
  const [failure,setFailure]=useState<string|null>(null);
  useEffect(()=>{
    let active=true;setFailure(null);
    void supabase.functions.invoke('xooter-communications',{headers:{Authorization:`Bearer ${token}`},body:{action:'start'}})
      .then(({data,error})=>{if(active && (error || data?.success!==true))setFailure(owner);})
      .catch(()=>{if(active)setFailure(owner);});
    return()=>{active=false;};
  },[owner,token]);
  return failure===owner;
}
function OwnerPreferences({token}:{token:string}) {
  const [preferences,setPreferences]=useState<Preferences|null>(null);
  const [busy,setBusy]=useState(true);const [error,setError]=useState('');const [saved,setSaved]=useState(false);const [reload,setReload]=useState(0);
  const currentScope=useRef<{active:boolean}|null>(null);
  useEffect(()=>{
    const scope={active:true};currentScope.current=scope;setPreferences(null);setError('');setSaved(false);setBusy(true);
    void supabase.functions.invoke('xooter-communications',{headers:{Authorization:`Bearer ${token}`},body:{action:'start'}})
      .then(({data,error:issue})=>{if(!scope.active)return;if(issue || data?.success!==true)throw Error();setPreferences(parsePreferences(data.data));})
      .catch(()=>{if(scope.active)setError('Your choices could not be loaded. Please try again.');})
      .finally(()=>{if(scope.active)setBusy(false);});
    return()=>{scope.active=false;};
  },[token,reload]);
  const save=async()=>{
    if(!preferences || busy)return;setBusy(true);setError('');setSaved(false);
    const scope=currentScope.current;
    const {revision,...values}=preferences;
    try {
      const result=await supabase.functions.invoke('xooter-communications',{headers:{Authorization:`Bearer ${token}`},body:{action:'save',preferences:values,revision}});
      if(!scope?.active)return;if(result.error || result.data?.success!==true)throw Error();
      setPreferences(parsePreferences(result.data.data));setSaved(true);
    }catch{if(scope?.active)setError('Your choices were not confirmed. Reload them before trying again.');}
    finally{if(scope?.active)setBusy(false);}
  };
  return <section aria-labelledby="xooter-update-heading" className="relative overflow-hidden rounded-3xl border border-border bg-card p-5 sm:p-7 mb-6">
    <HandoffFlowerField className="pointer-events-none absolute inset-0 overflow-hidden" items={[{size:65,palette:'lilac',left:'87%',top:'-5%',opacity:.4}]} />
    <div className="relative"><p className="text-xs uppercase tracking-widest text-brand font-semibold mb-2">YOUR XOOT, YOUR CHOICE</p><h2 id="xooter-update-heading" className="font-display text-2xl font-bold">Stay in the loop.</h2>
      <p className="text-sm text-muted-foreground mt-2 mb-5">Choose what is useful to you. Turn optional updates off whenever you like.</p>
      {busy && !preferences && <p role="status">Loading your choices…</p>}
      {preferences && <fieldset disabled={busy || !!error} className="space-y-5">{choices.map(([key,label,description])=><label key={key} className="flex items-start justify-between gap-5" htmlFor={`xooter-updates-${key}`}><span><span className="block font-semibold text-sm">{label}</span><span id={`xooter-updates-${key}-help`} className="block text-xs leading-relaxed text-muted-foreground mt-1">{description}</span></span><Switch id={`xooter-updates-${key}`} aria-describedby={`xooter-updates-${key}-help`} checked={preferences[key]} onCheckedChange={value=>{setPreferences({...preferences,[key]:value});setSaved(false);}} /></label>)}</fieldset>}
      {error && <div role="alert" className="mt-4 text-sm"><p>{error}</p><Button variant="outline" className="mt-3" disabled={busy} onClick={()=>setReload(current=>current+1)}>Reload choices</Button></div>}
      {preferences && <Button className="mt-6" disabled={busy || !!error} onClick={()=>void save()}>{busy?'Saving…':'Save choices'}</Button>}
      {saved && <p role="status" className="text-sm text-brand mt-3">Your choices are saved.</p>}
    </div>
  </section>;
}
export function CommunicationPreferences() {
  const {user,session}=useAuth();
  if(!user || !session)return <p role="status">Sign in to manage your Xoot updates.</p>;
  return <OwnerPreferences key={user.id} token={session.access_token} />;
}
