import {getAllowedOrigins,getServiceClient,readJson} from "../_shared/action-utils.ts";
import {searchAddresses} from "./search.ts";
import {handleAddressSearchRequest} from "./handler.ts";

// Public discovery works before signup. It cannot read a customer, booking, GPS or Xooter.
// Every temporary AND permanent attempt needs a service-only atomic finite allowance first.
Deno.serve((req:Request)=>handleAddressSearchRequest(req,{
  allowedOrigins:[...getAllowedOrigins(),...(Deno.env.get("SUPABASE_URL")==="https://fxmxyabdjqviqbcxmvlp.supabase.co"?
    ["https://xoot-git-design-xooter-onboarding-8c61bd-royal777-21s-projects.vercel.app"]:[])],
  readInput:()=>readJson(req,2048),
  search:input=>searchAddresses({...input,db:getServiceClient(),token:Deno.env.get("MAPBOX_GEOCODING_TOKEN")??""}),
}));
