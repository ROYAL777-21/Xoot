import {describe,expect,it} from "vitest";
import {webcrypto} from "node:crypto";
import {calendarFeed,hashCalendarCapability} from "./calendar";
import {makeCalendarFeedHandler} from "./handler";
const visit={id:"00000000-0000-4000-8000-000000000001",service:"regular",scheduled_at:"2026-11-01T08:00:00+02:00",duration_hours:5.5,status:"contractor_accepted",updated_at:"2026-10-26T20:00:00Z"};
describe("private updating calendar",()=>{
  it("keeps event identity, increments revision and sends cancellations instead of dropping them",()=>{
    const first=calendarFeed([visit]);
    const changed=calendarFeed([{...visit,scheduled_at:"2026-11-02T09:00:00+02:00",updated_at:"2026-10-26T21:00:00Z"}]);
    const cancelled=calendarFeed([{...visit,status:"cancelled",updated_at:"2026-10-26T22:00:00Z"}]);
    for(const body of [first,changed,cancelled])expect(body).toContain(`UID:${visit.id}@xoot.co.za`);
    expect(first).toContain("DTSTART:20261101T060000Z\r\nDTEND:20261101T113000Z");
    expect(changed).toContain("DTSTART:20261102T070000Z");
    expect(Number(/SEQUENCE:(\d+)/.exec(changed)![1])).toBeGreaterThan(Number(/SEQUENCE:(\d+)/.exec(first)![1]));
    expect(cancelled).toContain("STATUS:CANCELLED\r\nCLASS:PRIVATE\r\nTRANSP:TRANSPARENT");
  });
  it("does not promote provisional visits or share personal fields and injected service text",()=>{
    const body=calendarFeed([{...visit,status:"payment_confirmed",service:"evil\r\nATTENDEE:private",address:"Private street",email:"person@example.invalid",notes:"Gate code 1234"} as typeof visit]);
    expect(body).toContain("STATUS:TENTATIVE");
    for(const secret of ["evil","ATTENDEE","Private street","person@example.invalid","1234","LOCATION:"])expect(body).not.toContain(secret);
    expect(body).toContain("Home service");
    for(const line of body.split("\r\n"))expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });
  it("fails closed rather than truncating or publishing invalid events",()=>{
    for(const patch of [{status:"draft"},{status:"unknown"},{duration_hours:0},{duration_hours:25},{scheduled_at:"broken"},{updated_at:"broken"},{id:"malicious"}])expect(()=>calendarFeed([{...visit,...patch}])).toThrow();
    expect(()=>calendarFeed([visit,visit])).toThrow();
    expect(()=>calendarFeed(Array.from({length:1001},()=>visit))).toThrow();
    expect(calendarFeed([])).toContain("END:VCALENDAR");
  });
  it("hashes the capability before any database read and returns only private non-cacheable ICS",async()=>{
    Object.defineProperty(globalThis,"crypto",{value:webcrypto,configurable:true});
    const token="a".repeat(64),received:string[]=[];
    const handler=makeCalendarFeedHandler(async hash=>{received.push(hash);return {state:"ready",visits:[visit]};});
    const response=await handler(new Request(`https://example.test/functions/v1/calendar-feed/${token}.ics`));
    expect(received).toEqual([await hashCalendarCapability(token)]);expect(received[0]).not.toBe(token);
    expect(response.status).toBe(200);expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
    expect(await response.text()).not.toContain(token);
  });
  it("never looks up malformed paths, token query parameters or write requests",async()=>{
    let reads=0;const handler=makeCalendarFeedHandler(async()=>{reads++;return {state:"ready",visits:[]};});
    for(const path of ["invalid.ics",`${"a".repeat(64)}.ics?owner=other`,"../other"])expect((await handler(new Request(`https://example.test/calendar-feed/${path}`))).status).toBe(404);
    expect((await handler(new Request(`https://example.test/calendar-feed/${"a".repeat(64)}.ics`,{method:"POST"}))).status).toBe(405);
    expect(reads).toBe(0);
  });
  it.each([['missing',404],['limited',429],['unavailable',503]] as const)("denies %s without reflecting the link",async(state,status)=>{
    Object.defineProperty(globalThis,"crypto",{value:webcrypto,configurable:true});
    const response=await makeCalendarFeedHandler(async()=>({state}))(new Request(`https://example.test/calendar-feed/${"a".repeat(64)}.ics`));
    expect(response.status).toBe(status);expect(await response.text()).toBe("Calendar unavailable");
  });
});
