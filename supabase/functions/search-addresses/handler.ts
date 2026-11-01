type SearchInput={mode:string;query:string;selectedId?:string};
type SearchResult={state:"results";options:unknown[];attribution:string}|{state:"invalid"|"limited"|"unavailable"};
export async function handleAddressSearchRequest(req:Request,deps:{allowedOrigins:string[];readInput:()=>Promise<unknown>;search:(input:SearchInput)=>Promise<SearchResult>}){
  const origin=req.headers.get("Origin");
  const allowed=origin!==null && deps.allowedOrigins.includes(origin);
  const headers:Record<string,string>={"Content-Type":"application/json","Cache-Control":"private, no-store","Vary":"Origin",
    "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
  if(allowed)headers["Access-Control-Allow-Origin"]=origin;
  const json=(body:unknown,status:number)=>new Response(JSON.stringify(body),{status,headers});
  if(origin && !allowed)return json({success:false,error:"origin not allowed"},403);
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
  if(req.method!=="POST")return json({success:false,error:"method not allowed"},405);
  try{
    const body=await deps.readInput();
    if(!body || typeof body!=="object" || Array.isArray(body) || !("query" in body) || typeof body.query!=="string" || !("mode" in body) || typeof body.mode!=="string")return json({success:false,error:"invalid address search"},400);
    const result=await deps.search({mode:body.mode,query:body.query,selectedId:"selectedId" in body && typeof body.selectedId==="string"?body.selectedId:undefined});
    if(result.state==="results")return json({success:true,data:result},200);
    return json({success:false,error:result.state==="invalid"?"Address could not be confirmed.":"Address suggestions are temporarily unavailable."},result.state==="invalid"?400:result.state==="limited"?429:503);
  }catch{return json({success:false,error:"Address suggestions are temporarily unavailable."},503);}
}
