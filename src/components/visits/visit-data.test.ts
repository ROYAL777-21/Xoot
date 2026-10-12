import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadVisit, money, paymentSummary, reviewEligible, scheduledLabel, storedCents } from "./visit-data";
import { visitBooking, visitData, visitPayment } from "@/test/visit-fixture";
const harness=vi.hoisted(()=>({read:vi.fn(),queries:[] as {table:string;fields?:string;filters:Record<string,unknown>;limit?:number}[]}));
vi.mock("@/integrations/supabase/client",()=>({supabase:{from:(table:string)=>{
  const record={table,filters:{}} as typeof harness.queries[number];harness.queries.push(record);
  const query={select:(fields:string)=>{record.fields=fields;return query;},eq:(field:string,value:unknown)=>{record.filters[field]=value;return query;},in:()=>query,order:()=>query,limit:(limit:number)=>{record.limit=limit;return query;},maybeSingle:()=>harness.read(record),then:(resolve:(value:unknown)=>void,reject:(reason:unknown)=>void)=>harness.read(record).then(resolve,reject)};
  return query;
}}}));
beforeEach(()=>{harness.queries=[];harness.read.mockReset().mockImplementation(async({table})=>({data:table==="bookings"?visitBooking():table==="booking_xooter_profiles"?visitData().xooter:[],error:null}));});
describe("recorded visit money",()=>{
  it.each([[432.50,43250],[0,0],[0.29,29],[393,39300],[1.001,null],[-1,null],[Infinity,null],["393",null]])("converts stored %s rands without repricing",(input,output)=>expect(storedCents(input)).toBe(output));
  it("preserves fractions and separates the actual booking fee",()=>{
    const summary=paymentSummary(visitBooking(),[visitPayment()]);
    expect(summary.total).toBe(43250);expect(summary.lines).toEqual([{label:"Visit · stored service amount",cents:39350},{label:"Booking fee",cents:3900}]);expect(money(summary.total!)).toBe("R432.50");
  });
  it("keeps a historical total and reconciled named discounts",()=>{
    const summary=paymentSummary(visitBooking({price:684}),[visitPayment({amount:611,meta:{breakdown:{subtotal:684,highDemandPremium:0,serviceFee:39,bookingCover:22,carePlusDiscount:34,referralCredit:100,xootcredRedemption:0}}})]);
    expect(summary.itemized).toBe(true);expect(summary.total).toBe(61100);expect(summary.lines.find(line=>line.label==="Referral credit")?.cents).toBe(-10000);
  });
  it("rejects aggregate legacy breakdown for a different visit and never confuses share with total",()=>{
    const summary=paymentSummary(visitBooking({price:684}),[visitPayment({amount:342,status:"pending",meta:{fare_split_id:"split",breakdown:{subtotal:684,serviceFee:39}}})]);
    expect(summary.itemized).toBe(false);expect(summary.total).toBeNull();expect(summary.service).toBe(68400);expect(summary.pending?.amount).toBe(342);expect(summary.pendingShare).toBe(true);expect(summary.paid).toBe(0);
  });
  it.each([{currency:"USD"},{amount:12.345}])("blocks unsupported payment currency/amount",changes=>{const summary=paymentSummary(visitBooking(),[visitPayment({...changes,status:"pending"})]);expect(summary.valid).toBe(false);expect(summary.pending).toBeNull();expect(summary.paid).toBeNull();});
  it("does not treat redirects, pending or admin confirmation as paid",()=>{expect(paymentSummary(visitBooking(),[visitPayment({status:"admin_confirmed"}),visitPayment({id:"two",status:"pending"})]).paid).toBe(0);});
});
describe("bounded participant lookup",()=>{
  it("only reads dependents after owner or assigned worker proof and uses narrow bounded selects",async()=>{
    expect(await loadVisit("visit-a","customer-a")).not.toBeNull();
    expect(harness.queries.every(query=>query.fields!=="*")).toBe(true);
    expect(harness.queries.filter(query=>!["bookings","booking_xooter_profiles"].includes(query.table)).every(query=>query.limit)).toBe(true);
    expect(harness.queries.find(query=>query.table==="payment_records")?.filters).toEqual({booking_id:"visit-a",user_id:"customer-a"});
  });
  it("assigned workers do not read customer payment records",async()=>{expect(await loadVisit("visit-a","worker-a")).not.toBeNull();expect(harness.queries.some(query=>query.table==="payment_records")).toBe(false);});
  it("denies nonparticipants even if backend returns an admin-readable booking",async()=>{expect(await loadVisit("visit-a","other")).toBeNull();expect(harness.queries.length).toBe(2);});
  it("distinguishes valid absence from lookup failure",async()=>{
    harness.read.mockImplementation(async({table})=>({data:null,error:table==="bookings"?{message:"read error"}:null}));await expect(loadVisit("visit-a","customer-a")).rejects.toThrow();
    harness.read.mockResolvedValue({data:null,error:null});expect(await loadVisit("visit-a","customer-a")).toBeNull();
  });
  it("rejects ambiguous duplicate reviews and over-limit dependents",async()=>{
    const normal=harness.read.getMockImplementation()!;
    harness.read.mockImplementation(async record=>record.table==="post_job_reviews"?{data:[{id:"one"},{id:"two"}],error:null}:normal(record));await expect(loadVisit("visit-a","customer-a")).rejects.toThrow();
  });
  it("filters checklist rows to actual accepted/completed jobs",async()=>{const normal=harness.read.getMockImplementation()!;harness.read.mockImplementation(async record=>record.table==="xooter_job_checklist"?{data:[{id:"orphan",job_id:"unrelated"}],error:null}:normal(record));expect((await loadVisit("visit-a","customer-a"))?.tasks).toEqual([]);});
});
describe("rating and scheduled data",()=>{
  it("requires completed owner with an assigned subject and no saved review",()=>{
    expect(reviewEligible(visitBooking(),"customer-a",null)).toBe(true);
    for(const booking of [visitBooking({status:"in_progress"}),visitBooking({xooter_id:null}),visitBooking({cancelled_at:"2026-10-08"})]) expect(reviewEligible(booking,"customer-a",null)).toBe(false);
    expect(reviewEligible(visitBooking(),"worker-a",null)).toBe(false);expect(reviewEligible(visitBooking(),"customer-a",{id:"review",rating:4,notes:null})).toBe(false);
  });
  it("formats a scheduled Johannesburg timestamp without an ETA",()=>{expect(scheduledLabel("2026-10-08T06:00:00Z")).toContain("08:00");expect(scheduledLabel("invalid")).toBe("Time to confirm");});
 it("bounds message/event/task first pages while exposing truthful older-page availability",async()=>{const normal=harness.read.getMockImplementation()!;harness.read.mockImplementation(async record=>record.table==="messages"?{data:Array.from({length:101},(_,i)=>({id:`m-${i}`,body:"recorded",sender_type:"user",created_at:"2026-10-08T08:00:00Z"})),error:null}:record.table==="booking_status_events"?{data:Array.from({length:101},(_,i)=>({id:`e-${i}`,status:"completed",label:"recorded",created_at:"2026-10-08T08:00:00Z"})),error:null}:normal(record));const data=await loadVisit("visit-a","customer-a");expect(data?.messages).toHaveLength(100);expect(data?.events).toHaveLength(100);expect(data?.more).toEqual({messages:true,events:true,tasks:false,photos:false});});
});
