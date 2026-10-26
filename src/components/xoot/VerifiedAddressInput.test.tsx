import {act,cleanup,fireEvent,render,screen} from "@testing-library/react";
import {useState} from "react";
import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
const mocks=vi.hoisted(()=>{vi.stubEnv("VITE_MAPBOX_ADDRESS_SUGGESTIONS_ENABLED","true");return{invoke:vi.fn()};});
vi.mock("@/integrations/supabase/client",()=>({supabase:{functions:{invoke:mocks.invoke}}}));
import {ADDRESS_SUGGESTION_DELAY_MS,VerifiedAddressInput} from "./VerifiedAddressInput";
const found="14 Synthetic Test Road, Mamelodi, Pretoria, South Africa";
const option={id:"synthetic-address-id",label:found,featureType:"address"};
const response=(options:unknown[]=[option])=>({data:{success:true,data:{state:"results",options}},error:null});
function mount(initial="") {
  function Form(){const [value,setValue]=useState(initial);return <><VerifiedAddressInput value={value} onChange={setValue}/><output aria-label="Booking address">{value}</output></>;}
  render(<Form/>);return screen.getByRole("combobox",{name:"Service address"});
}
const tick=async(ms=ADDRESS_SUGGESTION_DELAY_MS)=>act(async()=>{await vi.advanceTimersByTimeAsync(ms);});
beforeEach(()=>{vi.useFakeTimers();mocks.invoke.mockReset();mocks.invoke.mockResolvedValue(response());});
afterEach(()=>{cleanup();vi.useRealTimers();});

