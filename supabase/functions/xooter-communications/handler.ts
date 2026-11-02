type RpcResult={data:unknown;error:null|{code?:string}};
type Rpc=(name:string,args:Record<string,unknown>)=>PromiseLike<RpcResult>;
export function createXooterCommunicationsHandler(origins:string[],rpcForBearer:(bearer:string)=>Rpc) {
  return async(req:Request):Promise<Response>=>{
    const origin=req.headers.get('Origin');
    const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',
      'Access-Control-Allow-Origin':origin && origins.includes(origin) ? origin : origins[0],
      'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'};
    const reply=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers});
    if(origin && !origins.includes(origin))return reply(403,{error:'Origin not allowed'});
    if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
    if(req.method!=='POST')return reply(405,{error:'Method not allowed'});
    const bearer=req.headers.get('Authorization');
    if(!bearer?.startsWith('Bearer ') || bearer.length>8192)return reply(401,{error:'Sign in to manage your updates'});
    const reader=req.body?.getReader();let length=0;const chunks:Uint8Array[]=[];
    if(!reader)return reply(400,{error:'An action is required'});
    try {
      while(true){const next=await reader.read();if(next.done)break;length+=next.value.byteLength;if(length>2048){await reader.cancel();return reply(413,{error:'Request too large'});}chunks.push(next.value);}
    }catch{return reply(400,{error:'Invalid request'});}finally{reader.releaseLock();}
    let body:Record<string,unknown>;
    try {const bytes=new Uint8Array(length);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.byteLength;}
      body=JSON.parse(new TextDecoder().decode(bytes));
      if(!body || Array.isArray(body) || typeof body!=='object' || Object.keys(body).some(key=>!['action','preferences','revision'].includes(key)))throw Error();
    }catch{return reply(400,{error:'Invalid request'});}
    if(typeof body.action!=='string' || !['start','get','save'].includes(body.action))return reply(400,{error:'Invalid action'});
    try {
      // PostgREST authenticates the SAME presented user bearer; there is no runtime-admin fallback.
      const result=await rpcForBearer(bearer)('manage_xooter_communications',{
        p_action:body.action,p_preferences:body.preferences ?? null,p_revision:body.revision ?? null,
      });
      if(result.error)return reply(result.error.code==='42501'?401:result.error.code==='40001'?409:400,
        {error:result.error.code==='40001'?'Your choices changed. Reload before saving.':'Your update choices could not be confirmed. Please sign in and try again.'});
      if(!result.data)return reply(503,{error:'Your update choices are unavailable. Try again.'});
      return reply(200,{success:true,data:result.data});
    }catch{return reply(503,{error:'Your update choices are unavailable. Try again.'});}
  };
}
