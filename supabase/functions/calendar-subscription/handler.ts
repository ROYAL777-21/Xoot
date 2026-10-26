type Status={active:boolean;expiresAt:string|null};
type Dependencies={
  allowed:(origin:string|null)=>boolean;cors:(origin:string|null)=>Record<string,string>;
  authenticate:(req:Request)=>Promise<string|null>;readBody:(req:Request)=>Promise<Record<string,unknown>>;
  consume:(owner:string)=>Promise<boolean>;status:(owner:string)=>Promise<Status>;
  enable:(owner:string,hash:string)=>Promise<Status>;disable:(owner:string)=>Promise<void>;
};
/** Owner identity comes exclusively from verified Auth, never a request-body ID. */
export function makeCalendarSubscriptionHandler(d:Dependencies){
  return async(req:Request)=>{
    const origin=req.headers.get("origin");
    const reply=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:{...d.cors(origin),"Content-Type":"application/json","Cache-Control":"private, no-store"}});
    if(!d.allowed(origin))return reply(403,{success:false,error:"Origin not allowed"});
    if(req.method==="OPTIONS")return new Response(null,{status:204,headers:d.cors(origin)});
    if(req.method!=="POST")return reply(405,{success:false,error:"Method not allowed"});
    try{
      const owner=await d.authenticate(req);if(!owner)return reply(401,{success:false,error:"Sign in to manage your calendar"});
      const body=await d.readBody(req);
      if(Object.keys(body).some(key=>!['action','tokenHash'].includes(key))||!['status','enable','disable'].includes(String(body.action)))return reply(400,{success:false,error:"Invalid request"});
      if(body.action==="enable"&&(typeof body.tokenHash!=="string"||!/^[0-9a-f]{64}$/.test(body.tokenHash)))return reply(400,{success:false,error:"Invalid request"});
      if(!await d.consume(owner))return reply(429,{success:false,error:"Please wait before trying again"});
      if(body.action==="disable"){await d.disable(owner);return reply(200,{success:true,data:{active:false,expiresAt:null}});}
      const result=body.action==="enable"?await d.enable(owner,body.tokenHash as string):await d.status(owner);
      return reply(200,{success:true,data:result});
    }catch{return reply(503,{success:false,error:"Calendar settings could not be saved or loaded"});}
  };
}
