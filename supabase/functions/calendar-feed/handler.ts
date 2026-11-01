import {calendarFeed,hashCalendarCapability,type FeedVisit} from "./calendar.ts";
type Read={state:"missing"|"limited"|"unavailable"}|{state:"ready";visits:FeedVisit[]};
const headers={"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer","X-Content-Type-Options":"nosniff","X-Robots-Tag":"noindex, nofollow, noarchive"};
export function makeCalendarFeedHandler(read:(hash:string)=>Promise<Read>){
  return async(req:Request)=>{
    if(req.method!=="GET")return new Response("Method not allowed",{status:405,headers:{...headers,Allow:"GET"}});
    const url=new URL(req.url),match=/\/calendar-feed\/([0-9a-f]{64})\.ics$/.exec(url.pathname);
    if(!match||url.search)return new Response("Calendar unavailable",{status:404,headers});
    try{
      const result=await read(await hashCalendarCapability(match[1]));
      if(result.state!=="ready")return new Response("Calendar unavailable",{status:result.state==="missing"?404:result.state==="limited"?429:503,headers});
      return new Response(calendarFeed(result.visits),{headers:{...headers,"Content-Type":"text/calendar; charset=utf-8","Content-Disposition":"inline; filename=\"Xoot.ics\""}});
    }catch{return new Response("Calendar temporarily unavailable",{status:503,headers});}
  };
}
