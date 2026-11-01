import { normaliseBookingStatus } from "../_shared/booking-state-machine.ts";

export type FeedVisit = {id:string;service:string;scheduled_at:string;duration_hours:number;status:string;updated_at:string;calendar_revision:number};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const names:Record<string,string>={regular:"Regular cleaning",residential:"Home cleaning",express:"Express cleaning",airbnb:"Airbnb clean",office:"Office clean",moving:"Moving clean",premium:"Home cleaning"};
const stamp=(value:Date)=>value.toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z");
const text=(value:string)=>value.replace(/\\/g,"\\\\").replace(/\r?\n/g,"\\n").replace(/;/g,"\\;").replace(/,/g,"\\,");
function fold(value:string){
  const encoder=new TextEncoder(); let output="",width=0;
  for(const char of value){const count=encoder.encode(char).length;if(width+count>75){output+="\r\n ";width=1;}output+=char;width+=count;}
  return output;
}

/** Provider subscription snapshot. Cancellation tombstones retain the same event UID. */
export function calendarFeed(visits:FeedVisit[]){
  if(!Array.isArray(visits)||visits.length>1000)throw new Error("Invalid calendar");
  const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Xoot//Private visits//EN","CALSCALE:GREGORIAN","METHOD:PUBLISH","X-WR-CALNAME:Xoot visits","REFRESH-INTERVAL;VALUE=DURATION:PT1H"];
  const seen=new Set<string>();
  for(const visit of visits){
    const status=normaliseBookingStatus(visit.status),start=new Date(visit.scheduled_at),revision=new Date(visit.updated_at);
    if(!uuid.test(visit.id)||seen.has(visit.id)||!status||status==="draft"||
      !/T.*(?:Z|[+-]\d\d:\d\d)$/.test(visit.scheduled_at)||!Number.isFinite(start.getTime())||
      !/T.*(?:Z|[+-]\d\d:\d\d)$/.test(visit.updated_at)||!Number.isFinite(revision.getTime())||
      !Number.isFinite(visit.duration_hours)||visit.duration_hours<=0||visit.duration_hours>24||
      !Number.isSafeInteger(visit.calendar_revision)||visit.calendar_revision<0||visit.calendar_revision>2147483647)throw new Error("Invalid calendar visit");
    seen.add(visit.id);
    const cancelled=status==="cancelled",done=status==="completed"||status==="rated";
    const confirmed=done||["contractor_accepted","en_route","in_progress"].includes(status);
    const url=`https://xoot.co.za/app/bookings/${visit.id}`;
    const message=cancelled?"Visit cancelled.":done?"Visit completed.":confirmed?"Xooter confirmed.":"Provisional visit; check Xoot for confirmation.";
    lines.push("BEGIN:VEVENT",`UID:${visit.id}@xoot.co.za`,`DTSTAMP:${stamp(revision)}`,`LAST-MODIFIED:${stamp(revision)}`,`SEQUENCE:${visit.calendar_revision}`,
      `DTSTART:${stamp(start)}`,`DTEND:${stamp(new Date(start.getTime()+visit.duration_hours*3600000))}`,
      `SUMMARY:${text(`Xoot · ${names[visit.service]??"Home service"}`)}`,
      `DESCRIPTION:${text(`${message} End time is an estimate. Open Xoot for current details: ${url}`)}`,
      `URL:${url}`,`STATUS:${cancelled?"CANCELLED":confirmed?"CONFIRMED":"TENTATIVE"}`,"CLASS:PRIVATE",`TRANSP:${cancelled||done?"TRANSPARENT":"OPAQUE"}`,"END:VEVENT");
  }
  lines.push("END:VCALENDAR");return lines.map(fold).join("\r\n")+"\r\n";
}

export async function hashCalendarCapability(token:string){
  const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token));
  return [...new Uint8Array(bytes)].map(byte=>byte.toString(16).padStart(2,"0")).join("");
}
