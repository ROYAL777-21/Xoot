import { describe,expect,it,vi } from "vitest";
import { stagingScannerFetch } from "./store-transport";
const target="https://fxmxyabdjqviqbcxmvlp.supabase.co/rest/v1/rpc/kyc_scan_worker_authorized";
describe("scanner database transport",()=>{
  it("pins the staging origin and refuses redirect forwarding while retaining headers",async()=>{
    const request=vi.fn<typeof fetch>(async()=>new Response("true"));
    await stagingScannerFetch(request)(target,{method:"POST",headers:{apikey:"synthetic-credential"}});
    expect(request).toHaveBeenCalledExactlyOnceWith(target,expect.objectContaining({redirect:"error",headers:{apikey:"synthetic-credential"}}));
    expect(request.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });
  it.each(["https://foreign.invalid/rest/v1/rpc/kyc_scan_worker_authorized",
    "https://mvlrkelahhsyjrwgsxaf.supabase.co/rest/v1/rpc/kyc_scan_worker_authorized",
    "http://fxmxyabdjqviqbcxmvlp.supabase.co/rest/v1/rpc/kyc_scan_worker_authorized",
    "https://user:password@fxmxyabdjqviqbcxmvlp.supabase.co/rest/v1/rpc/kyc_scan_worker_authorized"])("refuses non-staging/untrusted credential destinations %s",async url=>{
    const request=vi.fn<typeof fetch>();await expect(stagingScannerFetch(request)(url)).rejects.toThrow("scanner_database_target_refused");
    expect(request).not.toHaveBeenCalled();
  });
  it("does not replace an existing caller cancellation with an unbounded request",async()=>{
    const controller=new AbortController();controller.abort();
    const request=vi.fn<typeof fetch>(async()=>new Response("true"));
    await stagingScannerFetch(request)(target,{signal:controller.signal});
    expect(request.mock.calls[0][1].signal?.aborted).toBe(true);
  });
});
