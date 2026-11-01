import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { webcrypto } from "node:crypto";
import { Blob as NodeBlob } from "node:buffer";
import { createScanHandler, syntheticScanFixture } from "./handler";
import { sha256 } from "../_shared/cloudmersive";

beforeAll(() => vi.stubGlobal("crypto",webcrypto));
afterAll(() => vi.unstubAllGlobals());
const id="00000000-0000-4000-8000-000000000001";
const config={supabaseUrl:"https://fxmxyabdjqviqbcxmvlp.supabase.co",serviceKey:"synthetic-service-key",apiKey:"synthetic-provider-key"};
const request=(body:unknown, headers:Record<string,string>={apikey:"synthetic-service-key",Authorization:"Bearer synthetic-service-key"})=>
  new Request("https://test.invalid/scan",{method:"POST",headers,body:JSON.stringify(body)});
function harness() {
  const rpc=vi.fn(async (name:string,input:Record<string,unknown>)=>({data:name==="claim_kyc_scan"
    ? {state:"claimed",cached:false,attemptId:id,fixture:"eicar"} : name==="authorize_kyc_scan_dispatch" ? {authorized:true}
    : {state:input.p_verdict,reason:input.p_reason,attemptId:id,malwareDetected:input.p_malware_detected},error:null}));
  const download=vi.fn();
  const provider=vi.fn(async()=>new Response(JSON.stringify({CleanResult:false,FoundViruses:[{VirusName:"EICAR",FileName:"generic"}]}),
    {headers:{"content-type":"application/json"}}));
  const store={rpc,storage:{from:vi.fn(()=>({download}))}};
  return {rpc,download,provider,store,run:createScanHandler(config,store,provider)};
}
describe("privileged scanner boundary",()=>{
  it.each([{}, {Authorization:"Bearer ordinary-customer-bearer"}, {apikey:"synthetic-publishable-key",Authorization:"Bearer synthetic-service-key"}])("denies unsigned/customer callers before database or provider",async headers=>{
    const h=harness();expect((await h.run(request({fixture:"eicar"},headers))).status).toBe(401);
    expect(h.rpc).not.toHaveBeenCalled();expect(h.provider).not.toHaveBeenCalled();
  });
  it("refuses browser-origin requests and production even with a service credential",async()=>{
    const h=harness();expect((await h.run(request({fixture:"eicar"},{apikey:"synthetic-service-key",Authorization:"Bearer synthetic-service-key",Origin:"https://xoot.co.za"}))).status).toBe(403);
    const production=createScanHandler({...config,supabaseUrl:"https://production.invalid"},h.store,h.provider);
    expect((await production(request({fixture:"eicar"}))).status).toBe(409);
    expect(h.rpc).not.toHaveBeenCalled();expect(h.provider).not.toHaveBeenCalled();
  });
  it.each([{fixture:"eicar",url:"https://foreign.invalid"},{fixture:["eicar"]},{documentId:"arbitrary-path"},
    {fixture:"clean_pdf",documentId:id},{fixture:"unknown"},{fixture:"eicar",padding:"x".repeat(4100)}])("refuses unbounded/unexpected user input",async body=>{
    const h=harness();expect((await h.run(request(body))).status).toBe(400);expect(h.rpc).not.toHaveBeenCalled();
  });
  it("acknowledges a cached/held job without another provider call",async()=>{
    const h=harness();h.rpc.mockResolvedValue({data:{state:"blocked",cached:true,attemptId:id,fixture:"eicar"},error:null});
    expect((await (await h.run(request({fixture:"eicar"}))).json()).state).toBe("blocked");
    expect(h.provider).not.toHaveBeenCalled();expect(h.download).not.toHaveBeenCalled();
  });
  it("stores a redacted provider receipt for the fixed harmless antivirus fixture",async()=>{
    const h=harness();const result=await (await h.run(request({fixture:"eicar"}))).json();
    expect(result).toMatchObject({state:"blocked",malwareDetected:true});
    expect(h.provider).toHaveBeenCalledTimes(1);
    expect(h.rpc.mock.calls[2]).toEqual(["finish_kyc_scan",expect.objectContaining({p_attempt_id:id,p_verdict:"blocked",
      p_response_sha256:expect.stringMatching(/^[a-f0-9]{64}$/),p_malware_detected:true})]);
    expect(JSON.stringify(result)).not.toMatch(/synthetic-provider-key|EICAR|FileName|storagePath/);
  });
  it("does not dispatch a stale or already-dispatched claim",async()=>{
    const h=harness();
    h.rpc.mockImplementation(async(name:string,input:Record<string,unknown>)=>({data:name==="claim_kyc_scan"
      ? {state:"claimed",cached:false,attemptId:id,fixture:"eicar"} : name==="authorize_kyc_scan_dispatch" ? {authorized:false}
      : {state:input.p_verdict,reason:input.p_reason,attemptId:id},error:null}));
    expect((await(await h.run(request({fixture:"eicar"}))).json()).state).toBe("error");
    expect(h.provider).not.toHaveBeenCalled();
  });
  it("refuses an admission response delayed beyond its provider dispatch window",async()=>{
    const h=harness();const clock=vi.spyOn(performance,"now").mockReturnValueOnce(0).mockReturnValue(2001);
    try {
      expect((await(await h.run(request({fixture:"eicar"}))).json()).reason).toBe("dispatch_window_expired");
      expect(h.provider).not.toHaveBeenCalled();
    } finally {clock.mockRestore();}
  });
  it("rejects changed bytes before sending any identity document to the provider",async()=>{
    const h=harness();const fixture=syntheticScanFixture("clean_pdf");
    h.rpc.mockImplementation(async(name:string,input:Record<string,unknown>)=>({data:name==="claim_kyc_scan"
      ? {state:"claimed",cached:false,attemptId:id,storagePath:`${id}/document.pdf`,sha256:"a".repeat(64),contentType:"application/pdf",byteLength:fixture.bytes.length}
      : {state:input.p_verdict,reason:input.p_reason,attemptId:id},error:null}));
    h.download.mockResolvedValue({data:new NodeBlob([fixture.bytes]),error:null});
    const result=await(await h.run(request({documentId:id}))).json();
    expect(result.state).toBe("error");expect(h.provider).not.toHaveBeenCalled();
    expect(h.rpc.mock.calls[1][1].p_observed_sha256).toBe(await sha256(fixture.bytes));
  });
});
