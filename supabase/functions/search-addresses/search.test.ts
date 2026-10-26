import {afterEach,describe,expect,it,vi} from "vitest";
import {searchAddresses} from "./search";
const label="14 Synthetic Test Road, Mamelodi, Pretoria, South Africa";
const feature={properties:{mapbox_id:"synthetic-id",full_address:label,feature_type:"address",
  context:{country:{country_code:"ZA"}},coordinates:{accuracy:"rooftop"},match_code:{confidence:"exact",address_number:"matched",street:"matched",country:"matched"}}};
const provider=(features:unknown[]=[feature])=>new Response(JSON.stringify({features,attribution:"© Mapbox"}));
function fixture(){return{db:{rpc:vi.fn().mockResolvedValue({data:true,error:null})},fetcher:vi.fn().mockResolvedValue(provider()),token:"pk.synthetic-address-read-token"};}
afterEach(()=>vi.useRealTimers());
describe("server-capped address lookup (provider doubles)",()=>{
  it("makes no provider call when input, token or allowance is invalid",async()=>{
    for(const patch of [{query:"abc"},{mode:"other"},{query:"14 Test;other"},{token:""}]){
      const f=fixture();expect((await searchAddresses({...f,mode:"suggest",query:"14 Test Road",...patch})).state).not.toBe("results");expect(f.fetcher).not.toHaveBeenCalled();expect(f.db.rpc).not.toHaveBeenCalled();
    }
    for(const reservation of [{data:false,error:null},{data:true,error:{message:"budget missing"}}]){
      const f=fixture();f.db.rpc.mockResolvedValue(reservation);expect((await searchAddresses({...f,mode:"suggest",query:"14 Test Road"})).state).not.toBe("results");expect(f.fetcher).not.toHaveBeenCalled();
    }
  });
  it("suggests address-level results independently of official served suburbs, without returning coordinates",async()=>{
    const f=fixture();const result=await searchAddresses({...f,mode:"suggest",query:"14 Test Road"});
    expect(result).toEqual({state:"results",options:[{id:"synthetic-id",label,featureType:"address"}],attribution:"© Mapbox"});
    expect(f.db.rpc).toHaveBeenCalledWith("xoot_consume_address_lookup",{p_mode:"suggest"});
    const url=new URL(f.fetcher.mock.calls[0][0]);expect(url.origin).toBe("https://api.mapbox.com");
    expect(url.searchParams.get("autocomplete")).toBe("true");expect(url.searchParams.get("permanent")).toBe("false");
    expect(f.fetcher.mock.calls[0][1]).toMatchObject({cache:"no-store",redirect:"error"});
  });
  it("rejects place-only, foreign, malformed and duplicate suggestions",async()=>{
    const f=fixture();f.fetcher.mockResolvedValue(provider([null,{properties:{...feature.properties,feature_type:"place"}},
      {properties:{...feature.properties,context:{country:{country_code:"US"}}}},feature,feature]));
    const result=await searchAddresses({...f,mode:"suggest",query:"14 Test Road"});
    expect(result.state==="results"?result.options:[]).toHaveLength(1);
  });
  it("confirms selection using Permanent Geocoding only after reserving the shared budget",async()=>{
    const f=fixture();const result=await searchAddresses({...f,mode:"confirm",query:label,selectedId:"synthetic-id"});
    expect(result.state).toBe("results");expect(f.db.rpc).toHaveBeenCalledWith("xoot_consume_address_lookup",{p_mode:"confirm"});
    const url=new URL(f.fetcher.mock.calls[0][0]);expect(url.searchParams.get("permanent")).toBe("true");expect(url.searchParams.get("autocomplete")).toBe("false");
  });
  it("never confirms a different feature, uncertain match or imprecise address",async()=>{
    for(const p of [{...feature.properties,mapbox_id:"other"},{...feature.properties,match_code:{confidence:"low",address_number:"matched",street:"matched"}},
      {...feature.properties,match_code:{confidence:"exact",address_number:"unmatched",street:"matched"}},
      {...feature.properties,coordinates:{accuracy:"interpolated"}},{...feature.properties,match_code:{confidence:"high",address_number:"matched",street:"matched",place:"unmatched"}}]){
      const f=fixture();f.fetcher.mockResolvedValue(provider([{properties:p}]));
      expect((await searchAddresses({...f,mode:"confirm",query:label,selectedId:"synthetic-id"})).state).toBe("invalid");
    }
  });
  it("handles provider rejection, invalid JSON and oversized bodies without a fallback or retry",async()=>{
    for(const response of [new Response("error",{status:429}),new Response("{broken"),new Response("x".repeat(65537))]){
      const f=fixture();f.fetcher.mockResolvedValue(response);
      expect((await searchAddresses({...f,mode:"suggest",query:"14 Test Road"})).state).toBe("unavailable");expect(f.db.rpc).toHaveBeenCalledTimes(1);expect(f.fetcher).toHaveBeenCalledTimes(1);
    }
  });
  it("bounds the complete provider request with a timeout",async()=>{
    vi.useFakeTimers();const f=fixture();f.fetcher.mockImplementation((_url,init)=>new Promise((_resolve,reject)=>{
      init.signal.addEventListener("abort",()=>reject(new DOMException("Aborted","AbortError")));
    }));
    const pending=searchAddresses({...f,mode:"suggest",query:"14 Test Road"});await vi.advanceTimersByTimeAsync(8001);
    expect((await pending).state).toBe("unavailable");expect(f.fetcher).toHaveBeenCalledTimes(1);
  });
});

