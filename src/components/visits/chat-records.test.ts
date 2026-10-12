import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client",()=>({supabase:{from:vi.fn()}}));
const realm=async()=>{vi.resetModules();return import("./chat-records");};
const a={id:"attempt-a",envelope:"xoot:e2ee:v1:opaque-a",flags:["warning"]};
const b={id:"attempt-b",envelope:"xoot:e2ee:v1:opaque-b",flags:[]};
afterEach(()=>localStorage.clear());
describe("actual independent per-attempt journal realms sharing storage",()=>{
 it("separate realms cannot overwrite or clear another attempt, including reverse acknowledgement and remount",async()=>{
   const tabA=await realm(),tabB=await realm();
   expect(tabA.readPendingAttempts("actor","booking")).toEqual([]);
   expect(tabB.readPendingAttempts("actor","booking")).toEqual([]);
   tabA.savePending("actor","booking",a);tabB.savePending("actor","booking",b);
   expect(tabA.readPendingAttempts("actor","booking")).toHaveLength(2);
   tabB.clearPending("actor","booking",b);
   const remount=await realm();
   expect(remount.readPendingAttempts("actor","booking")).toEqual([a]);
   expect(remount.readPendingAttempts("other-actor","booking")).toEqual([]);
   expect(remount.readPendingAttempts("actor","other-booking")).toEqual([]);
   tabA.clearPending("actor","booking",a);
   expect(remount.readPendingAttempts("actor","booking")).toEqual([]);
 });
 it("retains immutable ciphertext and flags when another realm retries or misuses an existing ID",async()=>{
   const first=await realm(),second=await realm();first.savePending("actor","booking",a);
   second.savePending("actor","booking",a);
   expect(()=>second.savePending("actor","booking",{...a,envelope:b.envelope})).toThrow("immutable");
   expect(first.readPendingAttempts("actor","booking")).toEqual([a]);
 });
 it("acknowledges an exact legacy attempt without erasing a shared slot overwritten by another client",async()=>{
   const first=await realm(),second=await realm(),slot=first.pendingKey("actor","booking");
   localStorage.setItem(slot,JSON.stringify(a));const captured=first.readPending("actor","booking")!;
   localStorage.setItem(slot,JSON.stringify(b));first.clearPending("actor","booking",captured);
   expect(second.readPendingAttempts("actor","booking")).toEqual([{...b,legacy:true}]);
   expect(JSON.parse(localStorage.getItem(slot)!)).toEqual(b);
   localStorage.setItem(slot,JSON.stringify(a));expect(second.readPendingAttempts("actor","booking")).toEqual([]);
 });
});
