/**
 * Authenticated, human-confirmed Xoot booking workflow for MCP clients.
 * NO card data or home address is ever accepted as an LLM tool argument.
 * Default-disabled until Xoot OAuth server, consent, approved clients and rate limits
 * are configured and independently tested.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCarePlusDiscount } from "../_shared/care-plus-membership.ts";
import { isApprovedLaunchRegion } from "../_shared/action-utils.ts";
import { parseChoice, quoteOneWorker } from "./commerce-policy.ts";

const ROOT = "https://xoot.co.za";
const RELEASE_FLAG = "XOOT_MCP_COMMERCE_ENABLED";
const writeAnnotations = { readOnlyHint:false, destructiveHint:true, idempotentHint:false, openWorldHint:true };
const readAnnotations = { readOnlyHint:true, destructiveHint:false, idempotentHint:true, openWorldHint:false };
const SCHEMA_ID = {type:"string",pattern:"^[0-9a-fA-F-]{36}$"};

export const XOOT_COMMERCE_TOOLS = [
 {name:"list_my_saved_addresses",title:"Choose a saved Xoot home",
  description:"After linking Xoot through OAuth, list labels and opaque IDs for this customer's saved addresses. Never disclose the street address to the assistant.",
  annotations:readAnnotations,inputSchema:{type:"object",properties:{},additionalProperties:false}},
 {name:"prepare_xoot_booking",title:"Preview a Xoot booking for approval",
  description:"Requires Xoot sign-in. Create a 15-minute, idempotent booking intent for one Xooter at a SAVED address. Return a server-priced amount and breakdown before any booking is created. Price may change before final confirmation. Dates/times and the saved-address ID must be supplied. A booking slot is NOT guaranteed.",
  annotations:{...writeAnnotations,destructiveHint:false},
  inputSchema:{type:"object",properties:{
    saved_address_id:SCHEMA_ID,
    service_type:{type:"string",enum:["regular","express","office","airbnb","moving"]},
    hours:{type:"number"},date:{type:"string",description:"Date YYYY-MM-DD (South African local date)"},
    time:{type:"string",description:"HH:mm (Johannesburg local)"},
    booking_cover_opt_in:{type:"boolean",description:"Customer explicitly opts in or out of optional Booking Cover; never default this to true."},
    idempotency_key:{type:"string",description:"Stable client-created unique key, 16-80 letters/digits/_/-. Reuse on retries."}
  },required:["saved_address_id","service_type","hours","date","time","booking_cover_opt_in","idempotency_key"],additionalProperties:false}},
 {name:"confirm_xoot_booking_draft",title:"Confirm a reviewed booking draft",
  description:"MUTATION. Only call after the customer explicitly approves this particular quote, total and date/time. Must provide prepared intent ID and the exact displayed total in ZAR cents. This creates a PENDING-PAYMENT DRAFT, not a paid, assigned or confirmed appointment. Returns a payment handoff; never charges a card.",
  annotations:writeAnnotations,inputSchema:{type:"object",properties:{
    intent_id:SCHEMA_ID,approved_total_cents:{type:"integer",minimum:5000},
    confirm:{type:"boolean",const:true,description:"Only true after explicit customer approval for this intent and amount."}
  },required:["intent_id","approved_total_cents","confirm"],additionalProperties:false}},
 {name:"start_xoot_payment_checkout",title:"Continue to secure Xoot payment",
  description:"After a booking draft is created, verify ownership and pending payment, and return the official Xoot checkout page. PayFast payment authorisation happens OUTSIDE the LLM through an HTTPS checkout form and verified provider notification. Does not transmit card details or initiate a charge in the assistant.",
  annotations:readAnnotations,inputSchema:{type:"object",properties:{intent_id:SCHEMA_ID},required:["intent_id"],additionalProperties:false}},
 {name:"get_xoot_booking_payment_status",title:"Check payment status",
  description:"For a booking created through this plugin, read only this customer's server-recorded payment and booking state. Only a verified provider notification establishes payment success; never infer it from a return URL.",
  annotations:readAnnotations,inputSchema:{type:"object",properties:{intent_id:SCHEMA_ID},required:["intent_id"],additionalProperties:false}}
] as const;

const toolResult=(value:Record<string,unknown>,isError=false)=>({
  content:[{type:"text",text:JSON.stringify(value)}],structuredContent:value,isError,
});
const refuse=(error:string,more:Record<string,unknown>={})=>toolResult({error,...more},true);
const isRecord=(x:unknown):x is Record<string,unknown>=>x!==null&&typeof x==="object"&&!Array.isArray(x);
type Auth={token:string;userId:string;clientId:string};
type ToolArgs=Record<string,unknown>;
const service=()=>{
  const url=Deno.env.get("SUPABASE_URL") ?? "";
  const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if(!url||!key)throw new Error("MCP server credentials missing");
  return createClient(url,key,{auth:{persistSession:false}});
};
/**
 * No third-party token can access commerce without a verified Supabase OAuth JWT,
 * a client_id on the JWT, and explicit operator approval of that client.
 * This cannot be spoofed by passing user_id or client_id as tool arguments.
 */