describe("address typeahead (synthetic provider contracts, no live Mapbox calls)",()=>{
  it("does not issue duplicate requests while Enter is pressed during a lookup",async()=>{
    let finish!:(value:unknown)=>void;mocks.invoke.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
    const input=mount();fireEvent.change(input,{target:{value:"14 Test Road"}});await tick();
    fireEvent.keyDown(input,{key:"Enter"});fireEvent.keyDown(input,{key:"Enter"});
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
    await act(async()=>finish(response()));
    expect(screen.getByRole("option",{name:found})).toBeInTheDocument();
  });
  it("discards in-flight suggestions when a saved place replaces the input",async()=>{
    let finish!:(value:unknown)=>void;mocks.invoke.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
    function Form(){const[value,setValue]=useState("");return <><VerifiedAddressInput value={value} onChange={setValue}/><button onClick={()=>setValue("42 Saved Street, Pretoria")}>Use saved home</button></>;}
    render(<Form/>);fireEvent.change(screen.getByRole("combobox"),{target:{value:"14 Test Road"}});await tick();
    fireEvent.click(screen.getByRole("button",{name:"Use saved home"}));await act(async()=>finish(response()));await tick();
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveValue("42 Saved Street, Pretoria");expect(mocks.invoke).toHaveBeenCalledTimes(1);
  });
  it("loads selectable suggestions after typing pauses, without a search-button tap or lost focus",async()=>{
    const input=mount();input.focus();fireEvent.change(input,{target:{value:"14 Test"}});
    await tick(300);fireEvent.change(input,{target:{value:"14 Test Road"}});
    await tick(ADDRESS_SUGGESTION_DELAY_MS-1);expect(mocks.invoke).not.toHaveBeenCalled();
    await tick(1);expect(screen.getByRole("option",{name:found})).toBeInTheDocument();expect(input).toHaveFocus();
    expect(mocks.invoke).toHaveBeenCalledTimes(1);expect(mocks.invoke).toHaveBeenCalledWith("search-addresses",expect.objectContaining({body:{mode:"suggest",query:"14 Test Road",selectedId:undefined}}));
    expect(screen.queryByRole("button",{name:"Find address"})).not.toBeInTheDocument();
  });
  it("shows valid suggestions outside the former launch-suburb list",async()=>{
    const input=mount();fireEvent.change(input,{target:{value:"14 Test, Mamelodi"}});await tick();
    expect(screen.getByRole("option",{name:found})).toBeInTheDocument();
    expect(screen.getByLabelText("Booking address")).toHaveTextContent("14 Test, Mamelodi");
  });
  it("never spends on short input or merely loading a saved address",async()=>{
    mount(found);await tick(2000);expect(mocks.invoke).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole("combobox"),{target:{value:"14 Te"}});await tick();expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it("saves selected text only after the capped permanent confirmation succeeds",async()=>{
    const input=mount();fireEvent.change(input,{target:{value:"14 Test Road"}});await tick();
    await act(async()=>{fireEvent.click(screen.getByRole("option",{name:found}));});
    expect(mocks.invoke).toHaveBeenCalledTimes(2);
    expect(mocks.invoke.mock.calls[1][1].body).toEqual({mode:"confirm",query:found,selectedId:option.id});
    expect(screen.getByLabelText("Booking address")).toHaveTextContent(found);
    await tick(2000);expect(mocks.invoke).toHaveBeenCalledTimes(2);
  });
  it("keeps original customer input when licensed confirmation fails",async()=>{
    const input=mount();fireEvent.change(input,{target:{value:"14 Test Road"}});await tick();
    mocks.invoke.mockResolvedValueOnce({data:null,error:{message:"allowance exhausted"}});
    await act(async()=>{fireEvent.click(screen.getByRole("option",{name:found}));});
    expect(screen.getByLabelText("Booking address")).toHaveTextContent("14 Test Road");
    expect(screen.queryByText(/Address selected/)).not.toBeInTheDocument();
    expect(screen.getByRole("status",{name:""})).toHaveTextContent(/enter your address manually/);
  });
  it("supports keyboard selection without opening a map",async()=>{
    const input=mount();fireEvent.change(input,{target:{value:"14 Test Road"}});await tick();
    fireEvent.keyDown(input,{key:"ArrowDown"});expect(screen.getByRole("option")).toHaveAttribute("aria-selected","true");
    await act(async()=>{fireEvent.keyDown(input,{key:"Enter"});});
    expect(screen.getByLabelText("Booking address")).toHaveTextContent(found);expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("discards late suggestions and confirmation when a customer edits the address",async()=>{
    let finish!:(value:unknown)=>void;mocks.invoke.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
    const input=mount();fireEvent.change(input,{target:{value:"14 Test Road"}});await tick();
    fireEvent.change(input,{target:{value:"Different address"}});
    await act(async()=>{finish(response());});expect(screen.queryByRole("option")).not.toBeInTheDocument();
    expect(mocks.invoke.mock.calls[0][1].signal.aborted).toBe(true);
    await tick();expect(screen.getByRole("option")).toBeInTheDocument();
    mocks.invoke.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
    await act(async()=>{fireEvent.click(screen.getByRole("option"));});
    fireEvent.change(input,{target:{value:"Another new address"}});
    await act(async()=>{finish(response());});expect(screen.getByLabelText("Booking address")).toHaveTextContent("Another new address");
    expect(screen.queryByText(/Address selected/)).not.toBeInTheDocument();
  });
  it("handles no matches, failed lookup, timeout and escape without blocking typing",async()=>{
    mocks.invoke.mockResolvedValueOnce(response([{...option,featureType:"place"}]));
    const input=mount();fireEvent.change(input,{target:{value:"Mamelodi"}});await tick();
    expect(screen.queryByRole("option")).not.toBeInTheDocument();expect(screen.getByRole("status",{name:""})).toHaveTextContent(/No suggestions/);
    mocks.invoke.mockResolvedValueOnce({data:null,error:{message:"provider error"}});
    fireEvent.change(input,{target:{value:"Different Street"}});await tick();
    expect(screen.getByRole("status",{name:""})).toHaveTextContent(/enter your address manually/);
    mocks.invoke.mockImplementationOnce(()=>new Promise(()=>{}));fireEvent.change(input,{target:{value:"Slow Street"}});await tick();await tick(10000);
    expect(screen.getByRole("status",{name:""})).toHaveTextContent(/enter your address manually/);
    fireEvent.change(input,{target:{value:"14 Test Road"}});await tick();
    fireEvent.keyDown(input,{key:"Escape"});expect(screen.queryByRole("option")).not.toBeInTheDocument();expect(input).toHaveValue("14 Test Road");
  });
});
