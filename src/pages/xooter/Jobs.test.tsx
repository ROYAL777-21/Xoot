import {act,cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import Jobs from './Jobs';
const mocks=vi.hoisted(()=>({user:{id:'owner-a'} as {id:string}|null,invoke:vi.fn(),respond:vi.fn()}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:mocks.user})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{functions:{invoke:(...args:unknown[])=>mocks.invoke(...args)},from:()=>{
  let owner='';const query={select:()=>query,eq:(_key:string,id:string)=>{owner=id;return query;},abortSignal:()=>query,maybeSingle:async()=>({data:{id:`worker-${owner}`},error:null})};return query;
}}}));
vi.mock('@/lib/ops-workflow',()=>({invokeOpsWorkflow:(...args:unknown[])=>mocks.respond(...args)}));
vi.mock('@/components/xoot/SensitiveFieldReveal',()=>({SensitiveFieldReveal:({label,withinWindow}:{label:string;withinWindow:boolean})=><span>{label}: {withinWindow?'available':'locked'}</span>}));
vi.mock('@/components/xooter/JobChecklist',()=>({JobChecklist:()=>null}));
const address='Synthetic public venue, Gauteng';
const job=(changes={})=>({job_id:'synthetic-job-a',booking_id:'synthetic-booking-a',xooter_id:'worker-owner-a',state:'accepted',service:'cleaning',service_type:'regular',scheduled_at:'2030-11-12T08:00:00Z',price:289,duration_hours:4,status:'contractor_accepted',destination_address:address,...changes});
const response=(jobs:unknown[])=>({data:{success:true,data:{jobs}},error:null});
beforeEach(()=>{vi.clearAllMocks();mocks.user={id:'owner-a'};mocks.invoke.mockResolvedValue(response([job()]));mocks.respond.mockResolvedValue({});});
afterEach(()=>{cleanup();vi.useRealTimers();});
describe('advance accepted-job destination',()=>{
  it('reads the real Edge envelope and shows a future address before household codes unlock',async()=>{
    await act(async()=>{render(<Jobs/>);});
    expect(screen.getByRole('region',{name:'Your visit address'})).toHaveTextContent(address);
    expect(screen.getByText('Gate code: locked')).toBeInTheDocument();
    expect(mocks.invoke).toHaveBeenCalledWith('get-xooter-job-cards',expect.objectContaining({body:{}}));
  });
  it('does not show a destination supplied on an unaccepted offer',async()=>{
    mocks.invoke.mockResolvedValue(response([job({state:'offered'})]));await act(async()=>{render(<Jobs/>);});
    expect(screen.getByRole('button',{name:'Accept'})).toBeInTheDocument();expect(screen.queryByText(address)).not.toBeInTheDocument();
    expect(screen.queryByRole('region',{name:'Your visit address'})).not.toBeInTheDocument();
  });
  it('reports lookup failure and can retry, rather than presenting an empty successful job list',async()=>{
    mocks.invoke.mockResolvedValueOnce({data:null,error:{message:'synthetic private diagnostic'}});
    await act(async()=>{render(<Jobs/>);});expect(screen.getByRole('alert')).toHaveTextContent('could not be loaded');
    expect(screen.queryByText('synthetic private diagnostic')).not.toBeInTheDocument();
    await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Try again'}));});expect(screen.getByRole('region',{name:'Your visit address'})).toHaveTextContent(address);
  });
  it('ignores a late response from the previous signed-in account',async()=>{
    let finish!:(value:unknown)=>void;mocks.invoke.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
    let view!:ReturnType<typeof render>;await act(async()=>{view=render(<Jobs/>);});mocks.user={id:'owner-b'};
    mocks.invoke.mockResolvedValue(response([job({xooter_id:'worker-owner-b',job_id:'synthetic-job-b',destination_address:'Synthetic venue B'})]));
    await act(async()=>{view.rerender(<Jobs/>);});await act(async()=>{finish(response([job()]));});
    expect(screen.queryByText(address)).not.toBeInTheDocument();expect(screen.getByRole('region',{name:'Your visit address'})).toHaveTextContent('Synthetic venue B');
  });
  it('refuses a mismatched worker row and clears destinations on sign-out',async()=>{
    mocks.invoke.mockResolvedValueOnce(response([job({xooter_id:'other-worker'})]));let view!:ReturnType<typeof render>;
    await act(async()=>{view=render(<Jobs/>);});expect(screen.getByRole('alert')).toBeInTheDocument();expect(screen.queryByText(address)).not.toBeInTheDocument();
    mocks.user=null;await act(async()=>{view.rerender(<Jobs/>);});expect(screen.queryByText(address)).not.toBeInTheDocument();
  });
  it('refreshes the accepted offer before displaying the authorised destination',async()=>{
    mocks.invoke.mockResolvedValueOnce(response([job({state:'offered',destination_address:null})]));await act(async()=>{render(<Jobs/>);});
    const offer=within(screen.getByRole('button',{name:'Accept'}).closest('div')!);await act(async()=>{fireEvent.click(offer.getByRole('button',{name:'Accept'}));});
    expect(mocks.respond).toHaveBeenCalledWith({action:'xooter_job_response',jobId:'synthetic-job-a',bookingId:'synthetic-booking-a',accept:true});
    expect(screen.getByRole('region',{name:'Your visit address'})).toHaveTextContent(address);
  });
  it.each(['cancelled','completed','rated','replacement_required','reassigned'])('hides the destination when the booking is %s',async status=>{
    mocks.invoke.mockResolvedValue(response([job({status})]));await act(async()=>{render(<Jobs/>);});
    expect(screen.queryByText(address)).not.toBeInTheDocument();
  });
  it('hides explicitly revoked access even when an old accepted job row is returned',async()=>{
    mocks.invoke.mockResolvedValue(response([job({sensitive_data_revoked_at:'2026-11-02T10:00:00Z'})]));await act(async()=>{render(<Jobs/>);});
    expect(screen.queryByText(address)).not.toBeInTheDocument();
  });
  it('aborts a hung request and offers retry rather than loading forever',async()=>{
    vi.useFakeTimers();mocks.invoke.mockImplementation((_name:string,options:{signal:AbortSignal})=>new Promise((_resolve,reject)=>{options.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')));}));
    await act(async()=>{render(<Jobs/>);});await act(async()=>{await vi.advanceTimersByTimeAsync(12_000);});
    expect(screen.getByRole('alert')).toHaveTextContent('could not be loaded');expect(screen.getByRole('button',{name:'Try again'})).toBeInTheDocument();
  });
});
