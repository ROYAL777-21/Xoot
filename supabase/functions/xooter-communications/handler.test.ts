import {describe,it,expect,vi} from 'vitest';
import {createXooterCommunicationsHandler} from './handler';
const origin='https://xoot.co.za';
const request=(body:unknown,headers:Record<string,string>={Authorization:'Bearer synthetic-user',Origin:origin})=>new Request(origin,{method:'POST',headers,body:JSON.stringify(body)});
describe('Xooter communication authority',()=>{
  it('forwards the exact user bearer and no recipient identifier',async()=>{
    const rpc=vi.fn().mockResolvedValue({data:{tips:false},error:null});const client=vi.fn(()=>rpc);
    const response=await createXooterCommunicationsHandler([origin],client)(request({action:'start'}));
    expect(response.status).toBe(200);expect(client).toHaveBeenCalledWith('Bearer synthetic-user');
    expect(rpc).toHaveBeenCalledWith('manage_xooter_communications',{p_action:'start',p_preferences:null,p_revision:null});
  });
  it.each([{action:'start',user_id:'other'},{action:'send'},{action:'save',recipient:'other@example.test'},null,[]])('rejects caller-selected targets %j',async body=>{
    const client=vi.fn();expect((await createXooterCommunicationsHandler([origin],client)(request(body))).status).toBe(400);expect(client).not.toHaveBeenCalled();
  });
  it('denies a foreign origin before creating a client',async()=>{
    const client=vi.fn();expect((await createXooterCommunicationsHandler([origin],client)(request({action:'start'},{Authorization:'Bearer synthetic-user',Origin:'https://foreign.example'}))).status).toBe(403);expect(client).not.toHaveBeenCalled();
  });
  it('does not fall back to service role after database denial',async()=>{
    const rpc=vi.fn().mockResolvedValue({data:null,error:{code:'42501',message:'private data'}});const client=vi.fn(()=>rpc);
    const response=await createXooterCommunicationsHandler([origin],client)(request({action:'get'}));expect(response.status).toBe(401);expect(await response.text()).not.toContain('private data');expect(client).toHaveBeenCalledTimes(1);
  });
  it('shows stale preference conflicts without silently re-consenting',async()=>{
    const rpc=vi.fn().mockResolvedValue({data:null,error:{code:'40001'}});
    expect((await createXooterCommunicationsHandler([origin],()=>rpc)(request({action:'save'}))).status).toBe(409);expect(rpc).toHaveBeenCalledTimes(1);
  });
  it('bounds request bytes before parsing',async()=>{
    const client=vi.fn();expect((await createXooterCommunicationsHandler([origin],client)(request({action:'start',extra:'x'.repeat(3000)}))).status).toBe(413);expect(client).not.toHaveBeenCalled();
  });
});
