import {beforeEach,describe,expect,it,vi} from 'vitest';
import {buildJourneyEmail,createXooterEmailDispatch,trustedJourneyApp} from './handler';
const uuid='10000000-0000-4000-8000-000000000001',nonce='20000000-0000-4000-8000-000000000001';
const config={supabaseUrl:'https://fxmxyabdjqviqbcxmvlp.supabase.co',appUrl:'https://xoot-example-royal777-21s-projects.vercel.app',smtpConfigured:true};
const email={id:uuid,email:'founder-alias@example.test',first_name:'Synthetic',kind:'xooter_welcome',title:'Welcome to Xoot',body:'Continue your private application.',route:'/xooter/apply'};
let rpc:ReturnType<typeof vi.fn>,smtp:ReturnType<typeof vi.fn>;
const handler=(changes={})=>createXooterEmailDispatch({...config,...changes},()=>({rpc}),smtp);
const request=(action='dispatch',headers:Record<string,string>={apikey:'synthetic-service'})=>new Request('https://example.test',{method:'POST',headers,body:JSON.stringify({action})});
beforeEach(()=>{rpc=vi.fn().mockImplementation(async(name:string)=>({data:name==='xooter_email_worker_authorized'?true:name==='claim_xooter_journey_email'?{id:uuid,nonce}:name==='authorize_xooter_journey_email'?email:true,error:null}));smtp=vi.fn().mockResolvedValue({messageId:'<synthetic@provider.test>'});});
describe('private SMTP lifecycle delivery',()=>{
  it('checks the actual role before SMTP',async()=>{rpc.mockResolvedValueOnce({data:false,error:null});expect((await handler()(request())).status).toBe(401);expect(smtp).not.toHaveBeenCalled();});
  it('rejects browser-origin calls',async()=>{expect((await handler()(request('dispatch',{apikey:'synthetic-service',Origin:'https://xoot.co.za'}))).status).toBe(403);expect(rpc).not.toHaveBeenCalled();});
  it('health returns presence only and sends nothing',async()=>{const response=await handler({smtpConfigured:false})(request('health'));expect(await response.json()).toEqual({state:'closed_until_acceptance',smtpConfigured:false,appUrlAllowed:true});expect(smtp).not.toHaveBeenCalled();});
  it('does not claim without configured SMTP',async()=>{expect((await handler({smtpConfigured:false})(request())).status).toBe(503);expect(rpc.mock.calls.some(c=>c[0]==='claim_xooter_journey_email')).toBe(false);});
  it('sends once after fresh authorization and records acceptance only',async()=>{
    const response=await handler()(request());expect(await response.json()).toEqual({state:'accepted',eventId:uuid});expect(smtp).toHaveBeenCalledOnce();
    const payload=smtp.mock.calls[0][0];expect(payload.sender).toEqual({name:'Xoot',email:'no-reply@xoot.co.za'});expect(payload.to).toEqual([{email:email.email}]);expect(payload.subject).toMatch(/^\[Xoot staging test\]/);
    expect(rpc).toHaveBeenLastCalledWith('finish_xooter_journey_email',{p_id:uuid,p_nonce:nonce,p_state:'accepted',p_message_id:'<synthetic@provider.test>'});expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
  it('rehydrates consent/state before sending',async()=>{rpc.mockImplementation(async(name:string)=>({data:name==='xooter_email_worker_authorized'?true:name==='claim_xooter_journey_email'?{id:uuid,nonce}:null,error:null}));expect(await(await handler()(request())).json()).toEqual({state:'suppressed',eventId:uuid});expect(smtp).not.toHaveBeenCalled();});
  it('retains timeout uncertainty without retries',async()=>{smtp.mockRejectedValueOnce(Error('private provider diagnostic'));expect(await(await handler()(request())).json()).toEqual({state:'uncertain',eventId:uuid});expect(smtp).toHaveBeenCalledOnce();expect(rpc).toHaveBeenLastCalledWith('finish_xooter_journey_email',{p_id:uuid,p_nonce:nonce,p_state:'uncertain',p_message_id:null});});
  it('refuses delayed dispatch',async()=>{const times=[0,2001];const response=await createXooterEmailDispatch(config,()=>({rpc}),smtp,()=>times.shift()!)(request());expect((await response.json()).state).toBe('dispatch_refused');expect(smtp).not.toHaveBeenCalled();});
  it('escapes personalization and rejects marketing/email redirects',()=>{const built=buildJourneyEmail({...email,first_name:'<img src=x onerror=alert(1)>'},config.appUrl,true);expect(built.htmlContent).not.toContain('<img src=x');expect(built.htmlContent).toContain('&lt;img src=x');expect(built.htmlContent).toContain('https://xoot.co.za/images/xoot-wordmark.png');expect(()=>buildJourneyEmail({...email,route:'https://foreign.example'},config.appUrl,true)).toThrow();expect(()=>buildJourneyEmail({...email,kind:'xooter_tip_profile'},config.appUrl,true)).toThrow();});
  it('separates preview links from canonical production',()=>{expect(trustedJourneyApp('https://xoot.co.za','mvlrkelahhsyjrwgsxaf')).toBe(true);expect(trustedJourneyApp(config.appUrl,'mvlrkelahhsyjrwgsxaf')).toBe(false);expect(trustedJourneyApp('https://xoot.co.za.evil.test','mvlrkelahhsyjrwgsxaf')).toBe(false);expect(trustedJourneyApp('https://foreign.vercel.app','fxmxyabdjqviqbcxmvlp')).toBe(false);});
});
