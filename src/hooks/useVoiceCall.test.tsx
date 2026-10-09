import {act,cleanup,renderHook,waitFor} from "@testing-library/react";
import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {useVoiceCall} from "./useVoiceCall";
const harness=vi.hoisted(()=>({invoke:vi.fn(),devices:[] as {destroy:ReturnType<typeof vi.fn>;connect:ReturnType<typeof vi.fn>;on:ReturnType<typeof vi.fn>}[],connect:vi.fn()}));
vi.mock("@/integrations/supabase/client",()=>({supabase:{functions:{invoke:(...args:unknown[])=>harness.invoke(...args)}}}));
vi.mock("@twilio/voice-sdk",()=>({Call:{Codec:{Opus:"opus",PCMU:"pcmu"}},Device:class{
  destroy=vi.fn();connect=harness.connect;on=vi.fn();constructor(){harness.devices.push(this);}
}}));
function deferred<T>(){let resolve!:(value:T)=>void;return{promise:new Promise<T>(done=>{resolve=done;}),resolve:(value:T)=>resolve(value)};}
const call=()=>({disconnect:vi.fn(),on:vi.fn(),mute:vi.fn()});
beforeEach(()=>{harness.devices=[];harness.invoke.mockReset().mockResolvedValue({data:{token:"test-token"},error:null});harness.connect.mockReset().mockResolvedValue(call());});
afterEach(cleanup);
describe("booking call lifetime",()=>{
  it("shows unavailable providers without opening a microphone",async()=>{harness.invoke.mockResolvedValue({data:{configured:false,missing:[]},error:null});const{result}=renderHook(()=>useVoiceCall());await act(async()=>result.current.start("booking"));expect(result.current.state.phase).toBe("unavailable");expect(harness.devices).toHaveLength(0);});
  it("ignores a late token after the visit/account is left",async()=>{const token=deferred<unknown>();harness.invoke.mockReturnValueOnce(token.promise);const{result,unmount}=renderHook(()=>useVoiceCall());let pending!:Promise<void>;act(()=>{pending=result.current.start("booking");});unmount();await act(async()=>{token.resolve({data:{token:"old-token"},error:null});await pending;});expect(harness.devices).toHaveLength(0);});
  it("disconnects late media after unmount rather than leaving a microphone open",async()=>{const media=deferred<ReturnType<typeof call>>();harness.connect.mockReturnValueOnce(media.promise);const{result,unmount}=renderHook(()=>useVoiceCall());let pending!:Promise<void>;act(()=>{pending=result.current.start("booking");});await waitFor(()=>expect(harness.devices).toHaveLength(1));unmount();const late=call();await act(async()=>{media.resolve(late);await pending;});expect(late.disconnect).toHaveBeenCalled();expect(harness.devices[0].destroy).toHaveBeenCalled();});
  it("invalidates a connection still pending after hang-up",async()=>{const media=deferred<ReturnType<typeof call>>();harness.connect.mockReturnValueOnce(media.promise);const{result}=renderHook(()=>useVoiceCall());let pending!:Promise<void>;act(()=>{pending=result.current.start("booking");});await waitFor(()=>expect(harness.devices).toHaveLength(1));act(()=>result.current.hangUp());const late=call();await act(async()=>{media.resolve(late);await pending;});expect(late.disconnect).toHaveBeenCalled();expect(result.current.state.phase).toBe("ended");});
  it("prevents duplicate starts while awaiting a token",async()=>{const token=deferred<unknown>();harness.invoke.mockReturnValueOnce(token.promise);const{result}=renderHook(()=>useVoiceCall());let pending!:Promise<void>;act(()=>{pending=result.current.start("booking");void result.current.start("booking");});expect(harness.invoke).toHaveBeenCalledTimes(1);await act(async()=>{token.resolve({data:{configured:false},error:null});await pending;});});
});
