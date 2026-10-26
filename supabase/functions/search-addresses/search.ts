export type AddressOption = {id:string;label:string;featureType:"address"};
type Db={rpc(name:"xoot_consume_address_lookup",args:{p_mode:string}):PromiseLike<{data:unknown;error:unknown}>};
type Result={state:"results";options:AddressOption[];attribution:string}|{state:"invalid"|"limited"|"unavailable"};
const MAX_RESPONSE_BYTES=65536;

const parse=(body:unknown):{options:AddressOption[];attribution:string;features:unknown[]}=>{
  const data=body && typeof body==="object"?body as Record<string,unknown>:{};
  const features=Array.isArray(data.features)?data.features.slice(0,5):[];
  const options:AddressOption[]=[];
  for(const item of features){
    const p=(item as {properties?:Record<string,unknown>})?.properties;
    const country=(p?.context as {country?:{country_code?:unknown}})?.country?.country_code;
    if(p?.feature_type!=="address" || String(country).toUpperCase()!=="ZA")continue;
    if(typeof p.mapbox_id!=="string" || !p.mapbox_id || p.mapbox_id.length>256 ||
      typeof p.full_address!=="string" || p.full_address.trim().length<4 || p.full_address.length>220)continue;
    if(!options.some(o=>o.id===p.mapbox_id))options.push({id:p.mapbox_id,label:p.full_address.trim(),featureType:"address"});
  }
  return {options,features,attribution:typeof data.attribution==="string"?data.attribution.slice(0,500):"© Mapbox"};
};

async function readProviderJson(response:Response){
  if(!response.body)throw new Error("missing provider body");
  const reader=response.body.getReader();let total=0;const chunks:Uint8Array[]=[];
  try{
    while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;
      if(total>MAX_RESPONSE_BYTES){await reader.cancel();throw new Error("provider body exceeds limit");}chunks.push(value);}
  }finally{reader.releaseLock();}
  const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  return JSON.parse(new TextDecoder().decode(bytes));
}

/** No served-suburb filtering, coordinates, provider response persistence or worker-availability claim. */
export async function searchAddresses({mode,query,selectedId,db,token,fetcher=fetch}:{
  mode:string;query:string;selectedId?:string;db:Db;token:string;fetcher?:typeof fetch;
}):Promise<Result>{
  const q=query.trim().replace(/\s+/g," ");
  if(!["suggest","confirm"].includes(mode) || q.length<6 || q.length>220 || q.split(" ").length>24 ||
    /[\r\n;\x00-\x1f]/.test(query) || (mode==="confirm" && (!selectedId || selectedId.length>256)))return {state:"invalid"};
  if(!/^(pk|sk)\.[A-Za-z0-9._-]{10,}$/.test(token))return {state:"unavailable"};
  const reserved=await db.rpc("xoot_consume_address_lookup",{p_mode:mode});
  if(reserved.error)return {state:"unavailable"};if(reserved.data!==true)return {state:"limited"};
  const params=new URLSearchParams({q,country:"za",language:"en",types:"address",limit:"5",
    autocomplete:mode==="suggest"?"true":"false",permanent:mode==="confirm"?"true":"false",access_token:token});
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),8000);
  try{
    const response=await fetcher("https://api.mapbox.com/search/geocode/v6/forward?"+params,
      {signal:controller.signal,cache:"no-store",redirect:"error"});
    if(!response.ok)return {state:"unavailable"};
    const parsed=parse(await readProviderJson(response));
    if(mode==="suggest")return {state:"results",options:parsed.options,attribution:parsed.attribution};
    const selected=parsed.options.find(o=>o.id===selectedId);
    const feature=parsed.features.find(f=>(f as {properties?:{mapbox_id?:unknown}})?.properties?.mapbox_id===selectedId) as
      {properties?:{match_code?:Record<string,unknown>;coordinates?:{accuracy?:unknown}}}|undefined;
    const match=feature?.properties?.match_code;
    if(!selected || !["rooftop","parcel","point"].includes(String(feature?.properties?.coordinates?.accuracy)) ||
      !match || !["exact","high"].includes(String(match.confidence)) || match.address_number!=="matched" || match.street!=="matched" ||
      Object.entries(match).some(([key,value])=>key!=="confidence" && !["matched","inferred","not_applicable"].includes(String(value))))return {state:"invalid"};
    return {state:"results",options:[selected],attribution:parsed.attribution};
  }catch{return {state:"unavailable"};}finally{clearTimeout(timer);}
}
