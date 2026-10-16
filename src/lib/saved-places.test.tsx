import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AddressPicker } from "@/components/xoot/AddressPicker";
import { useHouseholdOperatingLayer } from "@/hooks/useHouseholdOperatingLayer";
import { useProximity } from "@/hooks/useProximity";
import { readPlaces, selectDefaultHome, removeHome } from "./saved-places-client";
import { defaultPlace, placeSummaryColumns, type PlaceSummary } from "./saved-places";
const state = vi.hoisted(() => ({
  auth: { user: {id:"owner-a"} as {id:string} | null, loading:false },
  rows: [] as (PlaceSummary & {user_id:string;archived_at:string|null})[],
  read: vi.fn(), rpc: vi.fn(), queries: [] as {table:string;columns:string;filters:[string,unknown][]}[], success:vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({useAuth:()=>state.auth}));
vi.mock("@/hooks/useSuburbCentroids", () => ({useSuburbCentroids:()=>({centroids:[],loaded:true})}));
vi.mock("sonner", () => ({toast:{success:state.success}}));
vi.mock("@/integrations/supabase/client", () => ({isSupabaseConfigured:true,supabase:{rpc:(...args:unknown[])=>state.rpc(...args),from:(table:string)=>{
  const q={table,columns:"",filters:[] as [string,unknown][]};state.queries.push(q);
  const finish=()=>state.read(q);
  const chain={select:(columns:string)=>{q.columns=columns;return chain;},eq:(k:string,v:unknown)=>{q.filters.push([k,v]);return chain;},is:(k:string,v:unknown)=>{q.filters.push([k,v]);return chain;},order:()=>chain,range:finish,limit:()=>chain,maybeSingle:async()=>{const result=await finish();return {...result,data:result.data?.[0]??null};},then:(resolve:(value:unknown)=>unknown,reject:(reason:unknown)=>unknown)=>Promise.resolve(finish()).then(resolve,reject)};return chain;
}}}));
function deferred<T>() {let resolve!:(value:T)=>void;return {promise:new Promise<T>(done=>{resolve=done;}),resolve};}
const ok=(data:unknown)=>({data,error:null});
beforeEach(()=>{
 state.auth={user:{id:"owner-a"},loading:false};state.queries=[];state.success.mockReset();state.rpc.mockReset();
 state.rows=[{id:"a",label:"Home",address:"100 Test Road",is_default:true,user_id:"owner-a",archived_at:null},{id:"b",label:"Office",address:"200 Test Road",is_default:false,user_id:"owner-a",archived_at:null}];
 state.read.mockReset().mockImplementation((q:{table:string;filters:[string,unknown][]})=>Promise.resolve(ok(q.table!=="household_profiles"?[]:state.rows.filter(row=>q.filters.every(([k,v])=>row[k as keyof typeof row]===v)))));
});
afterEach(()=>{cleanup();vi.restoreAllMocks();});
describe("Canonical saved places",()=>{
 it("uses safe owner-qualified active lists and the same explicit default for proximity",async()=>{
  const places=await readPlaces("owner-a");const {result}=renderHook(()=>useProximity());
  await waitFor(()=>expect(result.current.loaded).toBe(true));
  expect(result.current.address).toBe(defaultPlace(places)?.address);
  expect(state.queries[0]).toEqual({table:"household_profiles",columns:placeSummaryColumns,filters:[["user_id","owner-a"],["archived_at",null]]});
  expect(state.queries[1]).toEqual({table:"household_profiles",columns:"address",filters:[["user_id","owner-a"],["is_default",true],["archived_at",null]]});
  expect(placeSummaryColumns).not.toMatch(/gate|alarm|access/);
 });
 it("the household operating reader agrees on the selected identity without retrieving access values",async()=>{
  const places=await readPlaces("owner-a");const {result}=renderHook(()=>useHouseholdOperatingLayer());
  await waitFor(()=>expect(result.current.loading).toBe(false));
  expect(result.current.homeMemory?.id).toBe(defaultPlace(places)?.id);
  const query=state.queries.find(q=>q.columns.includes("has_access_notes"));
  expect(query?.filters).toContainEqual(["is_default",true]);expect(query?.filters).toContainEqual(["archived_at",null]);
  expect(query?.columns.split(",")).not.toContain("access_notes");
 });
 it("returns no default rather than newest when places exist without a selection",async()=>{
  state.rows.forEach(row=>{row.is_default=false;});expect(defaultPlace(await readPlaces("owner-a"))).toBeNull();
  const {result}=renderHook(()=>useProximity());await waitFor(()=>expect(result.current.loaded).toBe(true));expect(result.current.address).toBeNull();
 });
 it("hides the old address immediately and ignores a stale proximity reply after account switching",async()=>{
  const pending=deferred<ReturnType<typeof ok>>();state.read.mockReturnValueOnce(pending.promise);
  const {result,rerender}=renderHook(()=>useProximity());state.auth.user={id:"owner-b"};rerender();expect(result.current.address).toBeNull();
  await act(async()=>{pending.resolve(ok([{address:"Old owner's address"}]));await pending.promise;});
  await waitFor(()=>expect(result.current.loaded).toBe(true));expect(result.current.address).toBeNull();
 });
 it("does not report committed default or removal on errors or incomplete replies",async()=>{
  state.rpc.mockResolvedValue(ok(null));await expect(selectDefaultHome("owner-a","b")).rejects.toThrow("confirmed");await expect(removeHome("owner-a","b")).rejects.toThrow("confirmed");
  state.rpc.mockResolvedValue(ok({id:"b",is_default:false}));await expect(selectDefaultHome("owner-a","b")).rejects.toThrow("confirmed");
  state.rpc.mockResolvedValue(ok({id:"b",is_default:true}));await expect(selectDefaultHome("owner-a","b")).resolves.toBeUndefined();
 });
 it("picker uses native buttons, waits for committed selection and keeps explicit booking choice separate",async()=>{
  const change=vi.fn(),pending=deferred<ReturnType<typeof ok>>();state.rpc.mockReturnValueOnce(pending.promise);
  render(<AddressPicker value="100 Test Road" onChange={change}/>);const office=await screen.findByRole("button",{name:"Office"});fireEvent.click(office);
  expect(change).toHaveBeenCalledWith("200 Test Road");expect(state.rpc).not.toHaveBeenCalled();
  const select=screen.getByRole("button",{name:"Set default"});expect(select.tagName).toBe("BUTTON");expect(select.closest("button button")).toBeNull();select.focus();expect(select).toHaveFocus();fireEvent.click(select);fireEvent.click(select);
  expect(state.rpc).toHaveBeenCalledOnce();expect(select).toBeDisabled();expect(state.success).not.toHaveBeenCalled();
  state.rows[0].is_default=false;state.rows[1].is_default=true;
  await act(async()=>{pending.resolve(ok({id:"b",is_default:true}));await pending.promise;});
  await waitFor(()=>expect(state.success).toHaveBeenCalledWith("Default place saved"));expect(change).toHaveBeenCalledTimes(1);
 });
 it("picker retains prior default on a failed switch and suppresses a stale account's success",async()=>{
  const change=vi.fn();state.rpc.mockResolvedValueOnce({data:null,error:{code:"PGRST202"}});
  const view=render(<AddressPicker value="100 Test Road" onChange={change}/>);fireEvent.click(await screen.findByRole("button",{name:"Set default"}));
  expect(await screen.findByRole("alert")).toHaveTextContent("could not be confirmed");expect(state.success).not.toHaveBeenCalled();expect(screen.getByRole("button",{name:/^Home/})).toContainElement(screen.getByLabelText("Default place"));
  const pending=deferred<ReturnType<typeof ok>>();state.rpc.mockReturnValueOnce(pending.promise);fireEvent.click(screen.getByRole("button",{name:"Set default"}));
  state.auth.user={id:"owner-b"};view.rerender(<AddressPicker value="" onChange={change}/>);
  await act(async()=>{pending.resolve(ok({id:"b",is_default:true}));await pending.promise;});
  expect(state.success).not.toHaveBeenCalled();expect(change).not.toHaveBeenCalled();expect(screen.queryByRole("button",{name:/^Home/})).not.toBeInTheDocument();
 });
 it.each(["lost", "invalid", "not committed"])("preserves the new-place draft and retry UUID through Reload places after a %s reply",async(reply)=>{
  state.rows=[];const change=vi.fn();
  state.rpc.mockImplementation(async(_name,args)=>{
    if(reply!=="not committed" || state.rpc.mock.calls.length>1){
      const existing=state.rows.find(row=>row.id===args.p_home_id);
      if(!existing) state.rows.push({id:args.p_home_id,...args.p_details,is_default:args.p_selected===true,user_id:args.p_expected_owner,archived_at:null});
    }
    if(state.rpc.mock.calls.length===1) return reply==="invalid" ? ok({id:"invalid-reply"}) : {data:null,error:{message:"Reply unavailable"}};
    return ok({id:args.p_home_id,is_default:true});
  });
  render(<AddressPicker value="" onChange={change}/>);
  fireEvent.click(await screen.findByRole("button",{name:"Add new address"}));
  fireEvent.change(screen.getByLabelText("Place label"),{target:{value:"Office"}});
  fireEvent.change(screen.getByLabelText("Street address"),{target:{value:"300 Retry Road"}});
  fireEvent.change(screen.getByLabelText("City"),{target:{value:"Test city"}});
  fireEvent.change(screen.getByLabelText("Postal code"),{target:{value:"1000"}});
  fireEvent.click(screen.getByRole("button",{name:"Save address"}));
  expect(await screen.findByRole("alert")).toHaveTextContent("could not be confirmed");
  expect(state.success).not.toHaveBeenCalled();
  const pending=deferred<ReturnType<typeof ok>>();state.read.mockReturnValueOnce(pending.promise);
  fireEvent.click(screen.getByRole("button",{name:"Reload places"}));
  expect(screen.getByLabelText("Street address")).toHaveValue("300 Retry Road");
  expect(screen.getByRole("button",{name:"Save address"})).toBeDisabled();
  await act(async()=>{pending.resolve(ok([...state.rows]));await pending.promise;});
  await waitFor(()=>expect(screen.getByRole("button",{name:"Save address"})).toBeEnabled());
  expect(screen.getByLabelText("Place label")).toHaveValue("Office");expect(screen.getByLabelText("City")).toHaveValue("Test city");expect(screen.getByLabelText("Postal code")).toHaveValue("1000");
  fireEvent.click(screen.getByRole("button",{name:"Save address"}));
  await waitFor(()=>expect(state.success).toHaveBeenCalledWith("Address saved"));
  expect(state.rows).toHaveLength(1);expect(state.rpc.mock.calls[1][1]).toEqual(state.rpc.mock.calls[0][1]);
  fireEvent.click(await screen.findByRole("button",{name:"Add new address"}));
  expect(screen.getByLabelText("Street address")).toHaveValue("");
  fireEvent.change(screen.getByLabelText("Street address"),{target:{value:"400 Separate Road"}});
  fireEvent.click(screen.getByRole("button",{name:"Save address"}));
  await waitFor(()=>expect(state.rpc).toHaveBeenCalledTimes(3));
  expect(state.rpc.mock.calls[2][1].p_home_id).not.toBe(state.rpc.mock.calls[0][1].p_home_id);
 });

});