export async function getCommerceAuth(header:string|null):Promise<Auth|null>{
  if(Deno.env.get(RELEASE_FLAG)!=="true")return null;
  const clients=(Deno.env.get("XOOT_MCP_OAUTH_CLIENT_IDS")??"").split(",").map(s=>s.trim()).filter(Boolean);
  if(!clients.length || !header?.startsWith("Bearer "))return null;
  const token=header.slice(7).trim();
  if(!token||token.length>8000)return null;
  const url=Deno.env.get("SUPABASE_URL")??"";
  const pub=Deno.env.get("SUPABASE_ANON_KEY")??Deno.env.get("SUPABASE_PUBLISHABLE_KEY")??"";
  if(!url||!pub)return null;
  try {
    const auth=createClient(url,pub,{auth:{persistSession:false}});
    const [{data:userData,error:userError},{data:claimsData,error:claimsError}]=await Promise.all([
      auth.auth.getUser(token),auth.auth.getClaims(token),
    ]);
    if(userError || claimsError || !userData.user || !claimsData?.claims)return null;
    const claims=claimsData.claims as Record<string,unknown>;
    const clientId=typeof claims.client_id==="string" ? claims.client_id : "";
    if(!clientId || !clients.includes(clientId) || claims.sub!==userData.user.id)return null;
    return {token,userId:userData.user.id,clientId};
  }catch{return null;}
}

