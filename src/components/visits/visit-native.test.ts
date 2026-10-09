import { describe,expect,it } from "vitest";
import { visitData,visitBooking } from "@/test/visit-fixture";
import { visitLiveActivity,visitNativeInput } from "./visit-native";
import { buildBookingEtaShareText,createNativeBookingActionPayload } from "@/lib/native-booking-actions";
describe("actual visit facts in shared/native payloads",()=>{
  it("never invents an ETA or leaks an address into share or masked-call payloads",()=>{
    const data=visitData({booking:visitBooking({status:"en_route",address:"Sensitive address"})});
    const input=visitNativeInput(data);
    for(const action of ["share_eta","masked_call"] as const){const payload=createNativeBookingActionPayload(action,input);expect(payload.etaMinutes).toBeUndefined();expect(JSON.stringify(payload)).not.toContain("Sensitive address");expect(buildBookingEtaShareText(payload)).not.toMatch(/ETA|12 min/);}
  });
  it("retains scheduled time and real recorded event states without a timer",()=>{
    const data=visitData();
    expect(visitLiveActivity(data,"arrived")).toMatchObject({status:"arrived",statusLabel:"Xooter arrived",scheduledAt:data.booking.scheduled_at});
    expect(visitLiveActivity(data,"en_route")).toMatchObject({status:"enroute"});expect(visitLiveActivity(data,"completed").etaMinutes).toBeUndefined();
    expect(visitLiveActivity(data,"assigned").status).toBe("pending");
  });
  it("does not identify one helper as the whole crew in share/native cards",()=>{const data=visitData({booking:visitBooking({crew_size:2})});expect(visitNativeInput(data).xooterName).toBeUndefined();expect(visitLiveActivity(data,"completed").xooterName).toBeUndefined();});
});
