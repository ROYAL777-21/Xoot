import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, Ellipsis, MapPin, MessageCircle, Pencil, Phone, Repeat, Share2, ShieldCheck, Star, User, X } from "lucide-react";
import { Dialog, DialogClose, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { DockedCTA } from "@/components/kit/DockedCTA";
import { BookingChat } from "@/components/xoot/BookingChat";
import { VoiceCallPanel } from "@/components/xoot/VoiceCallPanel";
import { SosButton } from "@/components/xoot/SosButton";
import { canAccessSensitiveBookingData } from "@/lib/operations";
import { normaliseBookingStatus } from "@/lib/booking-state-machine";
import { createNativeBookingActionPayload, sendNativeBookingAction } from "@/lib/native-booking-actions";
import { supabase } from "@/integrations/supabase/client";
import type { VisitResource } from "@/pages/app/BookingDetail";
import { reviewEligible, scheduledLabel, visitService, type VisitData } from "./visit-data";
import { VisitOptions } from "./VisitOptions";
import { VisitCard } from "./VisitPrimitives";
import { visitNativeInput } from "./visit-native";
import { shareVisit } from "./share-visit";
import "@/styles/tracking-chat-handoff.css";

type Props = { id: string; owner: string; resource: VisitResource; chat?: boolean };
export function soloChat(data: VisitData) {
  return data.booking.crew_size === 1 && data.jobs.every(job => job.xooter_id === data.booking.xooter_id);
}
function trackingTitle(data: VisitData) {
  const { booking, xooter } = data, name = xooter?.name?.split(" ")[0] || "Your Xooter";
  const status = normaliseBookingStatus(booking.status);
  const titles = { draft: "Setting up your visit", pending_payment: "Payment required", payment_confirmed: "Payment recorded", awaiting_assignment: "Finding your Xooter", assigned: `${name} is your Xooter`, contractor_accepted: `${name} confirmed`, en_route: `${name} is on the way`, in_progress: booking.arrived_at && !booking.job_started_at ? `${name} has arrived` : "Visit in progress", completed: "All done", rated: "Thanks for rating", cancelled: "Visit cancelled", replacement_required: "Replacement needed", replacement_offered: "Replacement offered", reassigned: "New Xooter assigned" };
  return status ? titles[status] : "Status unavailable";
}
function Sheet({ open, onOpenChange, title, description, children }: { open: boolean; onOpenChange: (value: boolean) => void; title: string; description: string; children: React.ReactNode }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogPortal><DialogOverlay className="xoot-tracking-overlay" /><DialogPrimitive.Content className="xoot-tracking-sheet"><DialogTitle className="sr-only">{title}</DialogTitle><DialogDescription className="sr-only">{description}</DialogDescription>{children}<DialogClose className="xoot-tracking-sheet-close">Close</DialogClose></DialogPrimitive.Content></DialogPortal></Dialog>;
}
export function VisitCall({ id, owner, data, resource }: Omit<Props,"chat"> & { data: VisitData }) {
  const [maskedPhone, setMaskedPhone] = useState<string | null>(null);
  const status = normaliseBookingStatus(data.booking.status), solo = soloChat(data), isOwner = data.booking.user_id === owner;
  const calling = Boolean(status && ["en_route", "in_progress"].includes(status)) && canAccessSensitiveBookingData({ scheduledAt: data.booking.scheduled_at, status: data.booking.status, completedAt: data.booking.job_completed_at, cancelledAt: data.booking.cancelled_at, durationHours: data.booking.duration_hours });
  return <VisitCard><p>{calling ? "The call service verifies availability before connecting." : "Calling is unavailable outside the active booking window."}</p>{calling && solo && <><VoiceCallPanel bookingId={id} available={calling} isCurrent={resource.isCurrent} invoke={resource.invoke} /><button className="xoot-detail-button is-outline" type="button" disabled={resource.busy} onClick={() => void resource.act(async () => {
    const response = await resource.invoke<{ data?: { call_session_id?: string; status?: string; proxy_numbers?: { client?: string | null; xooter?: string | null } | null } }>("create-masked-call", { booking_id: id });
    const call = response.data, phone = isOwner ? call?.proxy_numbers?.client : call?.proxy_numbers?.xooter;
    if (call?.status !== "active" || !phone || !/^\+?[0-9]{7,15}$/.test(phone)) return "Masked calling is unavailable. Please use booking messages or support.";
    setMaskedPhone(phone);
    if (call.call_session_id) sendNativeBookingAction(createNativeBookingActionPayload("masked_call", { ...visitNativeInput(data), callSessionId: call.call_session_id }));
    return "Masked call is ready. Use the phone link to connect.";
  })}>Request a masked phone call</button>{maskedPhone && <a className="xoot-detail-button is-outline" href={`tel:${maskedPhone}`}>Call using the masked number</a>}</>}{!solo && <p>Crew calling is not available yet. Contact support about your visit.</p>}</VisitCard>;
}

export function TrackingVisit({ id, owner, resource, chat = false }: Props) {
  const data = resource.data!;
  const { booking, xooter } = data;
  const [expanded, setExpanded] = useState(false);
  const [menu, setMenu] = useState(false);
  const [share, setShare] = useState(false);
  const [call, setCall] = useState(false);
  const [panel, setPanel] = useState<"more" | "reschedule" | "cancel" | null>(null);
  const status = normaliseBookingStatus(booking.status), solo = soloChat(data), isOwner = booking.user_id === owner;
  const worker = solo && xooter?.user_id === owner && xooter.id === booking.xooter_id;
  const support = `/app/support?booking=${encodeURIComponent(id)}`, visit = `/app/bookings/${encodeURIComponent(id)}`;
  const profile = <div className="xoot-tracking-profile"><span className="xoot-detail-avatar"><span className="xoot-detail-avatar-face">{xooter?.photo_url ? <img src={xooter.photo_url} alt="" /> : xooter?.name?.split(/\s+/).filter(Boolean).slice(0,2).map(word => word[0]).join("").toUpperCase() || <User size={26} />}</span>{xooter?.verified && <i aria-label="Verified"><Check size={12} strokeWidth={3} /></i>}</span><div><h2>{xooter?.name || "No assigned Xooter profile"}</h2>{xooter?.rating != null && <p className="xoot-tracking-rating">{[1,2,3,4,5].map(star => <Star key={star} size={13} fill={xooter.rating! >= star - .25 ? "var(--xoot-honey-500)" : "none"} color={xooter.rating! >= star - .25 ? "var(--xoot-honey-500)" : "var(--xoot-neutral-300)"} />)}<strong>{xooter.rating.toFixed(2)}</strong> recorded rating</p>}{xooter?.jobs_completed != null && <small>{xooter.jobs_completed} recorded visits</small>}</div></div>;
  const options = panel && <VisitOptions id={id} owner={owner} data={data} resource={resource} panel={panel} assignedWorker={Boolean(worker)} support={support} />;
  return <div className={`xoot-detail xoot-tracking ${chat ? "is-chat" : ""}`}>
    {chat ? <>
      <header className="xoot-chat-header"><Link className="xoot-detail-icon" aria-label="Back to tracking" to={`${visit}/tracking`}><ArrowLeft size={20} /></Link><div><h1>{solo ? xooter?.name || "Booking chat" : "Crew chat"}</h1><p>{solo ? "Private booking messages" : "Participant routing is unavailable"}</p></div><button className="xoot-detail-icon is-surface" type="button" aria-label="Call your Xooter" onClick={() => setCall(true)}><Phone size={20} /></button></header>
      {solo ? <BookingChat bookingId={id} booking={booking} xooter={xooter} messages={data.messages} hasMore={data.more?.messages} currentUserId={owner} screen isCurrent={resource.isCurrent} invoke={resource.invoke} /> : <VisitCard><p>Crew chat is not available yet. Contact support about your visit.</p><Link to={support}>Message the team</Link></VisitCard>}
    </> : <>
      <div className="xoot-tracking-map-region"><div className="xoot-tracking-map" aria-label="Live tracking unavailable">
        <svg aria-hidden="true" viewBox="0 0 320 300" preserveAspectRatio="xMidYMid slice"><rect width="320" height="300" fill="var(--xoot-neutral-50)" />{[40,92,148,206,262].map(y => <rect key={y} y={y} width="320" height="9" fill="var(--xoot-neutral-100)" />)}{[52,128,204,272].map(x => <rect key={x} x={x} width="9" height="300" fill="var(--xoot-neutral-100)" />)}<rect x="146" y="34" width="70" height="66" rx="4" fill="var(--xoot-sage-wash)" /><rect x="16" y="150" width="52" height="48" rx="4" fill="var(--xoot-moss-wash)" /></svg>
        <p className="xoot-tracking-map-state">Live location and arrival estimates are unavailable.</p>
      </div><Link className="xoot-detail-icon is-surface xoot-tracking-back" aria-label="Back to visit" to={visit}><ArrowLeft size={20} /></Link><button className="xoot-detail-icon is-surface xoot-tracking-more" type="button" aria-label="More tracking options" onClick={() => setMenu(true)}><Ellipsis size={20} /></button><button className="xoot-detail-icon is-surface xoot-tracking-recentre" type="button" aria-label="Recentre unavailable" disabled title="A live map provider is unavailable"><MapPin size={17} /></button></div>
      <div className="xoot-tracking-content"><div className="xoot-tracking-intro"><h1>{trackingTitle(data)}</h1><p>Scheduled {scheduledLabel(booking.scheduled_at)}. Updates reflect recorded visit events.</p></div>
        <div className={`xoot-tracking-stack ${expanded ? "is-expanded" : ""}`}><button type="button" className="xoot-tracking-identity" onClick={() => setExpanded(value => !value)} aria-expanded={expanded} aria-controls="tracking-stack-details"><span className={`xoot-tracking-status is-${status}`}><span>{status === "en_route" ? "ON THE WAY" : (status || "unavailable").replace(/_/g," ").toUpperCase()}</span><span className="xoot-tracking-handle" aria-hidden="true" /></span>{profile}</button>
          {!expanded && <span className="xoot-tracking-peek" aria-hidden="true" />}
          <div className="xoot-tracking-actions"><Link to={`${visit}/chat`}><MessageCircle size={19} />Chat</Link><button type="button" onClick={() => setCall(true)}><Phone size={19} />Call</button><button type="button" onClick={() => setShare(true)}><Share2 size={19} />Share update</button></div>
          {!solo && <p className="xoot-detail-caption">{booking.crew_size} Xooters requested. This profile is one assigned member; the full crew roster is unavailable here.</p>}
          <div id="tracking-stack-details" hidden={!expanded}><RecordedTasks id={id} data={data} resource={resource} />
          </div>
        </div>
        <details className="xoot-tracking-events"><summary>Recorded visit updates</summary><RecordedEvents id={id} data={data} resource={resource} /></details>
        {status === "in_progress" && <><SosButton bookingId={id} /><Link to={`${support}&kind=urgent`}>Get help with this visit</Link></>}
        {options}
        <Link to={visit}>Visit details, payment and completion proof</Link>
      </div>
      <DockedCTA>{reviewEligible(booking,owner,data.review) && solo || isOwner && data.review ? <Link className="xoot-detail-button is-primary is-large" to={`${visit}/rate`}>{data.review ? "View recorded rating" : "Rate this visit"}<Star size={18} /></Link> : status === "cancelled" ? <Link className="xoot-detail-button is-primary is-large" to={`/app/book?service=${encodeURIComponent(visitService(booking))}`}><Repeat size={18} />Book another time</Link> : <Link className="xoot-detail-button is-outline is-large" to={`${visit}/chat`}><MessageCircle size={18} />{solo ? `Message ${xooter?.name?.split(" ")[0] || "your Xooter"}` : "Crew chat availability"}</Link>}</DockedCTA>
    </>}
    <Sheet open={menu} onOpenChange={setMenu} title="More tracking options" description="Visit changes are reviewed by support."><div className="xoot-tracking-menu-group"><button type="button" onClick={() => { setPanel("reschedule"); setMenu(false); }} disabled={!isOwner}>Reschedule this visit<Repeat size={19} /></button><button type="button" disabled>Edit access notes · unavailable<Pencil size={19} /></button><Link to="/app/insurance">About Booking Cover<ShieldCheck size={19} /></Link><Link to={support}>Get help with this visit<MessageCircle size={19} /></Link><button type="button" onClick={() => { setPanel("more"); setMenu(false); }}>Visit proof and service concern<Check size={19} /></button></div><div className="xoot-tracking-menu-group"><button className="is-danger" type="button" onClick={() => { setPanel("cancel"); setMenu(false); }} disabled={!isOwner}>Cancel visit<X size={19} /></button></div></Sheet>
    <Sheet open={share} onOpenChange={setShare} title="Share visit update" description="This private booking link requires participant access."><div className="xoot-tracking-share"><h2>Share visit update</h2><p>{trackingTitle(data)}</p><p>This private visit link requires participant access. It does not include an address or access notes.</p><div><button type="button" disabled={resource.busy} onClick={() => void resource.act(() => shareVisit(data,resource))}><Share2 size={24} />Share options</button><button type="button" disabled={resource.busy} onClick={() => void resource.act(() => shareVisit(data,resource,true))}><LinkIcon />Copy link</button></div>{resource.actionMessage && <p role="status">{resource.actionMessage}</p>}</div></Sheet>
    <Sheet open={call} onOpenChange={setCall} title="Call your Xooter" description="Provider and booking eligibility are verified before connecting."><VisitCall id={id} owner={owner} data={data} resource={resource} />{resource.actionMessage && <p role="status">{resource.actionMessage}</p>}</Sheet>
    {!share && !call && resource.actionMessage && <p className="xoot-detail-feedback" role="status">{resource.actionMessage}</p>}
  </div>;
}
function LinkIcon() { return <Share2 size={24} />; }

function RecordedTasks({ id, data, resource }: { id: string; data: VisitData; resource: VisitResource }) {
  const [extra,setExtra] = useState<VisitData["tasks"]>([]), [moreState,setMore] = useState<boolean | null>(null), [busy,setBusy] = useState(false), [error,setError] = useState(false);
  const more = moreState ?? Boolean(data.more?.tasks);
  const life = useRef({ mounted:false, version:0, offset:160, loading:false });
  useEffect(() => { const scope=life.current; scope.mounted=true; return () => { scope.mounted=false; scope.version++; scope.loading=false; }; },[]);
  const rows=[...new Map([...extra,...data.tasks].map(row=>[row.id,row])).values()].sort((a,b)=>a.position-b.position || a.id.localeCompare(b.id));
  const load=async()=>{
    const version=life.current.version; if(life.current.loading) return; life.current.loading=true;setBusy(true);setError(false);
    try { const result=await supabase.from("xooter_job_checklist").select("id,job_id,label,completed_at,position").eq("booking_id",id).order("position").order("id").range(life.current.offset,life.current.offset+160);
      if(!life.current.mounted||life.current.version!==version||!resource.isCurrent())return;
      if(result.error)throw result.error;
      const page=result.data??[];setExtra(old=>[...old,...page.slice(0,160).filter(row=>data.jobs.some(job=>job.id===row.job_id))]);setMore(page.length>160);life.current.offset+=160;
    }catch{if(life.current.mounted&&life.current.version===version&&resource.isCurrent())setError(true);}
    finally{if(life.current.mounted&&life.current.version===version){life.current.loading=false;setBusy(false);}}
  };
  return <div className="xoot-tracking-checklist"><h3>Visit checklist</h3>{rows.length ? rows.map(task=><div className="xoot-detail-task" key={task.id}><span className={task.completed_at?"is-done":""} aria-label={task.completed_at?"Completed":"Not completed"}>{task.completed_at&&<Check size={12}/>}</span><span className={task.completed_at?"is-done":""}>{task.label}</span></div>):<p>No recorded checklist tasks are available yet.</p>}{error&&<p role="alert">Checklist could not be loaded. Please try again.</p>}{more&&<button type="button" disabled={busy} onClick={()=>void load()}>{busy?"Loading…":"Load more checklist tasks"}</button>}</div>;
}
function RecordedEvents({ id,data,resource }: {id:string;data:VisitData;resource:VisitResource}) {
  const [extra,setExtra]=useState<VisitData["events"]>([]),[moreState,setMore]=useState<boolean | null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(false);
  const more = moreState ?? Boolean(data.more?.events);
  const life=useRef({mounted:false,version:0,loading:false});useEffect(()=>{const scope=life.current;scope.mounted=true;return()=>{scope.mounted=false;scope.version++;scope.loading=false;};},[]);
  const rows=[...new Map([...extra,...data.events].map(row=>[row.id,row])).values()].sort((a,b)=>b.created_at.localeCompare(a.created_at)||b.id.localeCompare(a.id));
  const load=async()=>{const last=rows.at(-1),version=life.current.version;if(!last||life.current.loading)return;life.current.loading=true;setBusy(true);setError(false);
    try{if(!/^[\w-]+$/.test(last.id)||!/^[\dT:.+Z-]+$/.test(last.created_at))throw new Error("Invalid event cursor");const result=await supabase.from("booking_status_events").select("id,status,label,created_at").eq("booking_id",id).or(`created_at.lt.${last.created_at},and(created_at.eq.${last.created_at},id.lt.${last.id})`).order("created_at",{ascending:false}).order("id",{ascending:false}).limit(101);
      if(!life.current.mounted||life.current.version!==version||!resource.isCurrent())return;if(result.error)throw result.error;setExtra(old=>[...old,...(result.data??[]).slice(0,100)]);setMore((result.data?.length??0)>100);
    }catch{if(life.current.mounted&&life.current.version===version&&resource.isCurrent())setError(true);}finally{if(life.current.mounted&&life.current.version===version){life.current.loading=false;setBusy(false);}}};
  return <><ul>{rows.map(row=><li key={row.id}>{row.label} · {scheduledLabel(row.created_at)}</li>)}</ul>{!rows.length&&<p>No status events have been recorded.</p>}{error&&<p role="alert">Updates could not be loaded. Please try again.</p>}{more&&<button type="button" disabled={busy} onClick={()=>void load()}>{busy?"Loading…":"Load older updates"}</button>}</>;
}
