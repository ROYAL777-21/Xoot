import { describe, expect, it } from 'vitest';
import { edgeHandler } from '../test/edge-handler';

const customer='11111111-1111-4111-8111-111111111111';
const worker='22222222-2222-4222-8222-222222222222';
const xooter='33333333-3333-4333-8333-333333333333';
const bookingId='44444444-4444-4444-8444-444444444444';

function fixture({actor=worker,status='contractor_accepted',race='',writeError=false,accepted=true,jobError=false,overrides={}}={}) {
  const live:Record<string,unknown>={id:bookingId,user_id:customer,xooter_id:xooter,status,
    payment_status:'paid',payment_confirmed_at:'2026-10-28T10:00:00Z',job_started_at:null,job_completed_at:null,
    completed_at:null,sensitive_data_revoked_at:null,cancelled_at:null,scheduled_at:'2026-11-02T07:00:00Z',
    service:'cleaning',service_type:'residential',...overrides};
  const effects:string[]=[];const filtersSeen:unknown[]=[];
  const client={auth:{getUser:async()=>({data:{user:{id:actor}},error:null})},
    from:(table:string)=>{
      let payload:Record<string,unknown>|undefined;
      const filters:Array<[string,unknown]>=[];
      const finish=async()=>{
        if(table==='bookings') {
          if(!payload)return{data:{...live},error:null};
          filtersSeen.push([...filters]);
          if(writeError)return{data:null,error:{message:'synthetic write failure'}};
          if(!filters.every(([key,value])=>live[key]===value))return{data:null,error:null};
          Object.assign(live,payload);effects.push('booking_update');return{data:{id:bookingId},error:null};
        }
        if(table==='xooters') {
          if(race==='cancel'){live.status='cancelled';live.cancelled_at='2026-10-29T10:00:00Z';}
          if(race==='reassign')live.xooter_id='55555555-5555-4555-8555-555555555555';
          return{data:{id:xooter,user_id:worker},error:null};
        }
        if(payload)effects.push(table);
        if(table==='xooter_jobs')return{data:accepted?{id:'accepted-job'}:null,error:jobError?{message:'synthetic eligibility failure'}:null};
        return{data:null,error:null};
      };
      const q={select:()=>q,eq:(key:string,value:unknown)=>{filters.push([key,value]);return q;},
        is:(key:string,value:unknown)=>{filters.push([key,value]);return q;},
        update:(value:Record<string,unknown>)=>{payload=value;return q;},
        insert:async()=>{effects.push(table);return{data:null,error:null};},
        maybeSingle:finish,then:(resolve:(value:unknown)=>unknown,reject:(reason:unknown)=>unknown)=>finish().then(resolve,reject)};
      return q;
    }};
  const handler=edgeHandler('supabase/functions/ops-workflow/index.ts',()=>client,{
    SUPABASE_URL:'https://synthetic.test',SUPABASE_ANON_KEY:'public-fixture',SUPABASE_SERVICE_ROLE_KEY:'private-fixture'});
  const request=(next:string)=>handler(new Request('https://synthetic.test/ops',{method:'POST',
    headers:{Authorization:'Bearer normal-synthetic-fixture','Content-Type':'application/json'},
    body:JSON.stringify({action:'booking_status_changed',bookingId,status:next})}));
  return{request,effects,live,filtersSeen};
}

describe('actual generic status handler preserves typed money/cancellation authority',()=>{
  it.each(['payment_confirmed','cancelled'])('refuses customer %s without mutations',async next=>{
    const f=fixture({actor:customer,status:'pending_payment'});
    expect((await f.request(next)).status).toBe(403);
    expect(f.effects).toEqual([]);expect(f.live.status).toBe('pending_payment');
  });
  it.each(['payment_confirmed','cancelled','rated','assigned'])('refuses contractor-forged %s',async next=>{
    const predecessor={payment_confirmed:'pending_payment',cancelled:'contractor_accepted',rated:'completed',assigned:'awaiting_assignment'};
    const f=fixture({status:predecessor[next as keyof typeof predecessor]});
    expect((await f.request(next)).status).toBe(400);expect(f.effects).toEqual([]);
  });
  it.each(['cancel','reassign'])('does not overwrite concurrent %s or emit success effects',async race=>{
    const f=fixture({race});expect((await f.request('en_route')).status).toBe(409);expect(f.effects).toEqual([]);
  });
  it('reports write failure before events, notifications or rewards',async()=>{
    const f=fixture({writeError:true});expect((await f.request('en_route')).status).toBe(503);expect(f.effects).toEqual([]);
  });
  it.each(['contractor_accepted','confirmed'])('retains eligible worker progress and compares raw %s',async status=>{
    const f=fixture({status});expect((await f.request('en_route')).status).toBe(200);
    expect(f.live.status).toBe('en_route');
    expect(f.filtersSeen).toEqual([[['id',bookingId],['status',status],['xooter_id',xooter],
      ['payment_status','paid'],['payment_confirmed_at','2026-10-28T10:00:00Z'],['cancelled_at',null],
      ['sensitive_data_revoked_at',null],['job_completed_at',null],['completed_at',null]]]);
    expect(f.effects.filter(e=>e==='booking_update')).toHaveLength(1);
    expect(f.effects).toContain('booking_status_events');
  });
  it('refuses progress without an accepted job',async()=>{
    const f=fixture({accepted:false});expect((await f.request('en_route')).status).toBe(409);expect(f.effects).toEqual([]);
  });
  it('fails closed when accepted-job eligibility is unavailable',async()=>{
    const f=fixture({jobError:true});expect((await f.request('en_route')).status).toBe(503);expect(f.effects).toEqual([]);
  });
  it.each([
    {payment_status:'pending'}, {payment_confirmed_at:null}, {sensitive_data_revoked_at:'2026-10-29T10:00:00Z'},
    {job_completed_at:'2026-10-29T10:00:00Z'}, {completed_at:'2026-10-29T10:00:00Z'},
  ])('refuses inactive or unpaid work: %j',async overrides=>{
    const f=fixture({overrides});expect((await f.request('en_route')).status).toBe(409);expect(f.effects).toEqual([]);
  });
  it('does not move an already recorded start time',async()=>{
    const f=fixture({status:'in_progress',overrides:{job_started_at:'2026-10-29T10:00:00Z'}});
    expect((await f.request('in_progress')).status).toBe(409);expect(f.effects).toEqual([]);
  });
  it('records the first post-arrival start once with a null timestamp guard',async()=>{
    const f=fixture({status:'in_progress'});expect((await f.request('in_progress')).status).toBe(200);
    expect(f.filtersSeen[0]).toContainEqual(['job_started_at',null]);
    expect((await f.request('in_progress')).status).toBe(409);
    expect(f.effects.filter(e=>e==='booking_update')).toHaveLength(1);
  });
});
