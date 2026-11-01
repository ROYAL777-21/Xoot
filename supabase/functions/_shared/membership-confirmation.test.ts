import { describe, expect, it, vi } from "vitest";
import { applyMembershipPaymentConfirmed, type MembershipConfirmationInput } from "./membership-confirmation";
const ids=Array.from({length:7},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,"0")}`);
const input:MembershipConfirmationInput={paymentRecordId:ids[0],expectedUserId:ids[1],expectedSubscriptionId:ids[2],expectedPlanId:ids[3],
  source:"payfast",amountCents:9900,providerReference:"synthetic-careplus-reference",providerEventId:ids[4],payloadHash:"a".repeat(64),providerTransactionId:"synthetic-payfast-tx"};
const receipt={payment_record_id:ids[0],user_id:ids[1],subscription_id:ids[2],plan_id:ids[3],status:"paid",subscription_status:"active",
  period_start:"2026-11-01T08:00:00Z",period_end:"2026-12-01T08:00:00Z",welcome_credit_granted:true,requires_reconciliation:false,idempotent:false};
const store=()=>({rpc:vi.fn().mockResolvedValue({data:receipt,error:null})});
describe("membership receipt transport",()=>{
  it("sends one complete provider binding to the canonical transaction",async()=>{
    const db=store();expect(await applyMembershipPaymentConfirmed(db,input)).toEqual(receipt);
    expect(db.rpc).toHaveBeenCalledWith("settle_membership_payment",expect.objectContaining({p_payment_id:ids[0],p_source:"payfast",
      p_amount_cents:9900,p_provider_event_id:ids[4],p_payload_hash:"a".repeat(64),p_provider_transaction_id:"synthetic-payfast-tx",
      p_admin_id:null,p_admin_session_id:null,p_reason:null}));
    expect(db.rpc).toHaveBeenCalledTimes(1);
  });
  it.each([{amountCents:0},{amountCents:NaN},{amountCents:9900.1},{expectedUserId:"caller-name"},{providerReference:"unsafe\nreference"},
    {providerEventId:null},{payloadHash:"broken"},{providerTransactionId:""},{adminId:ids[5]}])("rejects incomplete/untrusted confirmation before RPC: %j",async delta=>{
    const db=store();await expect(applyMembershipPaymentConfirmed(db,{...input,...delta})).rejects.toThrow();expect(db.rpc).not.toHaveBeenCalled();
  });
  it("requires current admin session and reason, without provider fields",async()=>{
    const db=store();const admin:MembershipConfirmationInput={...input,source:"admin",providerEventId:null,payloadHash:null,providerTransactionId:null,
      adminId:ids[5],adminSessionId:ids[6],reason:"Verified bank receipt through the authorised admin workflow"};
    await applyMembershipPaymentConfirmed(db,admin);
    await expect(applyMembershipPaymentConfirmed(db,{...admin,adminSessionId:null})).rejects.toThrow();
    await expect(applyMembershipPaymentConfirmed(db,{...admin,reason:"short"})).rejects.toThrow();
    expect(db.rpc).toHaveBeenCalledTimes(1);
  });
  it("retries only whole serialization/deadlock aborts with identical arguments",async()=>{
    const db=store();db.rpc.mockResolvedValueOnce({data:null,error:{code:"40001"}}).mockResolvedValueOnce({data:null,error:{code:"40P01"}});
    expect(await applyMembershipPaymentConfirmed(db,input)).toEqual(receipt);
    expect(db.rpc).toHaveBeenCalledTimes(3);expect(db.rpc.mock.calls[0]).toEqual(db.rpc.mock.calls[2]);
  });
  it("does not retry ordinary errors or print private error material",async()=>{
    const db=store();db.rpc.mockResolvedValue({data:null,error:{code:"synthetic-private-error-material"}});
    await expect(applyMembershipPaymentConfirmed(db,input)).rejects.toThrow("atomic membership settlement failed: database_error");
    expect(db.rpc).toHaveBeenCalledTimes(1);
  });
  it.each(["payment_record_id","user_id","subscription_id","plan_id"])("refuses a receipt for a different %s",async field=>{
    const db=store();db.rpc.mockResolvedValue({data:{...receipt,[field]:ids[6]},error:null});
    await expect(applyMembershipPaymentConfirmed(db,input)).rejects.toThrow("receipt could not be confirmed");
  });
  it.each([{period_end:receipt.period_start},{period_start:"invalid"},{welcome_credit_granted:"true"},{idempotent:undefined},
    {status:"pending"},{requires_reconciliation:true,welcome_credit_granted:true}])("fails closed on incomplete period/credit receipts %j",async delta=>{
    const db=store();db.rpc.mockResolvedValue({data:{...receipt,...delta},error:null});
    await expect(applyMembershipPaymentConfirmed(db,input)).rejects.toThrow();
  });
  it("acknowledges cancelled/idempotent receipts without treating them as active entitlements",async()=>{
    const db=store();db.rpc.mockResolvedValue({data:{...receipt,subscription_status:"cancelled",welcome_credit_granted:false,idempotent:true},error:null});
    const result=await applyMembershipPaymentConfirmed(db,input);expect(result.subscription_status).toBe("cancelled");expect(result.idempotent).toBe(true);
    expect(db.rpc).toHaveBeenCalledTimes(1);
  });
});
