import { describe, expect, it, vi } from "vitest";
import { edgeHandler } from "../test/edge-handler";
const bookingId="11111111-1111-4111-8111-111111111111";
const post=(body:object={},auth=true,origin="https://xoot.co.za")=>new Request("https://edge.test",{method:"POST",headers:{"Content-Type":"application/json",Origin:origin,...(auth?{Authorization:"Bearer verified"}:{})},body:JSON.stringify(body)});
function setup(result:unknown={data:{ok:true,existing:false,review:{id:"review",rating:4,notes:null}},error:null}){
  const rpc=vi.fn().mockResolvedValue(result);
  const handler=edgeHandler("supabase/functions/submit-visit-review/index.ts",(_url,key)=>key==="service"?{rpc}:{auth:{getUser:async()=>({data:{user:{id:"verified-owner"}},error:null})}},{SUPABASE_URL:"https://fake.test",SUPABASE_ANON_KEY:"anon",SUPABASE_SERVICE_ROLE_KEY:"service"});
  return{rpc,handler};
}
describe("authenticated visit rating entrypoint",()=>{
  it("uses verified identity and server-derived subject, ignores supplied owner/Xooter",async()=>{const{rpc,handler}=setup();expect((await handler(post({bookingId,rating:4,notes:"  Actual opinion  ",userId:"attacker",xooterId:"attacker"}))).status).toBe(200);expect(rpc).toHaveBeenCalledWith("save_solo_visit_review",{p_actor_id:"verified-owner",p_booking_id:bookingId,p_rating:4,p_notes:"Actual opinion"});});
  it.each([0,6,1.5,"5",null])("rejects invalid rating %s",async rating=>{const{handler,rpc}=setup();expect((await handler(post({bookingId,rating}))).status).toBe(400);expect(rpc).not.toHaveBeenCalled();});
  it.each([{bookingId:"bad",rating:4},{bookingId,rating:4,notes:"x".repeat(1001)},{bookingId,rating:4,notes:12}])("rejects invalid booking/notes without writes",async body=>{const{handler,rpc}=setup();expect((await handler(post(body))).status).toBe(400);expect(rpc).not.toHaveBeenCalled();});
  it.each([["not_found",404],["not_eligible",409],["crew_pending",409]])("maps %s safely",async(code,status)=>{const{handler}=setup({data:{ok:false,code},error:null});expect((await handler(post({bookingId,rating:4}))).status).toBe(status);});
  it("returns immutable existing review on transport retry",async()=>{const saved={id:"saved",rating:2,notes:"Original"};const{handler}=setup({data:{ok:true,existing:true,review:saved},error:null});expect(await(await handler(post({bookingId,rating:5}))).json()).toEqual({ok:true,existing:true,review:saved});});
  it("fails safely when migration/RPC unavailable without exposing details",async()=>{const{handler}=setup({data:null,error:{message:"private database detail"}});const response=await handler(post({bookingId,rating:4}));expect(response.status).toBe(503);expect(await response.text()).not.toContain("private database");});
  it("rejects unauthenticated and cross-origin writes",async()=>{const{handler,rpc}=setup();expect((await handler(post({},false))).status).toBe(401);expect((await handler(post({bookingId,rating:4},true,"https://attacker.test"))).status).toBe(403);expect(rpc).not.toHaveBeenCalled();});
});
