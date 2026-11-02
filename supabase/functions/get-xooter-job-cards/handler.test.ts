import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({auth:vi.fn(),rpc:vi.fn(),preflight:vi.fn()}));
vi.mock('../_shared/action-utils.ts',()=>({
 requireAuth:(...args:unknown[])=>mocks.auth(...args),handlePreflight:(...args:unknown[])=>mocks.preflight(...args),
 ok:(data:unknown)=>new Response(JSON.stringify({success:true,data}),{headers:{'Content-Type':'application/json'}}),
 fail:(message:string,_origin:unknown,status=400)=>new Response(JSON.stringify({success:false,error:message}),{status}),
}));
let handler:(request:Request)=>Promise<Response>;
beforeEach(async()=>{vi.resetModules();vi.clearAllMocks();mocks.preflight.mockReturnValue(null);mocks.auth.mockResolvedValue({user:{id:'actual-context-owner'},supa:{rpc:mocks.rpc},response:null});mocks.rpc.mockResolvedValue({data:[],error:null});vi.stubGlobal('Deno',{serve:(fn:typeof handler)=>{handler=fn;}});await import('./index');});
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
describe('actual registered job-card handler',()=>{
 it('derives the RPC actor from authenticated context, keeps the real envelope and forbids caching',async()=>{
  const response=await handler(new Request('https://staging.example.test',{method:'POST',body:JSON.stringify({p_user_id:'different-owner'})}));
  expect(mocks.rpc).toHaveBeenCalledWith('get_xooter_job_cards_for_user',{p_user_id:'actual-context-owner'});
  expect(await response.json()).toEqual({success:true,data:{jobs:[]}});expect(response.headers.get('Cache-Control')).toBe('private, no-store');
 });
 it('does not query private jobs if authentication refuses',async()=>{mocks.auth.mockResolvedValue({response:new Response('denied',{status:401})});expect((await handler(new Request('https://staging.example.test',{method:'POST'}))).status).toBe(401);expect(mocks.rpc).not.toHaveBeenCalled();});
 it('does not disclose a database diagnostic in either response or log',async()=>{
  const warn=vi.spyOn(console,'warn').mockImplementation(()=>{});mocks.rpc.mockResolvedValue({data:null,error:{message:'Synthetic private address diagnostic'}});
  const response=await handler(new Request('https://staging.example.test',{method:'POST'}));expect(response.status).toBe(500);expect(await response.text()).not.toContain('Synthetic private address');expect(warn).toHaveBeenCalledWith('get-xooter-job-cards failed');
 });
});
