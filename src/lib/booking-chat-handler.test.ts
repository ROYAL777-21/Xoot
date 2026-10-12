import { describe, expect, it, vi } from "vitest";
import { edgeHandler } from "../test/edge-handler";
const booking="11111111-1111-4111-8111-111111111111", key="22222222-2222-4222-8222-222222222222";
const body={booking_id:booking,client_message_id:key,encrypted_body:"xoot:e2ee:v1:encrypted",client_safety_flags:[]};
const post=(value:object=body,auth=true,origin="https://xoot.co.za")=>new Request("https://edge.test",{method:"POST",headers:{"Content-Type":"application/json",Origin:origin,...(auth?{Authorization:"Bearer verified"}:{})},body:JSON.stringify(value)});
function setup({enabled=true,rate=true,result={data:{ok:true,existing:false,message:{id:"saved"}},error:null} as any}={}){
  const rpc=vi.fn().mockImplementation(async(name:string)=>name==="consume_rate_limit"?{data:rate,error:null}:result);
  const rows=[{environment:"all",enabled,expires_at:null}];
  const query={select:()=>query,eq:()=>query,in:()=>Promise.resolve({data:rows,error:null})};
  const handler=edgeHandler("supabase/functions/send-booking-message/index.ts",(_url,service)=>service==="service"?{rpc,from:()=>query}:{auth:{getUser:async()=>({data:{user:{id:"verified-owner"}},error:null})}},{SUPABASE_URL:"https://fake.test",SUPABASE_ANON_KEY:"anon",SUPABASE_SERVICE_ROLE_KEY:"service"});
  return {rpc,handler};
}
describe("idempotent authenticated booking chat entrypoint",()=>{
  it("binds the exact envelope/key/canonical flags to verified actor, ignoring browser sender",async()=>{const{rpc,handler}=setup();expect((await handler(post({...body,client_safety_flags:[" z ","a","z"],sender_user_id:"attacker",sender_type:"xooter"}))).status).toBe(201);expect(rpc).toHaveBeenCalledWith("send_booking_message_once",{p_actor_id:"verified-owner",p_booking_id:booking,p_client_message_id:key,p_encrypted_body:body.encrypted_body,p_safety_flags:["a","z"]});});
  it.each([undefined,"bad","",42])("rejects missing/invalid retry key %s without writes",async key=>{const{rpc,handler}=setup();expect((await handler(post({...body,client_message_id:key}))).status).toBe(400);expect(rpc).not.toHaveBeenCalled();});
  it.each([{encrypted_body:"plaintext"},{booking_id:"bad"},{client_safety_flags:"bad"},{client_safety_flags:["x".repeat(49)]},{client_safety_flags:Array(9).fill("a")}])("rejects invalid envelopes/flags/booking",async change=>{const{rpc,handler}=setup();expect((await handler(post({...body,...change}))).status).toBe(400);expect(rpc).not.toHaveBeenCalled();});
  it("rejects oversized encrypted messages",async()=>{const{handler,rpc}=setup();expect((await handler(post({...body,encrypted_body:`xoot:e2ee:v1:${"x".repeat(12000)}`}))).status).toBe(413);expect(rpc).not.toHaveBeenCalled();});
  it.each([[false,true,503],[true,false,429]])("preserves operational/rate gates",async(enabled,rate,status)=>{const{handler,rpc}=setup({enabled:enabled as boolean,rate:rate as boolean});expect((await handler(post())).status).toBe(status);expect(rpc.mock.calls.some(call=>call[0]==="send_booking_message_once")).toBe(false);});
  it.each([["closed",409],["key_conflict",409],["crew_pending",409],["not_found",404],["invalid_request",400]])("maps server revalidation %s safely",async(code,status)=>{const{handler}=setup({result:{data:{ok:false,code},error:null}});expect((await handler(post())).status).toBe(status);});
  it("returns same immutable row on a lost-response retry",async()=>{const{handler}=setup({result:{data:{ok:true,existing:true,message:{id:"original"}},error:null}});const response=await handler(post());expect(response.status).toBe(200);expect(await response.json()).toEqual({success:true,data:{existing:true,message:{id:"original"}}});});
  it("fails safely if migration/RPC unavailable",async()=>{const{handler}=setup({result:{data:null,error:{message:"private error"}}});const response=await handler(post());expect(response.status).toBe(503);expect(await response.text()).not.toContain("private error");});
  it("rejects unauthenticated and cross-origin requests",async()=>{const{handler,rpc}=setup();expect((await handler(post(body,false))).status).toBe(401);expect((await handler(post(body,true,"https://attacker.test"))).status).toBe(403);expect(rpc).not.toHaveBeenCalled();});
});
