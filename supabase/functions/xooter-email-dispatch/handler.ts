type Result={data:unknown;error:unknown};
type Store={rpc:(name:string,args?:Record<string,unknown>)=>PromiseLike<Result>};
type Config={supabaseUrl:string;appUrl:string;smtpConfigured:boolean};
type Email={id:string;email:string;first_name:string;kind:string;title:string;body:string;route:string};
const PROJECTS={'https://fxmxyabdjqviqbcxmvlp.supabase.co':'fxmxyabdjqviqbcxmvlp','https://mvlrkelahhsyjrwgsxaf.supabase.co':'mvlrkelahhsyjrwgsxaf'};
const ROUTES=new Set(['/xooter/apply','/xooter/kyc','/xooter']);
const KINDS=new Set(['xooter_welcome','xooter_continue_24h','xooter_continue_72h','xooter_application_received','xooter_application_attention','xooter_onboarding_complete']);
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function trustedJourneyApp(url:string,project:string):boolean {
  return project==='mvlrkelahhsyjrwgsxaf' ? url==='https://xoot.co.za' : /^https:\/\/xoot-[a-z0-9-]+-royal777-21s-projects\.vercel\.app$/.test(url);
}
export function buildJourneyEmail(value:unknown,appUrl:string,staging:boolean) {
  const e=value as Email;
  if(!e || typeof e.id!=='string' || !/^[a-f0-9-]{36}$/.test(e.id) || !KINDS.has(e.kind) || !ROUTES.has(e.route)
    || typeof e.email!=='string' || e.email.length>254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(e.email)
    || typeof e.title!=='string' || !e.title || e.title.length>120 || /[\r\n\0]/.test(e.title)
    || typeof e.body!=='string' || e.body.length>500 || typeof e.first_name!=='string' || e.first_name.length>40)throw Error('Invalid lifecycle email');
  const greeting=e.first_name?`Hi ${e.first_name},`:'Hello,';
  const subject=`${staging?'[Xoot staging test] ':''}${e.title}`;
  const link=appUrl+e.route;const preferences=appUrl+'/xooter/updates';
  const notice=staging?'This is a staging test. No production application was changed.':'';
  return {sender:{name:'Xoot',email:'no-reply@xoot.co.za'},replyTo:{name:'Xoot Support',email:'support@xoot.co.za'},
    to:[{email:e.email}],subject,
    htmlContent:`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="utf-8"><title>${escape(subject)}</title></head><body style="margin:0;background:#F5F2EF;color:#242126;font-family:'Plus Jakarta Sans',Arial,sans-serif"><div style="display:none;max-height:0;overflow:hidden">Your next step, together in Xoot.</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#FFFFFF;border-radius:24px"><tr><td style="padding:36px 28px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#EDE9FD;border-radius:18px;margin-bottom:28px"><tr><td style="padding:20px 0 20px 18px"><img src="https://xoot.co.za/images/xoot-wordmark.png" width="105" height="36" alt="Xoot" style="display:block;width:105px;height:auto"></td><td align="right" style="padding:12px 12px 12px 8px"><img src="https://xoot.co.za/images/xoot-mail-flowers.png" width="160" height="50" alt="" role="presentation" style="display:block;width:160px;max-width:100%;height:auto;border:0"></td></tr></table><p style="color:#4A31B8;font-size:12px;font-weight:bold;letter-spacing:2px">YOUR NEXT CHAPTER</p><h1 style="font-family:Newsreader,Georgia,serif;font-size:28px;line-height:1.25;margin:12px 0 24px">${escape(e.title)}</h1><p style="font-size:16px;line-height:1.7">${escape(greeting)}</p><p style="font-size:16px;line-height:1.7">${escape(e.body)}</p><p style="margin:28px 0"><a href="${escape(link)}" style="display:inline-block;background:#4A31B8;color:#FFFFFF;padding:14px 24px;border-radius:24px;text-decoration:none;font-weight:bold">Open Xoot</a></p><p style="font-size:13px;line-height:1.7;color:#6B6470">Private review details stay inside your account. We will never ask you to reply with a password, sign-in code or banking document.</p><p style="font-size:13px;line-height:1.7"><a href="${escape(preferences)}" style="color:#4A31B8">Choose your Xoot updates</a> · <a href="mailto:support@xoot.co.za" style="color:#4A31B8">Get a hand</a></p>${notice?`<p style="font-size:12px;color:#6B6470">${notice}</p>`:''}</td></tr></table><p style="font-size:11px;color:#6B6470">Xoot Home Services · xoot.co.za</p></td></tr></table></body></html>`,
    textContent:`${e.title}\n\n${greeting}\n\n${e.body}\n\nOpen Xoot: ${link}\nChoose your updates: ${preferences}\nSupport: support@xoot.co.za\n${notice}`,
    eventId:e.id};
}
async function boundedJson(response:Response,max=65536):Promise<unknown>{
  if(!response.body)throw Error('No response');const reader=response.body.getReader();const chunks:Uint8Array[]=[];let size=0;
  try{while(true){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>max){await reader.cancel();throw Error('Oversized response');}chunks.push(next.value);}}
  finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.byteLength;}
  return JSON.parse(new TextDecoder().decode(bytes));
}
export type JourneyEmail=ReturnType<typeof buildJourneyEmail>;
export function createXooterEmailDispatch(config:Config,storeForKey:(key:string)=>Store,sendMail:(email:JourneyEmail)=>Promise<{messageId:string}>,now:()=>number=()=>performance.now()) {
  return async(req:Request):Promise<Response>=>{
    const reply=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
    if(req.method!=='POST')return reply(405,{state:'method_not_allowed'});
    if(req.headers.get('Origin'))return reply(403,{state:'private_worker'});
    const project=PROJECTS[config.supabaseUrl as keyof typeof PROJECTS];
    if(!project)return reply(503,{state:'project_not_configured'});
    const key=req.headers.get('apikey');if(!key)return reply(401,{state:'worker_auth_required'});
    const store=storeForKey(key);
    try{const authority=await store.rpc('xooter_email_worker_authorized');if(authority.error || authority.data!==true)return reply(401,{state:'worker_auth_required'});}
    catch{return reply(401,{state:'worker_auth_required'});}
    let action:unknown;
    try{const input=await boundedJson(new Response(req.body),1024) as Record<string,unknown>;if(!input || Object.keys(input).length!==1)throw Error();action=input.action;}
    catch{return reply(400,{state:'invalid_action'});}
    const appAllowed=trustedJourneyApp(config.appUrl,project);
    if(action==='health')return reply(200,{state:'closed_until_acceptance',smtpConfigured:config.smtpConfigured,appUrlAllowed:appAllowed});
    if(action!=='dispatch')return reply(400,{state:'invalid_action'});
    if(!config.smtpConfigured || !appAllowed)return reply(503,{state:'email_not_configured'});
    // The database requires a recent actual Free-plan review, a test-account allowlist and a
    // nonrenewing20attempt cap. No Brevo API key or API-IP restriction change is used.
    let claim:{id:string;nonce:string};
    try{const result=await store.rpc('claim_xooter_journey_email',{p_project_ref:project});if(result.error)return reply(503,{state:'claim_unavailable'});
      if(!result.data)return reply(200,{state:'no_eligible_email'});claim=result.data as typeof claim;
      if(typeof claim.id!=='string' || typeof claim.nonce!=='string')throw Error();
    }catch{return reply(503,{state:'claim_unavailable'});}
    const finish=async(state:string,messageId:string|null=null)=>{
      try{const result=await store.rpc('finish_xooter_journey_email',{p_id:claim.id,p_nonce:claim.nonce,p_state:state,p_message_id:messageId});return !result.error && result.data===true;}catch{return false;}
    };
    let email:ReturnType<typeof buildJourneyEmail>;
    try{
      const started=now();const result=await store.rpc('authorize_xooter_journey_email',{p_id:claim.id,p_nonce:claim.nonce,p_project_ref:project});
      if(result.error)throw Error();if(!result.data)return reply(200,{state:'suppressed',eventId:claim.id});
      if(now()-started>2000)throw Error();email=buildJourneyEmail(result.data,config.appUrl,project==='fxmxyabdjqviqbcxmvlp');
    }catch{await finish('failed');return reply(503,{state:'dispatch_refused',eventId:claim.id});}
    try{
      const receipt=await sendMail(email);
      if(typeof receipt.messageId!=='string' || !receipt.messageId || receipt.messageId.length>200 || /[\r\n\0]/.test(receipt.messageId))throw Error();
      if(!await finish('accepted',receipt.messageId))return reply(503,{state:'uncertain',eventId:claim.id});
      return reply(200,{state:'accepted',eventId:claim.id});
    }catch{await finish('uncertain');return reply(503,{state:'uncertain',eventId:claim.id});}
  };
}
