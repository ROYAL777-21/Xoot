import {act,cleanup,fireEvent,render,screen} from "@testing-library/react";
import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {webcrypto} from "node:crypto";
import CalendarSubscription from "./CalendarSubscription";
const h=vi.hoisted(()=>({invoke:vi.fn(),auth:{user:{id:"owner-a"},loading:false},clipboard:vi.fn()}));
vi.mock("@/contexts/AuthContext",()=>({useAuth:()=>h.auth}));
vi.mock("@/integrations/supabase/client",()=>({supabase:{functions:{invoke:h.invoke}}}));
beforeEach(()=>{
  vi.stubEnv("VITE_CALENDAR_SYNC_ENABLED","true");vi.stubEnv("VITE_SUPABASE_URL","https://example.supabase.co");
  Object.defineProperty(globalThis,"crypto",{value:webcrypto,configurable:true});
  Object.defineProperty(navigator,"clipboard",{value:{writeText:h.clipboard},configurable:true});
  h.auth={user:{id:"owner-a"},loading:false};h.invoke.mockReset();h.clipboard.mockReset();h.clipboard.mockResolvedValue(undefined);
  h.invoke.mockResolvedValue({data:{success:true,data:{active:false,expiresAt:null}},error:null});
});
afterEach(()=>{cleanup();vi.unstubAllEnvs();});
describe("automatic calendar connection",()=>{
  it("creates a private link only on request, sends only its hash and copies after acknowledgement",async()=>{
    render(<CalendarSubscription/>);
    await screen.findByRole("button",{name:"Enable automatic calendar updates"});
    expect(h.invoke).toHaveBeenCalledExactlyOnceWith("calendar-subscription",{body:{action:"status"}});
    h.invoke.mockResolvedValue({data:{success:true,data:{active:true,expiresAt:"2027-10-26T20:00:00Z"}},error:null});
    fireEvent.click(screen.getByRole("button",{name:"Enable automatic calendar updates"}));
    const copy=await screen.findByRole("button",{name:"Copy private calendar link"});
    const hash=h.invoke.mock.calls.find(([,args])=>args.body.action==="enable")![1].body.tokenHash;
    expect(hash).toMatch(/^[0-9a-f]{64}$/);expect(document.body.textContent).not.toContain(hash);
    await act(async()=>{fireEvent.click(copy);});
    const url=h.clipboard.mock.calls[0][0] as string,token=/\/([0-9a-f]{64})\.ics$/.exec(url)![1];
    expect(token).not.toBe(hash);expect(url).toMatch(/^https:\/\/example.supabase.co\/functions\/v1\/calendar-feed\//);
    expect(document.body.innerHTML).not.toContain(token);
    expect(sessionStorage.length).toBe(0);expect(localStorage.length).toBe(0);
    expect(screen.getByText(/calendar chooses when to refresh/)).toBeInTheDocument();
    h.invoke.mockResolvedValue({data:{success:true,data:{active:false,expiresAt:null}},error:null});
    await act(async()=>{fireEvent.click(screen.getByRole("button",{name:"Turn off calendar updates"}));});
    expect(h.invoke).toHaveBeenCalledWith("calendar-subscription",{body:{action:"disable"}});
    expect(screen.queryByRole("button",{name:"Copy private calendar link"})).not.toBeInTheDocument();
  });
  it("does not show a link after a failed write",async()=>{
    render(<CalendarSubscription/>);await screen.findByRole("button",{name:"Enable automatic calendar updates"});
    h.invoke.mockResolvedValueOnce({data:null,error:{message:"Denied"}});
    fireEvent.click(screen.getByRole("button",{name:"Enable automatic calendar updates"}));
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be saved or loaded");
    expect(screen.queryByRole("button",{name:"Copy private calendar link"})).not.toBeInTheDocument();
  });
  it("hides a private link immediately on account switch",async()=>{
    const view=render(<CalendarSubscription/>);await screen.findByRole("button",{name:"Enable automatic calendar updates"});
    h.invoke.mockResolvedValue({data:{success:true,data:{active:true,expiresAt:"2027-10-26T20:00:00Z"}},error:null});
    fireEvent.click(screen.getByRole("button",{name:"Enable automatic calendar updates"}));
    await screen.findByRole("button",{name:"Copy private calendar link"});
    h.auth={user:{id:"owner-b"},loading:false};view.rerender(<CalendarSubscription/>);
    expect(screen.queryByRole("button",{name:"Copy private calendar link"})).not.toBeInTheDocument();
  });
});
