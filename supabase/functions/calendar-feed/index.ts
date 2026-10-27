import {getServiceClient} from "../_shared/action-utils.ts";
import {makeCalendarFeedHandler} from "./handler.ts";
Deno.serve(makeCalendarFeedHandler(async hash=>{
  const {data,error}=await getServiceClient().rpc("xoot_read_calendar_feed",{p_hash:hash});
  if(error||!data||typeof data!=="object")throw new Error("Calendar unavailable");
  return data;
}));
