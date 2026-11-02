import {beforeAll,beforeEach,describe,expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({serve:vi.fn(),supa:{from:vi.fn()},notification:vi.fn(),outbox:vi.fn(),audit:vi.fn()}));
vi.mock('../_shared/action-utils.ts',()=>({
  fail:(error:string,_origin:unknown,status=400)=>new Response(JSON.stringify({error}),{status}),
  ok:(data:unknown)=>new Response(JSON.stringify({success:true,data})),insertNotification:m.notification,insertOutbox:m.outbox,
}));
vi.mock('../_shared/admin-action-utils.ts',()=>({
  getAdminActionContext:async()=>({body:{application_id:'synthetic-application',reason:'private synthetic review notes'},origin:null,supa:m.supa,user:{id:'synthetic-admin'}}),
  getRequiredId:()=>({id:'synthetic-application'}),requireAdminReason:()=>({reason:'private synthetic review notes'}),writeStrictAdminAuditLog:m.audit,
}));
let handler:(req:Request)=>Promise<Response>;
beforeAll(async()=>{vi.stubGlobal('Deno',{serve:m.serve});await import('./index');handler=m.serve.mock.calls[0][0];});
beforeEach(()=>{vi.clearAllMocks();m.supa.from.mockImplementation(()=>{
  const q={select:()=>q,eq:()=>q,update:()=>q,
    maybeSingle:async()=>({data:{id:'synthetic-application',user_id:'synthetic-owner',status:'submitted'},error:null}),
    single:async()=>({data:{id:'synthetic-application',status:'rejected'},error:null}),
    then:(yes:(result:unknown)=>unknown)=>Promise.resolve({data:null,error:null}).then(yes)};return q;
});});
describe('real rejection handler lifecycle ownership',()=>{
  it('keeps the strict audit but sends no parallel alert or private review-note email',async()=>{
    const result=await handler(new Request('https://example.test',{method:'POST'}));expect(result.status).toBe(200);
    expect(m.audit).toHaveBeenCalledOnce();expect(m.notification).not.toHaveBeenCalled();expect(m.outbox).not.toHaveBeenCalled();
  });
});
