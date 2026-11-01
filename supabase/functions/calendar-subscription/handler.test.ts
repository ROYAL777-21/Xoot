import {describe,expect,it,vi} from "vitest";
import {makeCalendarSubscriptionHandler} from "./handler";
const request=(body:Record<string,unknown>)=>new Request("https://example.test/calendar-subscription",{method:"POST",body:JSON.stringify({expectedSubject:"owner-a",...body})});
function setup(){
  const dependencies={allowed:()=>true,cors:()=>({}),authenticate:vi.fn(async()=>"owner-a" as string|null),readBody:async(req:Request)=>req.json(),consume:vi.fn(async()=>true),status:vi.fn(async()=>({active:false,expiresAt:null})),enable:vi.fn(async()=>({active:true,expiresAt:"2027-10-26T20:00:00Z"})),disable:vi.fn(async()=>{})};
  return {d:dependencies,handle:makeCalendarSubscriptionHandler(dependencies)};
}
describe("calendar subscription management",()=>{
  it("requires actual Auth and rejects client-selected owners before writes",async()=>{
    const {d,handle}=setup();d.authenticate.mockResolvedValueOnce(null);
    expect((await handle(request({action:"enable",tokenHash:"b".repeat(64)}))).status).toBe(401);
    expect((await handle(request({action:"enable",tokenHash:"b".repeat(64),user_id:"victim"}))).status).toBe(400);
    expect(d.enable).not.toHaveBeenCalled();
  });
  it("binds every operation to the verified owner and never returns the hash",async()=>{
    const {d,handle}=setup(),hash="b".repeat(64);
    const response=await handle(request({action:"enable",tokenHash:hash}));
    expect(d.enable).toHaveBeenCalledExactlyOnceWith("owner-a",hash);expect(await response.text()).not.toContain(hash);
    await handle(request({action:"status"}));expect(d.status).toHaveBeenCalledWith("owner-a");
    await handle(request({action:"disable"}));expect(d.disable).toHaveBeenCalledWith("owner-a");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it.each(['enable','disable','status'])("rejects a switched session before %s can access either account",async action=>{
    const {d,handle}=setup();d.authenticate.mockResolvedValueOnce("owner-b");
    expect((await handle(request({action,tokenHash:"b".repeat(64)}))).status).toBe(409);
    expect(d.enable).not.toHaveBeenCalled();expect(d.disable).not.toHaveBeenCalled();expect(d.status).not.toHaveBeenCalled();expect(d.consume).not.toHaveBeenCalled();
  });
  it("does not acknowledge a failed write and preserves the rate limit",async()=>{
    const {d,handle}=setup();d.enable.mockRejectedValueOnce(new Error("Private details"));
    const failed=await handle(request({action:"enable",tokenHash:"b".repeat(64)}));
    expect(failed.status).toBe(503);expect(await failed.text()).not.toContain("Private details");
    d.consume.mockResolvedValueOnce(false);expect((await handle(request({action:"disable"}))).status).toBe(429);
    expect(d.disable).not.toHaveBeenCalled();
  });
});
