import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Calendars from "./Calendars";
import ManageMore from "./ManageMore";

type Query = {table:string;columns:string;filters:[string,unknown][]};
const harness=vi.hoisted(()=>({read:vi.fn(),download:vi.fn(),queries:[] as Query[]}));
vi.mock("@/contexts/AuthContext",()=>({useAuth:()=>({user:{id:"owner-a"},loading:false})}));
vi.mock("@/lib/visit-calendar",async importOriginal=>({...await importOriginal<typeof import("@/lib/visit-calendar")>(),downloadVisitCalendar:harness.download}));
vi.mock("@/integrations/supabase/client",()=>({supabase:{from:(table:string)=>{
  const record:Query={table,columns:"",filters:[]};harness.queries.push(record);
  const chain={select:(columns:string)=>{record.columns=columns;return chain;},eq:(field:string,value:unknown)=>{record.filters.push([field,value]);return chain;},gte:()=>chain,in:()=>chain,not:()=>chain,order:()=>chain,limit:()=>harness.read(record),range:()=>harness.read(record)};return chain;
}}}));
const visit={id:"00000000-0000-4000-8000-000000000001",service:"regular",scheduled_at:"2026-11-01T08:00:00+02:00",duration_hours:4,status:"contractor_accepted"};
beforeEach(()=>{harness.queries=[];harness.read.mockReset();harness.download.mockReset();});
afterEach(cleanup);
const mount=(page:React.ReactNode)=>render(<MemoryRouter>{page}</MemoryRouter>);
describe("Places and calendar continuity",()=>{
  it("exports only the owner's real scheduled visit and explains copy semantics",async()=>{
    harness.read.mockResolvedValue({data:[visit],error:null});mount(<Calendars/>);
    fireEvent.click(await screen.findByRole("button",{name:"Add to calendar"}));
    expect(harness.download).toHaveBeenCalledExactlyOnceWith(visit);
    expect(harness.queries[0].filters).toEqual([["user_id","owner-a"]]);
    expect(harness.queries[0].columns).not.toMatch(/address|notes|gate|email/);
    expect(screen.getByText(/This adds a copy of one visit/)).toBeInTheDocument();
  });
  it("reports failed or malformed schedule reads without a fake connected calendar",async()=>{
    harness.read.mockResolvedValue({data:[{...visit,scheduled_at:"broken"}],error:null});mount(<Calendars/>);
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be loaded");
    expect(screen.queryByRole("button",{name:"Add to calendar"})).not.toBeInTheDocument();
  });
  it("offers a useful empty state without sending any calendar request",async()=>{
    harness.read.mockResolvedValue({data:[],error:null});mount(<Calendars/>);
    expect(await screen.findByText("No upcoming visits")).toBeInTheDocument();
    expect(harness.download).not.toHaveBeenCalled();
  });
  it("uses the same saved places in Manage more and preserves truthful team availability",async()=>{
    harness.read.mockImplementation((query:Query)=>Promise.resolve({data:query.table==="household_profiles"?[{id:"place-a",label:"Our home",address:"Synthetic address",is_default:false}]:[{...visit,status:"completed"}],error:null}));
    mount(<ManageMore/>);await screen.findByText("visits completed");
    expect(harness.queries.every(query=>query.filters.some(([field,value])=>field==="user_id"&&value==="owner-a"))).toBe(true);
    fireEvent.click(screen.getByRole("button",{name:"Places"}));
    expect(screen.getByRole("link",{name:/Our home/})).toHaveAttribute("href","/app/profile/homes/place-a");
    fireEvent.click(screen.getByRole("button",{name:"Team"}));
    expect(screen.getByText(/Shared team access is not available/)).toBeInTheDocument();
    expect(screen.queryByText(/R4 280|Nadia|nadia@/)).not.toBeInTheDocument();
  });
});
