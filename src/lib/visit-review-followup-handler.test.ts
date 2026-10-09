import { describe, expect, it, vi } from "vitest";
import { edgeHandler } from "../test/edge-handler";
const reviewId="11111111-1111-4111-8111-111111111111";
const post=(body:object={action:"review_followup_requested",reviewId},auth=true,origin="https://xoot.co.za")=>new Request("https://edge.test",{method:"POST",headers:{"Content-Type":"application/json",Origin:origin,...(auth?{Authorization:"Bearer verified"}:{})},body:JSON.stringify(body)});
function setup(result:unknown={data:{queued:true},error:null},verified=true){
  const rpc=vi.fn().mockResolvedValue(result);
  const handler=edgeHandler("supabase/functions/ops-workflow/index.ts",(_url,key)=>key==="service"?{rpc}:{auth:{getUser:async()=>({data:{user:verified?{id:"verified-owner"}:null},error:null})}},{SUPABASE_URL:"https://fake.test",SUPABASE_ANON_KEY:"anon",SUPABASE_SERVICE_ROLE_KEY:"service"});
  return{rpc,handler};
}
describe("actual low-rating follow-up Edge boundary",()=>{
  it("uses verified actor and the atomic RPC and confirms only persisted routing",async()=>{const{rpc,handler}=setup();const response=await handler(post({action:"review_followup_requested",reviewId,userId:"attacker"}));expect(response.status).toBe(200);expect(await response.json()).toEqual({queued:true});expect(rpc).toHaveBeenCalledWith("queue_visit_review_followup",{p_actor_id:"verified-owner",p_review_id:reviewId});});
  it.each(["support_followups","admin_review_queue"])("reports a real %s insert error from the transaction as unqueued",async table=>{const{handler}=setup({data:null,error:{message:`private ${table} insert failure`,code:"23514"}});const response=await handler(post());expect(response.status).toBe(503);const body=await response.json();expect(body.queued).toBe(false);expect(body.error).toContain("could not be recorded");expect(JSON.stringify(body)).not.toContain(table);});
  it.each([null,{}, {queued:"true"}])("fails safely when persistence is unconfirmed: %s",async data=>{const{handler}=setup({data,error:null});expect((await handler(post())).status).toBe(503);});
  it("preserves high-rating no-op and owner not-found semantics",async()=>{const high=setup({data:{queued:false},error:null});expect(await(await high.handler(post())).json()).toEqual({queued:false});const missing=setup({data:{queued:false,code:"not_found"},error:null});expect((await missing.handler(post())).status).toBe(404);});
  it("rejects absent/invalid session and cross-origin requests before routing",async()=>{const valid=setup();expect((await valid.handler(post({},false))).status).toBe(401);expect((await valid.handler(post({},true,"https://attacker.test"))).status).toBe(403);expect(valid.rpc).not.toHaveBeenCalled();const invalid=setup(undefined,false);expect((await invalid.handler(post())).status).toBe(401);expect(invalid.rpc).not.toHaveBeenCalled();});
  it("rejects malformed review identity without routing",async()=>{const{rpc,handler}=setup();expect((await handler(post({action:"review_followup_requested",reviewId:"bad"}))).status).toBe(404);expect(rpc).not.toHaveBeenCalled();});
});
