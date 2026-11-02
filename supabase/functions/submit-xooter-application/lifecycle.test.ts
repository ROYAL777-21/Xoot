import {beforeAll,beforeEach,describe,expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({serve:vi.fn(),supa:{from:vi.fn()},outbox:vi.fn(),notification:vi.fn(),review:vi.fn(),audit:vi.fn()}));
vi.mock('../_shared/action-utils.ts',()=>({
  cleanArray:(v:unknown)=>Array.isArray(v)?v:[],cleanId:(v:unknown)=>typeof v==='string'?v:'',cleanText:(v:unknown)=>typeof v==='string'?v:'',
  fail:(error:string,_origin:unknown,status=400)=>new Response(JSON.stringify({error}),{status}),
  handlePreflight:()=>null,insertNotification:m.notification,insertOutbox:m.outbox,insertReviewQueue:m.review,
  isApprovedLaunchRegion:()=>true,ok:(data:unknown)=>new Response(JSON.stringify({success:true,data})),
  readJson:(req:Request)=>req.json(),requireAuth:async()=>({user:{id:'synthetic-owner',email:'synthetic@example.test'},supa:m.supa}),
  toNumber:(v:unknown)=>Number(v),writeAuditLog:m.audit,
}));
vi.mock('./document-persistence.ts',()=>({persistApplicationDocument:vi.fn()}));
beforeAll(async()=>{vi.stubGlobal('Deno',{serve:m.serve});await import('./index');});
beforeEach(()=>{
  vi.clearAllMocks();m.supa.from.mockImplementation((table:string)=>{
    const q={select:()=>q,eq:()=>q,upsert:vi.fn(()=>q),update:vi.fn(()=>q),
      maybeSingle:async()=>({data:{id:'synthetic-application',status:'draft'},error:null}),
      single:async()=>({data:{id:'synthetic-application',status:'submitted'},error:null}),
      then:(yes:(result:unknown)=>unknown)=>Promise.resolve({data:table==='xooter_documents'?['id','proof_of_residence','bank_statement','selfie'].map(doc_type=>({doc_type,storage_path:'synthetic/private'})):[],error:null}).then(yes)};
    return q;
  });
});
// Save the real registered handler before per-case spy clearing.
let handler:(req:Request)=>Promise<Response>;
describe('real application handler lifecycle ownership',()=>{
  beforeAll(()=>{handler=m.serve.mock.calls[0][0];});
  it('retains the review request and emits no parallel lifecycle alert/email',async()=>{
    const app:Record<string,unknown>={full_name:'Synthetic Applicant',supplies_owned:['mop'],background_check_consent:true,years_experience:2};
    for(const key of ['phone','email','date_of_birth','id_number','suburb','transport','pet_comfort','address','city','postal_code','bank_name','bank_account_number','bank_branch_code','emergency_contact_name','emergency_contact_phone','reference_1_name','reference_1_phone','reference_2_name','reference_2_phone'])app[key]='synthetic';
    const result=await handler(new Request('https://example.test',{method:'POST',body:JSON.stringify({mode:'submitted',application:app})}));
    expect(result.status).toBe(200);expect(await result.json()).toMatchObject({success:true,data:{status:'submitted'}});
    expect(m.review).toHaveBeenCalledOnce();expect(m.notification).not.toHaveBeenCalled();
    expect(m.outbox).toHaveBeenCalledOnce();expect(m.outbox.mock.calls[0][1]).toHaveLength(1);
    expect(m.outbox.mock.calls[0][1][0]).toMatchObject({event_type:'mie_screening_requested',approval_required:true});
  });
});
