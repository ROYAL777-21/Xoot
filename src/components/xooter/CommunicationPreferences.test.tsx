import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {CommunicationPreferences} from './CommunicationPreferences';
const mocks=vi.hoisted(()=>({owner:'one',invoke:vi.fn()}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:mocks.owner},session:{access_token:`synthetic-${mocks.owner}`}})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{functions:{invoke:mocks.invoke}}}));
const defaults={email_updates:true,onboarding_reminders:true,tips:false,promotions:false,revision:0};
const response=(data=defaults)=>({data:{success:true,data},error:null});
beforeEach(()=>{vi.clearAllMocks();mocks.owner='one';mocks.invoke.mockResolvedValue(response());});afterEach(cleanup);
describe('Xooter notification choices',()=>{
  it('loads the actual account choices and keeps optional marketing off',async()=>{
    await act(async()=>{render(<CommunicationPreferences/>);});
    expect(screen.getByRole('switch',{name:/Offers and Xoot news/})).not.toBeChecked();
    expect(screen.getByRole('switch',{name:/Useful tips/})).not.toBeChecked();
    expect(mocks.invoke).toHaveBeenCalledWith('xooter-communications',{headers:{Authorization:'Bearer synthetic-one'},body:{action:'start'}});
  });
  it('only shows saved after a confirmed server response',async()=>{
    await act(async()=>{render(<CommunicationPreferences/>);});
    fireEvent.click(screen.getByRole('switch',{name:/Useful tips/}));
    let finish!:(value:unknown)=>void;mocks.invoke.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
    await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Save choices'}));});
    expect(screen.getByRole('button',{name:'Saving…'})).toBeDisabled();expect(screen.queryByText('Your choices are saved.')).not.toBeInTheDocument();
    expect(mocks.invoke).toHaveBeenLastCalledWith('xooter-communications',expect.objectContaining({body:{action:'save',preferences:{email_updates:true,onboarding_reminders:true,tips:true,promotions:false},revision:0}}));
    await act(async()=>{finish(response({...defaults,tips:true,revision:1}));});expect(screen.getByRole('status')).toHaveTextContent('Your choices are saved.');
  });
  it('does not invent default consent when the load fails',async()=>{
    mocks.invoke.mockResolvedValueOnce({data:null,error:{message:'unavailable'}});await act(async()=>{render(<CommunicationPreferences/>);});
    expect(screen.getByRole('alert')).toHaveTextContent('could not be loaded');expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });
  it('requires reload after a failed save',async()=>{
    await act(async()=>{render(<CommunicationPreferences/>);});mocks.invoke.mockResolvedValueOnce({data:null,error:{message:'stale'}});
    await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Save choices'}));});
    expect(screen.getByRole('alert')).toHaveTextContent('not confirmed');expect(screen.getByRole('button',{name:'Save choices'})).toBeDisabled();
    expect(screen.queryByText('Your choices are saved.')).not.toBeInTheDocument();
  });
  it('discards a former account response after identity changes',async()=>{
    let finish!:(value:unknown)=>void;mocks.invoke.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
    let result!:ReturnType<typeof render>;await act(async()=>{result=render(<CommunicationPreferences/>);});mocks.owner='two';
    await act(async()=>{result.rerender(<CommunicationPreferences/>);});
    await act(async()=>{finish(response({...defaults,tips:true,promotions:true}));});
    expect(screen.getByRole('switch',{name:/Offers and Xoot news/})).not.toBeChecked();expect(screen.getByRole('switch',{name:/Useful tips/})).not.toBeChecked();
  });
});
