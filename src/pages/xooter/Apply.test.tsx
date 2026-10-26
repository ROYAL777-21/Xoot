import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import Apply from './Apply';
const mocks=vi.hoisted(()=>({user:{id:'owner-a',email:'owner-a@example.test',user_metadata:{}},load:vi.fn(),invoke:vi.fn(),navigate:vi.fn(),error:vi.fn()}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:mocks.user,session:{user:mocks.user,access_token:'synthetic-session-'+mocks.user.id},loading:false})}));
vi.mock('react-router-dom',async original=>({...await original<typeof import('react-router-dom')>(),useNavigate:()=>mocks.navigate}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:()=>{
  const query={select:()=>query,eq:()=>query,maybeSingle:()=>mocks.load(),then:(yes:(r:{data:never[];error:null})=>unknown)=>Promise.resolve({data:[],error:null}).then(yes)};return query;
},functions:{invoke:mocks.invoke}}}));
vi.mock('@/lib/haptics',()=>({haptic:vi.fn()}));
vi.mock('@/lib/rate-limit',()=>({checkRateLimit:()=>true}));
vi.mock('@/lib/mobile-upload',()=>({captureOrSelectImage:vi.fn()}));
vi.mock('sonner',()=>({toast:{error:mocks.error,success:vi.fn()}}));
const application={id:'application-a',status:'draft',full_name:'Synthetic Applicant',phone:'0821234567',email:'owner-a@example.test',date_of_birth:'1990-01-01',id_number:'synthetic-id',bio:'Synthetic experience',years_experience:2};
const view=()=> <MemoryRouter><Apply/></MemoryRouter>;
const start=async()=>{await act(async()=>{render(view());});};
beforeEach(()=>{vi.clearAllMocks();mocks.user={id:'owner-a',email:'owner-a@example.test',user_metadata:{}};mocks.load.mockResolvedValue({data:application,error:null});mocks.invoke.mockResolvedValue({data:{success:true,data:{application_id:'application-a'}},error:null});});
afterEach(cleanup);
describe('Xooter handoff and persistent application',()=>{
  it('stays on the current step when the server rejects saving',async()=>{
    mocks.invoke.mockResolvedValue({data:{success:false,error:'Application save failed'},error:null});await start();
    await act(async()=>{fireEvent.click(screen.getByRole('button',{name:/Save & continue/}));});
    expect(mocks.invoke).toHaveBeenCalled();expect(screen.queryByPlaceholderText('Sandton, Midrand...')).not.toBeInTheDocument();expect(mocks.error).toHaveBeenCalled();
  });
  it('returns a submitted applicant to review rather than the role-protected worker dashboard',async()=>{
    mocks.load.mockResolvedValue({data:{...application,status:'submitted'},error:null});await start();expect(mocks.navigate).toHaveBeenCalledWith('/xooter/kyc');
  });
  it('uses the handoff stages and properly labelled account fields',async()=>{
    await start();expect(screen.getByRole('heading',{name:'Work with Xoot'})).toBeInTheDocument();
    for(const stage of ['You','Where','What','Checks'])expect(screen.getByText(stage,{exact:true})).toBeInTheDocument();
    expect(screen.getByLabelText('Your full name')).toHaveValue(application.full_name);expect(screen.getByLabelText('Mobile number')).toHaveAttribute('inputmode','tel');
  });
  it('shows a failed load and retries instead of silently starting an empty application',async()=>{
    mocks.load.mockResolvedValueOnce({data:null,error:{message:'synthetic network failure'}}).mockResolvedValueOnce({data:application,error:null});await start();
    expect(screen.getByRole('alert')).toHaveTextContent('could not be loaded');
    await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Try again'}));});expect(screen.getByLabelText('Your full name')).toHaveValue(application.full_name);
  });
  it('waits for an actual saved application and binds the write to this owner session',async()=>{
    let done!:(value:unknown)=>void;mocks.invoke.mockImplementation(()=>new Promise(resolve=>{done=resolve;}));await start();
    await act(async()=>{fireEvent.click(screen.getByRole('button',{name:/Save & continue/}));});
    expect(screen.getByRole('button',{name:/Saving/})).toBeDisabled();expect(screen.queryByPlaceholderText('Sandton, Midrand...')).not.toBeInTheDocument();
    expect(mocks.invoke).toHaveBeenCalledWith('submit-xooter-application',expect.objectContaining({headers:{Authorization:'Bearer synthetic-session-owner-a'},body:expect.objectContaining({application:expect.objectContaining({full_name:application.full_name,email:application.email})})}));
    await act(async()=>{done({data:{success:true,data:{application_id:'application-a'}},error:null});});expect(screen.getByPlaceholderText('Sandton, Midrand...')).toBeInTheDocument();expect(screen.getByRole('status')).toHaveTextContent('Your latest step is saved.');
  });
  it('does not carry a previous account draft into a newly signed-in account',async()=>{
    let done!:(value:unknown)=>void;mocks.load.mockImplementationOnce(()=>new Promise(resolve=>{done=resolve;})).mockResolvedValueOnce({data:null,error:null});
    let result!:ReturnType<typeof render>;await act(async()=>{result=render(view());});mocks.user={id:'owner-b',email:'owner-b@example.test',user_metadata:{}};
    await act(async()=>{result.rerender(view());});await act(async()=>{done({data:application,error:null});});
    expect(screen.queryByDisplayValue(application.full_name)).not.toBeInTheDocument();expect(screen.getByLabelText('Email')).toHaveValue('owner-b@example.test');
  });
});
