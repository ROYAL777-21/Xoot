import { readFileSync } from "node:fs";
import { describe,expect,it } from "vitest";
import { bookableHours, parseChoice, quoteOneWorker } from "../../supabase/functions/xoot-mcp/commerce-policy.ts";

const validDate = () => {
  const d = new Date(Date.now() + 20 * 86400000);
  return d.toLocaleDateString("en-CA",{ timeZone:"Africa/Johannesburg",year:"numeric",month:"2-digit",day:"2-digit" });
};
const proposal = () => ({
  service_type:"regular",hours:4,date:validDate(),time:"09:00",
  saved_address_id:"de305d54-75b4-431b-adb2-eb6b9e546014",
  booking_cover_opt_in:false,idempotency_key:"safe-unique-key-123456",
});
const source=(path:string)=>readFileSync(path,"utf8");

describe("Xoot MCP booking commerce",()=>{
  it("accepts an approved one-worker 4 hour booking within the booking horizon",()=>{
    expect(parseChoice(proposal())).toEqual(proposal());
  });
  it("refuses invalid service, negative duration and impossible dates",()=>{
    expect(parseChoice({...proposal(),service_type:"laundry"})).toBeNull();
    expect(parseChoice({...proposal(),hours:4.3})).toBeNull();
    expect(parseChoice({...proposal(),time:"02:00"})).toBeNull();
    expect(parseChoice({...proposal(),date:"2020-01-01"})).toBeNull();
    expect(parseChoice({...proposal(),idempotency_key:"guess"})).toBeNull();
    expect(parseChoice({...proposal(),booking_cover_opt_in:"yes"})).toBeNull();
  });
  it("matches server pricing with explicit cover and exact cents",()=>{
    const noCover=quoteOneWorker("regular",4,"09:00",0,false);
    expect(noCover?.base_cents).toBe(25000);
    expect(noCover?.booking_fee_cents).toBe(3900);
    expect(noCover?.cover_cents).toBe(0);
    expect(noCover?.total_cents).toBe(28900);
    const withCover=quoteOneWorker("regular",4,"09:00",0,true);
    expect(withCover?.total_cents).toBe(31100);
    expect(withCover?.cover_cents).toBe(2200);
  });
  it("applies Care+ waiver and discount; high demand fee on 16:00 slots",()=>{
    const q=quoteOneWorker("regular",4,"16:00",0.1,false);
    expect(q?.booking_fee_cents).toBe(0);
    expect(q?.membership_discount_cents).toBe(2500);
    expect(q?.high_demand_cents).toBe(3800);
    expect(q?.total_cents).toBe(26300);
  });
  it("never interpolates unsupported service hours",()=>{
    expect(bookableHours("regular")).toContain(4);
    expect(bookableHours("express")).not.toContain(4);
    expect(quoteOneWorker("express",4,"09:00",0,false)).toBeNull();
  });
  it("makes customer authentication mandatory and rejects reuse with modified arguments",()=>{
    const code=source("supabase/functions/xoot-mcp/commerce.ts");
    expect(code).toContain('Deno.env.get(RELEASE_FLAG)!=="true"');
    expect(code).toContain("claims.client_id");
    expect(code).toContain("auth.auth.getUser(token)");
    expect(code).toContain('r.saved_address_id===choice.saved_address_id');
    expect(code).toContain('r.booking_cover_opt_in===choice.booking_cover_opt_in');
    expect(code).toContain('.eq("status","prepared").select("id").maybeSingle()');
    expect(code).toContain('row.quote_total_cents)!==args.approved_total_cents');
    expect(code).toContain('"needs_review"');
    expect(code).toContain('row.status==="submitted"');
    expect(code).toContain('address.address');
    expect(code).not.toContain("PAYFAST_PASSPHRASE");
  });
  it("does not collect payment cards, charge inside chat, or use the public endpoint for writes",()=>{
    const code=source("supabase/functions/xoot-mcp/commerce.ts");
    const gateway=source("supabase/functions/xoot-mcp/index.ts");
    expect(code).toContain("checkout_url:");
    expect(code).not.toContain("credit_card");
    expect(code).not.toContain("card_number");
    expect(code).toContain("PayFast");
    expect(gateway).toContain("getCommerceAuth");
    expect(gateway).toContain("XOOT_MCP_COMMERCE_ENABLED");
    expect(gateway).toContain("401,headers");
  });
});
