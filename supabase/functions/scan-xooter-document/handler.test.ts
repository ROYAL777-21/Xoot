import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { webcrypto } from "node:crypto";
import { Blob as NodeBlob } from "node:buffer";
import { createScanHandler, syntheticScanFixture } from "./handler";
import { sha256 } from "../_shared/cloudmersive";

beforeAll(() => vi.stubGlobal("crypto",webcrypto));
afterAll(() => vi.unstubAllGlobals());
const id="00000000-0000-4000-8000-000000000001";
const config={supabaseUrl:"https://fxmxyabdjqviqbcxmvlp.supabase.co",apiKey:"synthetic-provider-key"};
const request=(body:unknown, headers:Record<string,string>={apikey:"synthetic-service-key",Authorization:"Bearer synthetic-service-key"})=>
  new Request("https://test.invalid/scan",{method:"POST",headers,body:JSON.stringify(body)});
function harness() {
  let credential="";
  const rpc=vi.fn(async (name:string,input:Record<string,unknown>):Promise<{data:unknown;error:unknown}>=>({data:
    name==="kyc_scan_worker_authorized" ? ["synthetic-service-key","synthetic-other-valid-service-key"].includes(credential)
    : name==="claim_kyc_scan_v2" ? {state:"claimed",cached:false,policyVersion:"xoot-kyc-cloudmersive-v2",attemptId:id,fixture:"eicar"}
    : name==="authorize_kyc_scan_dispatch" ? {authorized:true}
    : {state:input.p_verdict,reason:input.p_reason,attemptId:id,malwareDetected:input.p_malware_detected},error:null}));
  const download=vi.fn();
  const provider=vi.fn(async()=>new Response(JSON.stringify({CleanResult:false,FoundViruses:[{VirusName:"EICAR",FileName:"generic"}]}),
    {headers:{"content-type":"application/json"}}));
  const store={rpc,storage:{from:vi.fn(()=>({download}))}};
  const factory=vi.fn((key:string)=>{credential=key;return store;});
  return {rpc,download,provider,store,factory,run:createScanHandler(config,factory,provider)};
}

