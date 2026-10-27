import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import Kyc from './Kyc';
const mocks=vi.hoisted(()=>({user:{id:'owner-a'},load:vi.fn(),docs:vi.fn(),select:vi.fn(),eq:vi.fn()}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:mocks.user})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:(table:string)=>{
  const query={select:(fields:string)=>{mocks.select(table,fields);return query;},eq:(field:string,id:string)=>{mocks.eq(table,field,id);return query;},maybeSingle:()=>mocks.load(),then:(yes:(r:unknown)=>unknown)=>mocks.docs().then(yes)};return query;
}}}));
const view=()=> <MemoryRouter><Kyc/></MemoryRouter>;
beforeEach(()=>{vi.clearAllMocks();mocks.user={id:'owner-a'};mocks.load.mockResolvedValue({data:{status:'submitted'},error:null});mocks.docs.mockResolvedValue({data:[],error:null});});
afterEach(cleanup);
describe('private Xooter review state',()=>{
  it('reports a read error rather than claiming the saved application is incomplete',async()=>{
    mocks.load.mockResolvedValueOnce({data:null,error:{message:'synthetic failure'}});await act(async()=>{render(view());});
    expect(screen.getByRole('alert')).toHaveTextContent('could not be loaded');expect(screen.queryByText('Application incomplete')).not.toBeInTheDocument();
    await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Try again'}));});expect(screen.getByText('Under review')).toBeInTheDocument();
  });
  it('does not reveal the old account review after an account change',async()=>{
    let done!:(r:unknown)=>void;mocks.load.mockImplementationOnce(()=>new Promise(resolve=>{done=resolve;}));let result!:ReturnType<typeof render>;
    await act(async()=>{result=render(view());});mocks.user={id:'owner-b'};mocks.load.mockResolvedValue({data:{status:'submitted'},error:null});
    await act(async()=>{result.rerender(view());});await act(async()=>{done({data:{status:'rejected',reviewer_notes:'Synthetic owner A private note'},error:null});});
    expect(screen.queryByText('Synthetic owner A private note')).not.toBeInTheDocument();expect(screen.getByText('Under review')).toBeInTheDocument();
  });
  it('fetches only the displayed owner review and document metadata',async()=>{
    await act(async()=>{render(view());});expect(mocks.select).toHaveBeenCalledWith('xooter_applications','status, reviewer_notes');expect(mocks.select).toHaveBeenCalledWith('xooter_documents','id, doc_type, status, created_at');
    expect(mocks.eq).toHaveBeenCalledWith('xooter_applications','user_id','owner-a');expect(mocks.eq).toHaveBeenCalledWith('xooter_documents','user_id','owner-a');
  });
});
