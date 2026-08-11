export const BOOKING_INVOICE_BUCKET = "booking-invoices";

export type InvoiceLineItem = {
  label: string;
  quantity: number;
  unit_amount: number;
  total_amount: number;
};

export type BookingInvoiceSnapshotInput = {
  booking: Record<string, any>;
  payment: Record<string, any>;
  issuedAt: Date;
  legalEntityName: string;
  legalEntityRegistration?: string | null;
  vatNumber?: string | null;
  vatRate: number;
};

export type BookingInvoiceSnapshot = {
  invoiceNumber: string;
  currency: string;
  subtotalAmount: number;
  vatAmount: number;
  totalAmount: number;
  vatRate: number;
  legalEntityName: string;
  legalEntityRegistration: string | null;
  vatNumber: string | null;
  lineItems: InvoiceLineItem[];
  snapshot: Record<string, unknown>;
};

const encoder = new TextEncoder();

const cleanText = (value: unknown, maxLength = 240) =>
  typeof value === "string"
    ? value
        .split("")
        .map((character) => {
          const code = character.charCodeAt(0);
          return code <= 31 || code === 127 ? " " : character;
        })
        .join("")
        .replace(/[<>{}`\\]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, maxLength)
    : "";

const toAscii = (value: string) => value.replace(/[^\x20-\x7e]/g, " ");

export const roundMoney = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : 0;
};

export const normaliseVatRate = (value: unknown) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  if (number > 1) return Math.min(number / 100, 1);
  return number;
};

export const buildInvoiceNumber = (bookingId: string, issuedAt: Date) => {
  const date = issuedAt.toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = cleanText(bookingId, 80).replace(/[^a-z0-9]/gi, "").slice(0, 8).toUpperCase();
  return `ZOOT-${date}-${suffix || "BOOKING"}`;
};

export const buildBookingInvoiceSnapshot = ({
  booking,
  payment,
  issuedAt,
  legalEntityName,
  legalEntityRegistration = null,
  vatNumber = null,
  vatRate,
}: BookingInvoiceSnapshotInput): BookingInvoiceSnapshot => {
  const currency = cleanText(payment.currency, 8).toUpperCase() || "ZAR";
  const totalAmount = roundMoney(payment.amount ?? booking.price);
  const normalisedVatRate = normaliseVatRate(vatRate);
  const subtotalAmount = normalisedVatRate > 0
    ? roundMoney(totalAmount / (1 + normalisedVatRate))
    : totalAmount;
  const vatAmount = roundMoney(totalAmount - subtotalAmount);
  const duration = roundMoney(booking.duration_hours ?? 1);
  const serviceLabel = cleanText(booking.service_type ?? booking.service ?? "Xoot cleaning", 80) || "Xoot cleaning";

  const lineItems: InvoiceLineItem[] = [{
    label: `${serviceLabel.replace(/_/g, " ")} service`,
    quantity: duration > 0 ? duration : 1,
    unit_amount: duration > 0 ? roundMoney(subtotalAmount / duration) : subtotalAmount,
    total_amount: subtotalAmount,
  }];

  const snapshot = {
    issued_at: issuedAt.toISOString(),
    booking_id: cleanText(booking.id, 80),
    payment_record_id: cleanText(payment.id, 80) || null,
    user_id: cleanText(booking.user_id ?? payment.user_id, 80),
    service_type: serviceLabel,
    scheduled_at: cleanText(booking.scheduled_at, 80) || null,
    duration_hours: duration,
    service_address: cleanText(booking.address, 240) || null,
    booking_status: cleanText(booking.status, 80) || null,
    payment_status: cleanText(payment.status, 80) || null,
    payment_provider: cleanText(payment.provider, 80) || null,
    provider_reference: cleanText(payment.provider_reference, 120) || null,
  };

  return {
    invoiceNumber: buildInvoiceNumber(cleanText(booking.id, 80), issuedAt),
    currency,
    subtotalAmount,
    vatAmount,
    totalAmount,
    vatRate: normalisedVatRate,
    legalEntityName: cleanText(legalEntityName, 160),
    legalEntityRegistration: cleanText(legalEntityRegistration, 80) || null,
    vatNumber: cleanText(vatNumber, 80) || null,
    lineItems,
    snapshot,
  };
};

const escapePdfText = (value: string) =>
  toAscii(cleanText(value, 260)).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

const formatMoney = (amount: number, currency: string) =>
  `${currency} ${roundMoney(amount).toFixed(2)}`;

export const renderBookingInvoicePdf = (invoice: {
  invoice_number: string;
  created_at?: string | null;
  generated_at?: string | null;
  legal_entity_name: string;
  legal_entity_registration?: string | null;
  vat_number?: string | null;
  currency: string;
  subtotal_amount: number;
  vat_amount: number;
  total_amount: number;
  line_items: InvoiceLineItem[];
  snapshot: Record<string, any>;
}) => {
  const lines = [
    "Xoot invoice",
    `Invoice: ${invoice.invoice_number}`,
    `Issued: ${invoice.generated_at ?? invoice.created_at ?? new Date().toISOString()}`,
    `Supplier: ${invoice.legal_entity_name}`,
    invoice.legal_entity_registration ? `Registration: ${invoice.legal_entity_registration}` : "",
    invoice.vat_number ? `VAT: ${invoice.vat_number}` : "",
    `Booking: ${cleanText(invoice.snapshot?.booking_id, 80)}`,
    `Service: ${cleanText(invoice.snapshot?.service_type, 100)}`,
    invoice.snapshot?.scheduled_at ? `Scheduled: ${cleanText(invoice.snapshot.scheduled_at, 80)}` : "",
    invoice.snapshot?.service_address ? `Service address: ${cleanText(invoice.snapshot.service_address, 180)}` : "",
    "",
    "Line items",
    ...invoice.line_items.map((item) =>
      `${item.label} x ${item.quantity} - ${formatMoney(item.total_amount, invoice.currency)}`
    ),
    "",
    `Subtotal: ${formatMoney(invoice.subtotal_amount, invoice.currency)}`,
    `VAT: ${formatMoney(invoice.vat_amount, invoice.currency)}`,
    `Total paid: ${formatMoney(invoice.total_amount, invoice.currency)}`,
    "",
    "Thank you for choosing Xoot.",
  ].filter((line) => line.length > 0);

  const textCommands = lines
    .slice(0, 34)
    .map((line, index) => {
      const prefix = index === 0 ? "50 790 Td" : "0 -18 Td";
      const size = index === 0 ? "/F1 18 Tf" : index === 1 ? "/F1 12 Tf" : "";
      return `${size ? `${size}\n` : ""}${prefix}\n(${escapePdfText(line)}) Tj`;
    })
    .join("\n");

  const stream = `BT\n/F1 12 Tf\n${textCommands}\nET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(encoder.encode(pdf).length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = encoder.encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return encoder.encode(pdf);
};
