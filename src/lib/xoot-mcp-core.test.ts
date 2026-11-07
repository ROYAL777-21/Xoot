import { describe, expect, it } from "vitest";
import { handleMcpMessage, XOOT_TOOLS } from "../../supabase/functions/xoot-mcp/core.ts";

const call = (name: string, args: Record<string, unknown> = {}) =>
  handleMcpMessage({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } });

const contents = (response: ReturnType<typeof call>) => {
  if (!response || !("result" in response) || !response.result) throw new Error("Missing result");
  return (response.result as { structuredContent: Record<string, unknown> }).structuredContent;
};

describe("Xoot public MCP tools", () => {
  it("offers only read-only tools with usable JSON schemas", () => {
    expect(XOOT_TOOLS.map(t => t.name)).toEqual([
      "get_xoot_overview", "list_xoot_services", "get_xoot_base_price", "get_xoot_booking_link",
    ]);
    for (const tool of XOOT_TOOLS) {
      expect(tool.annotations.readOnlyHint).toBe(true);
      expect(tool.annotations.destructiveHint).toBe(false);
      expect(tool.inputSchema.type).toBe("object");
    }
  });

  it("uses the server-authoritative price ladder, never returns a final quote", () => {
    const data = contents(call("get_xoot_base_price", { service_type: "regular", hours: 4 }));
    expect(data.basePriceCents).toBe(25000);
    expect(data.nonMemberBookingFeeCents).toBe(3900);
    expect(data.isFinalQuote).toBe(false);
    expect(data.booking).toBe("https://xoot.co.za/auth");
  });

  it("rejects invalid durations rather than interpolating prices", () => {
    const response = call("get_xoot_base_price", { service_type: "express", hours: 4 });
    expect((response?.result as { isError: boolean }).isError).toBe(true);
    expect(contents(response).error).toMatch(/not on Xoot/);
  });

  it("rejects unknown service identifiers and invalid hours", () => {
    for (const args of [
      { service_type: "unsafe", hours: 4 },
      { service_type: "regular", hours: Number.NaN },
      { service_type: "regular", hours: -100 },
    ]) {
      const response = call("get_xoot_base_price", args);
      expect((response?.result as { isError: boolean }).isError).toBe(true);
    }
  });

  it("does not support booking, payments, or sensitive operations", () => {
    const response = call("create_booking", { address: "Private home", payment: "123" });
    expect(response?.error?.code).toBe(-32602);
    const data = contents(call("get_xoot_booking_link"));
    expect(data.note).toMatch(/No booking/);
  });

  it("supports MCP initialization and notification semantics", () => {
    const result = handleMcpMessage({
      jsonrpc: "2.0", id: "abc", method: "initialize", params: { protocolVersion: "2025-06-18" },
    });
    expect((result?.result as { protocolVersion: string }).protocolVersion).toBe("2025-06-18");
    expect(handleMcpMessage({ jsonrpc: "2.0", method: "notifications/initialized" })).toBeNull();
    expect(handleMcpMessage({ jsonrpc: "2.0", id: 3, method: "tools/list" })?.result).toHaveProperty("tools");
  });
});
