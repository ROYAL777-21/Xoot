/**
 * Xoot's remote Streamable HTTP MCP endpoint.
 * Public catalogue tools plus OAuth 2.1-gated draft-booking tools.
 * Payment capture never occurs here: PayFast hosted checkout is customer-approved.
 */
import { handleMcpMessage } from "./core.ts";
import { XOOT_COMMERCE_TOOLS, getCommerceAuth, runCommerce } from "./commerce.ts";

const defaultOrigins = [
  "https://chatgpt.com", "https://chat.openai.com", "https://claude.ai",
  "https://xoot.co.za", "https://www.xoot.co.za", "https://staging.xoot.co.za",
  "http://localhost:5173", "http://127.0.0.1:5173",
];
const allowedOrigins = new Set([
  ...defaultOrigins,
  ...(Deno.env.get("XOOT_MCP_ALLOWED_ORIGINS") || "").split(",").map(x=>x.trim()).filter(Boolean),
]);
const MAX_BYTES=64*1024;
const serverUrl=()=> {
  const base=(Deno.env.get("SUPABASE_URL")??"").replace(/\/$/,"");
  return base+"/functions/v1/xoot-mcp";
};
const responseJson=(value:unknown,status:number,headers:Record<string,string>)=>
  new Response(JSON.stringify(value),{status,headers});

Deno.serve(async(request:Request):Promise<Response>=>{
  const origin=request.headers.get("Origin");
  const headers:Record<string,string>={
    "Content-Type":"application/json; charset=utf-8",
    "Cache-Control":"no-store","X-Content-Type-Options":"nosniff",
    "Vary":"Origin","Allow":"POST, GET, OPTIONS",
  };
  if(origin&&!allowedOrigins.has(origin))return responseJson({error:"Origin not allowed"},403,headers);
  if(origin){
    headers["Access-Control-Allow-Origin"]=origin;
    headers["Access-Control-Allow-Methods"]="POST, GET, OPTIONS";
    headers["Access-Control-Allow-Headers"]="content-type, accept, mcp-protocol-version, authorization, x-client-info, apikey";
  }
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers});

  // RFC 9728 metadata is accessible to MCP clients but never contains credentials.
  if(request.method==="GET"&&new URL(request.url).pathname.endsWith("/oauth-protected-resource")){
    const issuer=(Deno.env.get("SUPABASE_URL")??"").replace(/\/$/,"")+"/auth/v1";
    return responseJson({
      resource:serverUrl(),authorization_servers:[issuer],
      scopes_supported:["openid","email","profile"],
      bearer_methods_supported:["header"],
    },200,headers);
  }
  if(request.method!=="POST")return responseJson({error:"POST required for MCP tools"},405,headers);
  const declared=Number(request.headers.get("Content-Length")||"0");
  if(Number.isFinite(declared)&&declared>MAX_BYTES)
    return responseJson({error:"Request too large"},413,headers);
  let payload:unknown;
  try{
    const raw=await request.text();
    if(new TextEncoder().encode(raw).length>MAX_BYTES)
      return responseJson({error:"Request too large"},413,headers);
    payload=JSON.parse(raw);
  }catch{
    return responseJson({jsonrpc:"2.0",id:null,error:{code:-32700,message:"Invalid JSON"}},400,headers);
  }
  if(!payload||typeof payload!=="object"||Array.isArray(payload))
    return responseJson({jsonrpc:"2.0",id:null,error:{code:-32600,message:"Invalid request"}},400,headers);
  const rpc=payload as Record<string,unknown>;
  const params=rpc.params&&typeof rpc.params==="object"&&!Array.isArray(rpc.params)?
    rpc.params as Record<string,unknown>:{};
  if(rpc.method==="tools/list"){
    const list=handleMcpMessage(payload);
    if(list?.result && typeof list.result==="object"&&"tools" in list.result){
      return responseJson({...list,result:{
        tools:[...(list.result as {tools:unknown[]}).tools,...XOOT_COMMERCE_TOOLS],
      }},200,headers);
    }
  }
  if(rpc.method==="tools/call"&&XOOT_COMMERCE_TOOLS.some(t=>t.name===params.name)){
    const id=typeof rpc.id==="number"||typeof rpc.id==="string"?rpc.id:null;
    if(!Object.prototype.hasOwnProperty.call(rpc,"id"))return new Response(null,{status:202,headers});
    if(Deno.env.get("XOOT_MCP_COMMERCE_ENABLED")!=="true"){
      return responseJson({jsonrpc:"2.0",id,result:{
        content:[{type:"text",text:"Xoot conversational booking is not enabled in this environment."}],
        structuredContent:{error:"Conversational booking is not enabled"},isError:true,
      }},200,headers);
    }
    const auth=await getCommerceAuth(request.headers.get("Authorization"));
    if(!auth){
      const metadata=serverUrl()+"/oauth-protected-resource";
      headers["WWW-Authenticate"]='Bearer resource_metadata="'+metadata+'", error="invalid_token"';
      return responseJson({
        jsonrpc:"2.0",id,error:{code:-32001,message:"Connect and authorise your Xoot account using OAuth 2.1"},
      },401,headers);
    }
    const args=params.arguments&&typeof params.arguments==="object"&&!Array.isArray(params.arguments)?
      params.arguments as Record<string,unknown>:{};
    try{
      return responseJson({jsonrpc:"2.0",id,result:await runCommerce(String(params.name),args,auth)},200,headers);
    }catch{
      // No credential, address or exception details in the external response.
      return responseJson({jsonrpc:"2.0",id,result:{
        content:[{type:"text",text:"Booking service is temporarily unavailable. No payment was collected."}],
        structuredContent:{error:"Booking service unavailable"},isError:true,
      }},200,headers);
    }
  }
  const result=handleMcpMessage(payload);
  if(result===null)return new Response(null,{status:202,headers});
  return responseJson(result,200,headers);
});