describe("privileged scanner boundary",()=>{
  it.each([{}, {Authorization:"Bearer ordinary-customer-bearer"}, {apikey:"x".repeat(4097)}])("denies absent/oversized credentials before a client exists",async headers=>{
    const h=harness();expect((await h.run(request({fixture:"eicar"},headers))).status).toBe(401);
    expect(h.factory).not.toHaveBeenCalled();expect(h.rpc).not.toHaveBeenCalled();expect(h.provider).not.toHaveBeenCalled();
  });
  it.each(["synthetic-publishable-key","ordinary-customer-bearer","synthetic-forged-service-claim"])("requires real database authority for %s before quota/files",async key=>{
    const h=harness();expect((await h.run(request({fixture:"eicar"},{apikey:key,Authorization:"Bearer synthetic-service-key"}))).status).toBe(401);
    expect(h.factory).toHaveBeenCalledWith(key);expect(h.rpc.mock.calls).toEqual([["kyc_scan_worker_authorized",{}]]);
    expect(h.download).not.toHaveBeenCalled();expect(h.provider).not.toHaveBeenCalled();
  });
  it.each([{data:false,error:null},{data:"true",error:null},{data:null,error:{message:"synthetic-private-auth-error"}}])("fails closed unless actual authority is exactly true",async result=>{
    const h=harness();h.rpc.mockResolvedValueOnce(result);
    const response=await h.run(request({fixture:"eicar"}));expect(response.status).toBe(401);
    expect(await response.json()).toEqual({error:"unauthorized"});expect(h.rpc).toHaveBeenCalledTimes(1);expect(h.provider).not.toHaveBeenCalled();
  });
  it("accepts a different valid service credential using the same authenticated client throughout",async()=>{
    const h=harness();expect((await h.run(request({fixture:"eicar"},{apikey:"synthetic-other-valid-service-key"}))).status).toBe(200);
    expect(h.factory).toHaveBeenCalledExactlyOnceWith("synthetic-other-valid-service-key");
    expect(h.rpc.mock.calls.map(([name])=>name)).toEqual(["kyc_scan_worker_authorized","claim_kyc_scan_v2","authorize_kyc_scan_dispatch","finish_kyc_scan"]);
    expect(h.provider).toHaveBeenCalledTimes(1);
  });
  it("refuses browser-origin requests and production before constructing a client",async()=>{
    const h=harness();expect((await h.run(request({fixture:"eicar"},{apikey:"synthetic-service-key",Origin:"https://xoot.co.za"}))).status).toBe(403);
    const production=createScanHandler({...config,supabaseUrl:"https://production.invalid"},h.factory,h.provider);
    expect((await production(request({fixture:"eicar"}))).status).toBe(409);
    expect(h.factory).not.toHaveBeenCalled();expect(h.rpc).not.toHaveBeenCalled();expect(h.provider).not.toHaveBeenCalled();
  });
  it.each([{fixture:"eicar",url:"https://foreign.invalid"},{fixture:["eicar"]},{documentId:"arbitrary-path"},
    {fixture:"clean_pdf",documentId:id},{fixture:"unknown"},{fixture:"eicar",padding:"x".repeat(4100)}])("refuses unexpected input before quota",async body=>{
    const h=harness();expect((await h.run(request(body))).status).toBe(400);
    expect(h.rpc.mock.calls).toEqual([["kyc_scan_worker_authorized",{}]]);expect(h.provider).not.toHaveBeenCalled();
  });
  it("acknowledges a cached/held job without another provider call",async()=>{
    const h=harness();h.rpc.mockResolvedValueOnce({data:true,error:null}).mockResolvedValueOnce({data:{state:"blocked",cached:true,policyVersion:"xoot-kyc-cloudmersive-v2",attemptId:id,fixture:"eicar"},error:null});
    expect((await (await h.run(request({fixture:"eicar"}))).json()).state).toBe("blocked");
    expect(h.provider).not.toHaveBeenCalled();expect(h.download).not.toHaveBeenCalled();
  });
  it("does not reinterpret an earlier-policy receipt or send another provider request",async()=>{
    const h=harness();h.rpc.mockResolvedValueOnce({data:true,error:null}).mockResolvedValueOnce({data:{state:"clean",cached:true,
      policyVersion:"xoot-kyc-cloudmersive-v1",attemptId:id},error:null});
    expect((await h.run(request({fixture:"clean_pdf"}))).status).toBe(503);
    expect(h.provider).not.toHaveBeenCalled();expect(h.download).not.toHaveBeenCalled();
  });
  it("stores a redacted receipt for the harmless antivirus fixture",async()=>{
    const h=harness();const result=await (await h.run(request({fixture:"eicar"}))).json();
    expect(result).toMatchObject({state:"blocked",malwareDetected:true});expect(h.provider).toHaveBeenCalledTimes(1);
    expect(h.rpc.mock.calls[3]).toEqual(["finish_kyc_scan",expect.objectContaining({p_attempt_id:id,p_verdict:"blocked",
      p_response_sha256:expect.stringMatching(/^[a-f0-9]{64}$/),p_malware_detected:true})]);
    expect(JSON.stringify(result)).not.toMatch(/synthetic-provider-key|EICAR|FileName|storagePath/);
  });
  it("does not dispatch stale or already-dispatched claims",async()=>{
    const h=harness();h.rpc.mockImplementation(async(name:string,input:Record<string,unknown>)=>({data:name==="kyc_scan_worker_authorized" ? true
      : name==="claim_kyc_scan_v2" ? {state:"claimed",cached:false,policyVersion:"xoot-kyc-cloudmersive-v2",attemptId:id,fixture:"eicar"}
      : name==="authorize_kyc_scan_dispatch" ? {authorized:false} : {state:input.p_verdict,reason:input.p_reason,attemptId:id},error:null}));
    expect((await(await h.run(request({fixture:"eicar"}))).json()).state).toBe("error");expect(h.provider).not.toHaveBeenCalled();
  });
  it("refuses admission responses delayed beyond the provider dispatch window",async()=>{
    const h=harness();const clock=vi.spyOn(performance,"now").mockReturnValueOnce(0).mockReturnValue(2001);
    try {expect((await(await h.run(request({fixture:"eicar"}))).json()).reason).toBe("dispatch_window_expired");expect(h.provider).not.toHaveBeenCalled();}
    finally {clock.mockRestore();}
  });
  it("rejects changed bytes before transmitting an identity document",async()=>{
    const h=harness();const fixture=syntheticScanFixture("clean_pdf");
    h.rpc.mockImplementation(async(name:string,input:Record<string,unknown>)=>({data:name==="kyc_scan_worker_authorized" ? true : name==="claim_kyc_scan_v2"
      ? {state:"claimed",cached:false,policyVersion:"xoot-kyc-cloudmersive-v2",attemptId:id,storagePath:`${id}/document.pdf`,sha256:"a".repeat(64),contentType:"application/pdf",byteLength:fixture.bytes.length}
      : {state:input.p_verdict,reason:input.p_reason,attemptId:id},error:null}));
    h.download.mockResolvedValue({data:new NodeBlob([fixture.bytes]),error:null});
    const result=await(await h.run(request({documentId:id}))).json();
    expect(result.state).toBe("error");expect(h.provider).not.toHaveBeenCalled();
    expect(h.rpc.mock.calls[2][1].p_observed_sha256).toBe(await sha256(fixture.bytes));
  });
});
