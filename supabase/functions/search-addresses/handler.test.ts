import {describe,expect,it,vi} from "vitest";
import {handleAddressSearchRequest} from "./handler";
const origin="https://owned.example.invalid";
const request=(method="POST",site:string|null=origin)=>new Request("https://edge.example.invalid/search-addresses",{method,headers:site?{Origin:site}:{}});
const deps=()=>({allowedOrigins:[origin],readInput:vi.fn(async()=>({mode:"suggest",query:"14 Test Road"})),search:vi.fn(async()=>({state:"results" as const,options:[],attribution:"© Mapbox"}))});
describe("Public discovery HTTP boundary",()=>{
  it("rejects unknown origins and methods before any read or search",async()=>{
    const d=deps();const foreign=await handleAddressSearchRequest(request("POST","https://foreign.example.invalid"),d);
    expect(foreign.status).toBe(403);expect(foreign.headers.has("Access-Control-Allow-Origin")).toBe(false);
    expect((await handleAddressSearchRequest(request("GET"),d)).status).toBe(405);
    expect(d.readInput).not.toHaveBeenCalled();expect(d.search).not.toHaveBeenCalled();
  });
  it("preflights only the exact owned origin without using a provider attempt",async()=>{
    const d=deps();const response=await handleAddressSearchRequest(request("OPTIONS"),d);
    expect(response.status).toBe(204);expect(response.headers.get("Access-Control-Allow-Origin")).toBe(origin);expect(d.search).not.toHaveBeenCalled();
  });
  it("returns the explicit discovery contract with no-store and no user data read",async()=>{
    const d=deps();const response=await handleAddressSearchRequest(request(),d);
    expect(response.status).toBe(200);expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(d.search).toHaveBeenCalledExactlyOnceWith({mode:"suggest",query:"14 Test Road",selectedId:undefined});
    expect(await response.json()).toEqual({success:true,data:{state:"results",options:[],attribution:"© Mapbox"}});
  });
  it("keeps malformed input and provider exceptions generic and uncacheable",async()=>{
    const d=deps();d.readInput.mockResolvedValueOnce(null as never);
    expect((await handleAddressSearchRequest(request(),d)).status).toBe(400);expect(d.search).not.toHaveBeenCalled();
    d.search.mockRejectedValueOnce(new Error("SECRET provider detail"));
    const response=await handleAddressSearchRequest(request(),d);expect(response.status).toBe(503);expect(await response.text()).not.toContain("SECRET");expect(response.headers.get("Cache-Control")).toContain("no-store");
  });
});
