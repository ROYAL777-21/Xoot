import type { VisitBooking, VisitData, VisitPayment } from "@/components/visits/visit-data";
/** Isolated test fixtures only; never imported by a runtime screen. */
export const visitBooking = (changes: Partial<VisitBooking> = {}): VisitBooking => ({
  id:"visit-a",user_id:"customer-a",xooter_id:"xooter-a",crew_size:1,service:"cleaning",service_type:"regular",scheduled_at:"2026-10-08T06:00:00Z",duration_hours:4,status:"completed",price:393.50,service_fee:39,booking_cover_amount:0,high_demand_premium:0,payment_status:"paid",completion_photo_required:false,arrived_at:null,job_started_at:null,job_completed_at:"2026-10-08T10:00:00Z",completed_at:"2026-10-08T10:00:00Z",cancelled_at:null,address:null,...changes,
});
export const visitPayment = (changes: Partial<VisitPayment> = {}): VisitPayment => ({id:"payment-a",amount:432.50,currency:"ZAR",status:"paid",payment_kind:"booking",meta:{},paid_at:"2026-10-08T05:00:00Z",...changes});
export const visitData = (changes: Partial<VisitData> = {}): VisitData => ({booking:visitBooking(),xooter:{id:"xooter-a",name:"Test Xooter",user_id:"worker-a",photo_url:null,rating:4.65,verified:true,role:"Home care",jobs_completed:9},events:[],photos:[],jobs:[{id:"job-a",xooter_id:"xooter-a",state:"completed"}],tasks:[],messages:[],review:null,payments:[visitPayment()],...changes});
