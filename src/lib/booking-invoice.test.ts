import { describe, expect, it } from "vitest";
import {
  buildBookingInvoiceSnapshot,
  buildInvoiceNumber,
  normaliseVatRate,
  renderBookingInvoicePdf,
} from "../../supabase/functions/_shared/invoice";

describe("booking invoice helpers", () => {
  it("builds deterministic invoice numbers from booking id and issue date", () => {
    expect(buildInvoiceNumber("booking-123456789", new Date("2026-06-29T10:00:00.000Z"))).toBe("XOOT-20260629-BOOKING1");
  });

  it("normalises VAT rates from decimals and percentages", () => {
    expect(normaliseVatRate(0.15)).toBe(0.15);
    expect(normaliseVatRate("15")).toBe(0.15);
    expect(normaliseVatRate(-1)).toBe(0);
  });

  it("captures a point-in-time booking and payment snapshot", () => {
    const invoice = buildBookingInvoiceSnapshot({
      booking: {
        id: "booking-abc",
        user_id: "user-123",
        service_type: "deep_clean",
        scheduled_at: "2026-07-01T08:00:00.000Z",
        duration_hours: 3,
        address: "12 Bath Avenue, Rosebank",
        status: "completed",
      },
      payment: {
        id: "payment-abc",
        amount: 345,
        currency: "zar",
        status: "paid",
        provider: "payfast",
        provider_reference: "provider-ref",
      },
      issuedAt: new Date("2026-06-29T10:00:00.000Z"),
      legalEntityName: "Xoot",
      legalEntityRegistration: null,
      vatNumber: "VAT-123",
      vatRate: 0.15,
    });

    expect(invoice.totalAmount).toBe(345);
    expect(invoice.subtotalAmount).toBe(300);
    expect(invoice.vatAmount).toBe(45);
    expect(invoice.currency).toBe("ZAR");
    expect(invoice.lineItems[0].label).toBe("deep clean service");
    expect(invoice.snapshot.service_address).toBe("12 Bath Avenue, Rosebank");
  });

  it("renders a PDF without leaking unsafe markup", () => {
    const bytes = renderBookingInvoicePdf({
      invoice_number: "XOOT-20260629-BOOKING",
      generated_at: "2026-06-29T10:00:00.000Z",
      legal_entity_name: "Xoot <script>",
      currency: "ZAR",
      subtotal_amount: 300,
      vat_amount: 45,
      total_amount: 345,
      line_items: [{ label: "deep clean service", quantity: 3, unit_amount: 100, total_amount: 300 }],
      snapshot: {
        booking_id: "booking-abc",
        service_type: "deep_clean",
        service_address: "12 Bath Avenue (Rosebank)",
      },
    });
    const pdf = new TextDecoder().decode(bytes);

    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    expect(pdf).toContain("XOOT-20260629-BOOKING");
    expect(pdf).not.toContain("<script>");
  });
});