async function invokeCustomerEndpoint(auth:Auth,path:string,data:Record<string,unknown>){
  const url=(Deno.env.get("SUPABASE_URL")??"").replace(/\/$/,"");
  const pub=Deno.env.get("SUPABASE_ANON_KEY")??Deno.env.get("SUPABASE_PUBLISHABLE_KEY")??"";
  const res=await fetch(url+"/functions/v1/"+path,{
    method:"POST",
    headers:{"Content-Type":"application/json",Authorization:"Bearer "+auth.token,apikey:pub},
    body:JSON.stringify(data),
    signal:AbortSignal.timeout(18000),
  });
  const result=await res.json().catch(()=>null);
  if(!res.ok || !isRecord(result) || result.success!==true || !isRecord(result.data)){
    const reason=isRecord(result) && typeof result.error==="string"?result.error:"Action not available";
    throw new Error(reason.slice(0,180));
  }
  return result.data;
}
const quoteShape=(row:Record<string,unknown>)=>({
  intent_id:row.id,expires_at:row.expires_at,
  service_type:row.service_type,date:row.booking_date,time:row.booking_time,
  hours:row.hours,cover_opt_in:row.booking_cover_opt_in,
  total_cents:row.quote_total_cents,breakdown:row.quote_breakdown,
  status:row.status,currency:"ZAR",
  disclaimer:"This is not an assigned or paid booking. Confirming creates a payment-pending draft; Xooter and slot are unconfirmed.",
});
async function intentFor(supa:ReturnType<typeof service>,auth:Auth,id:unknown){
  if(typeof id!=="string" || !/^[0-9a-f-]{36}$/i.test(id))return null;
  const {data,error}=await supa.from("llm_booking_intents").select("*")
    .eq("id",id).eq("user_id",auth.userId).eq("oauth_client_id",auth.clientId).maybeSingle();
  return error?null:data as Record<string,unknown>|null;
}
export async function runCommerce(name:string,args:ToolArgs,auth:Auth) {
  const supa=service();
  if(name==="list_my_saved_addresses"){
    const {data,error}=await supa.from("saved_addresses").select("id,label,is_default")
      .eq("user_id",auth.userId).order("is_default",{ascending:false}).limit(20);
    if(error)return refuse("Saved address labels are unavailable");
    return toolResult({addresses:(data??[]).map(r=>({id:r.id,label:r.label,is_default:r.is_default})),
      note:"No street address, gate code or private household details are sent to the assistant. Add addresses in Xoot if none are listed."});
  }
  if(name==="prepare_xoot_booking"){
    const choice=parseChoice(args);
    if(!choice)return refuse("Unsupported details. Select valid service, approved hours, saved address, time, date within 90 days, explicit cover selection, and a stable idempotency key.");
    const {data:address,error:addressError}=await supa.from("saved_addresses")
      .select("id,address,label").eq("id",choice.saved_address_id).eq("user_id",auth.userId).maybeSingle();
    if(addressError||!address||!isApprovedLaunchRegion(address.address)){
      return refuse("Saved address is not available or not within configured launch coverage.");
    }
    const {data:prior}=await supa.from("llm_booking_intents").select("*")
      .eq("user_id",auth.userId).eq("oauth_client_id",auth.clientId)
      .eq("idempotency_key",choice.idempotency_key).maybeSingle();
    const matches=(r:Record<string,unknown>)=>
      r.saved_address_id===choice.saved_address_id&&r.service_type===choice.service_type&&
      Number(r.hours)===choice.hours&&r.booking_date===choice.date&&r.booking_time===choice.time&&
      r.booking_cover_opt_in===choice.booking_cover_opt_in;
    if(prior){
      if(!matches(prior))return refuse("Idempotency key already used for a different booking. Start a new intent.");
      return toolResult({...quoteShape(prior),saved_address_label:address.label,reused:true});
    }
    const {count,error:countError}=await supa.from("llm_booking_intents")
      .select("id",{count:"exact",head:true}).eq("user_id",auth.userId)
      .gte("prepared_at",new Date(Date.now()-10*60000).toISOString());
    if(countError || (count??0)>=8)return refuse("Too many recent booking attempts. Continue existing intents or try again later.");
    const rate=await getCarePlusDiscount(supa,auth.userId);
    const quote=quoteOneWorker(choice.service_type,choice.hours,choice.time,rate,choice.booking_cover_opt_in);
    if(!quote)return refuse("Unsupported price ladder");
    const {data:row,error:insertError}=await supa.from("llm_booking_intents").insert({
      user_id:auth.userId,oauth_client_id:auth.clientId,
      idempotency_key:choice.idempotency_key,saved_address_id:choice.saved_address_id,
      service_type:choice.service_type,hours:choice.hours,
      booking_date:choice.date,booking_time:choice.time,
      booking_cover_opt_in:choice.booking_cover_opt_in,
      quote_total_cents:quote.total_cents,quote_breakdown:quote,
      expires_at:new Date(Date.now()+15*60000).toISOString(),
    }).select("*").single();
    if(insertError||!row){
      // Unique constraint wins the race. Never manufacture a second intent.
      const {data:existing}=await supa.from("llm_booking_intents").select("*")
        .eq("user_id",auth.userId).eq("oauth_client_id",auth.clientId)
        .eq("idempotency_key",choice.idempotency_key).maybeSingle();
      if(!existing||!matches(existing))return refuse("Could not prepare booking");
      return toolResult({...quoteShape(existing),saved_address_label:address.label,reused:true});
    }
    return toolResult({...quoteShape(row),saved_address_label:address.label,reused:false,
      next_step:"Show the user the full amount, date/time, service, cover status and unconfirmed-slot notice. Ask for explicit approval before confirming."});
  }
  if(name==="confirm_xoot_booking_draft"){
    if(args.confirm!==true||!Number.isSafeInteger(args.approved_total_cents))return refuse("Explicit confirmation and an exact reviewed amount in cents are required");
    const row=await intentFor(supa,auth,args.intent_id);
    if(!row)return refuse("Booking intent not found");
    if(row.status==="submitted")return toolResult({
      ...quoteShape(row),booking_id:row.booking_id,payment_record_id:row.payment_record_id,
      payment_status:"pending",checkout_url:ROOT+"/app/bookings/"+row.booking_id+"?payment=pending",
      reused:true,
    });
    if(row.status!=="prepared")return refuse("This request is being processed or requires human review; it cannot be submitted again.");
    if(Date.parse(String(row.expires_at))<=Date.now())return refuse("The quote expired. Prepare a fresh quote for customer approval.");
    if(Number(row.quote_total_cents)!==args.approved_total_cents)return refuse("Approved amount differs from the quote. Do not book; review the price again.");
    const {data:claimed,error:claimError}=await supa.from("llm_booking_intents")
      .update({status:"submitting"}).eq("id",row.id).eq("user_id",auth.userId)
      .eq("oauth_client_id",auth.clientId).eq("status","prepared").select("id").maybeSingle();
    if(claimError||!claimed)return refuse("The booking has already been claimed by another request. Check its status; do not repeat.");
    try {
      const {data:address,error:addressError}=await supa.from("saved_addresses").select("address")
        .eq("id",row.saved_address_id).eq("user_id",auth.userId).maybeSingle();
      if(addressError||!address||!isApprovedLaunchRegion(address.address))throw new Error("Saved address no longer valid");
      const created=await invokeCustomerEndpoint(auth,"create-booking",{
        serviceType:row.service_type==="regular"?"residential":row.service_type,
        frequency:"one_time",homeSize:"small",serviceLength:"standard",
        date:row.booking_date,time:row.booking_time,hours:Number(row.hours),
        address:address.address,
        workerCount:1,xooterIds:[],addOns:[],
        bookingCoverOptIn:row.booking_cover_opt_in,
      });
      const bookingId=created.booking_id;
      const recordIds=created.payment_record_ids;
      const amountDue=created.amount_due;
      // Never permit checkout if membership, timing or price changed after review.
      if(typeof bookingId!=="string"||!Array.isArray(recordIds)||
        typeof recordIds[0]!=="string"||Math.round(Number(amountDue)*100)!==Number(row.quote_total_cents)){
        await supa.from("llm_booking_intents").update({status:"needs_review",
          booking_id:typeof bookingId==="string"?bookingId:null,
          payment_record_id:Array.isArray(recordIds)&&typeof recordIds[0]==="string"?recordIds[0]:null,
        }).eq("id",row.id).eq("user_id",auth.userId);
        return refuse("Price or booking state changed while submitting. A draft may have been created but checkout is blocked. Review in your Xoot bookings page; do not submit again.",{bookings_url:ROOT+"/app/bookings"});
      }
      await supa.from("llm_booking_intents").update({
        status:"submitted",booking_id:bookingId,payment_record_id:recordIds[0],
        submitted_at:new Date().toISOString(),
      }).eq("id",row.id).eq("user_id",auth.userId).eq("status","submitting");
      return toolResult({
        intent_id:row.id,status:"draft_pending_payment",booking_id:bookingId,
        quote_total_cents:row.quote_total_cents,currency:"ZAR",
        payment_status:"pending",xooter_assigned:false,
        checkout_url:ROOT+"/app/bookings/"+bookingId+"?payment=pending",
        note:"The customer approved a priced draft. No card charge, payment confirmation, available slot or Xooter assignment has occurred.",
      });
    }catch{
      // Crash/network/ambiguous response: DO NOT reopen the intent, because a booking may exist.
      await supa.from("llm_booking_intents").update({status:"needs_review"})
        .eq("id",row.id).eq("user_id",auth.userId).eq("status","submitting");
      return refuse("The booking outcome needs review. To avoid duplicate bookings, do NOT retry with a new key. Open the Xoot bookings page.",{bookings_url:ROOT+"/app/bookings"});
    }
  }
  if(name==="start_xoot_payment_checkout"||name==="get_xoot_booking_payment_status"){
    const row=await intentFor(supa,auth,args.intent_id);
    if(!row||row.status!=="submitted"||typeof row.booking_id!=="string"||
      typeof row.payment_record_id!=="string"){
      return refuse("No submitted booking/payment record found for this user and connected LLM client.");
    }
    const {data:payment,error:pError}=await supa.from("payment_records")
      .select("id,amount,currency,status,booking_id").eq("id",row.payment_record_id)
      .eq("user_id",auth.userId).eq("booking_id",row.booking_id).maybeSingle();
    const {data:booking,error:bError}=await supa.from("bookings")
      .select("status,payment_status").eq("id",row.booking_id).eq("user_id",auth.userId).maybeSingle();
    if(pError||bError||!payment||!booking)return refuse("Payment or booking status could not be verified");
    const output={
      intent_id:row.id,booking_id:row.booking_id,
      payment_record_status:payment.status,booking_status:booking.status,
      payment_status:booking.payment_status,amount_cents:Math.round(Number(payment.amount)*100),
      currency:payment.currency,
      checkout_url:ROOT+"/app/bookings/"+row.booking_id+"?payment=pending",
    };
    if(name==="start_xoot_payment_checkout"){
      if(payment.status!=="pending")return refuse("Payment is not pending; check the verified booking status instead.");
      return toolResult({...output,
        instructions:"Open the Xoot booking page and press Pay securely. Xoot's authenticated form creates a signed PayFast session; the customer enters payment credentials ONLY on the provider checkout. This MCP tool cannot charge a card or post payment fields.",
      });
    }
    return toolResult({...output,
      note:"Only backend-verified payment events confirm payment. A browser return or tool invocation does not prove a successful charge.",
    });
  }
  return refuse("Unknown commerce tool");
}
