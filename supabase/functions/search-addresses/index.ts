import {fail,getServiceClient,handlePreflight,ok,readJson} from "../_shared/action-utils.ts";
import {searchAddresses} from "./search.ts";

// Public discovery works before signup. It cannot read a customer, booking, GPS or Xooter.
// Every temporary AND permanent attempt needs a service-only atomic finite allowance first.
Deno.serve(async(req:Request)=>{
  const origin=req.headers.get("Origin");const preflight=handlePreflight(req,origin);if(preflight)return preflight;
  const body=await readJson(req,2048);
  if(!body || typeof body!=="object" || Array.isArray(body) || typeof body.query!=="string" || typeof body.mode!=="string")return fail("invalid address search",origin,400);
  try{
    const result=await searchAddresses({mode:body.mode,query:body.query,
      selectedId:typeof body.selectedId==="string"?body.selectedId:undefined,db:getServiceClient(),
      token:Deno.env.get("MAPBOX_GEOCODING_TOKEN")??""});
    const response=result.state==="results"?ok(result,origin):
      fail(result.state==="invalid"?"Address could not be confirmed.":"Address suggestions are temporarily unavailable.",origin,
        result.state==="invalid"?400:result.state==="limited"?429:503);
    response.headers.set("Cache-Control","private, no-store");return response;
  }catch{const response=fail("Address suggestions are temporarily unavailable.",origin,503);response.headers.set("Cache-Control","private, no-store");return response;}
});
