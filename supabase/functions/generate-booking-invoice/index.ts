import {
  cleanId,
  fail,
  handlePreflight,
  insertNotification,
  insertOutbox,
  isAdminUser,
  ok,
  readJson,
  requireAuth,
} from "../_shared/action-utils.ts";
import {
  BOOKING_INVOICE_BUCKET,
  buildBookingInvoiceSnapshot,
  normaliseVatRate,
  renderBookingInvoicePdf,
} from "../_shared/invoice.ts";

const invoiceReadyStatuses = new Set(["completed", "rated"]);
const paidStatuses = new Set(["paid", "admin_confirmed"]);

const getInvoiceLegalConfig = () => {
  const legalEntityName = (Deno.env.get("XOOT_INVOICE_LEGAL_ENTITY") ?? "").trim();
  const legalEntityRegistration = (Deno.env.get("XOOT_INVOICE_LEGAL_ENTITY_REGISTRATION") ?? "2026/709372/07").trim();
  const vatRate = normaliseVatRate(Deno.env.get("XOOT_INVOICE_VAT_RATE") ?? "0");
  const vatNumber = (Deno.env.get("XOOT_INVOICE_VAT_NUMBER") ?? "").trim();

  if (!legalEntityName) return { ok: false as const, error: "invoice legal entity is not configured" };
  if (vatRate > 0 && !vatNumber) return { ok: false as const, error: "invoice VAT number is required when VAT rate is configured" };

  return {
    ok: true as const,
    legalEntityName,
    legalEntityRegistration: legalEntityRegistration || "2026/709372/07",
    vatRate,
    vatNumber: vatNumber || null,
  };
};

const getExistingInvoice = async (supa: any, bookingId: string) => {
  const { data, error } = await supa
    .from("booking_invoices")
    .select("*")
    .eq("booking_id", bookingId)
    .maybeSingle();
  if (error) throw new Error(`invoice lookup failed: ${error.message}`);
  return data;
};

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const preflight = handlePreflight(req, origin);
  if (preflight) return preflight;

  const auth = await requireAuth(req, origin);
  if (auth.response) return auth.response;
  const { user, supa } = auth as { user: { id: string }; supa: any };

  try {
    const body = await readJson(req);
    const bookingId = cleanId(body.bookingId ?? body.booking_id);
    if (!bookingId) return fail("booking_id required", origin, 400);

    const config = getInvoiceLegalConfig();
    if (!config.ok) return fail(config.error, origin, 503);

    const { data: booking, error: bookingError } = await supa
      .from("bookings")
      .select("id,user_id,xooter_id,service,service_type,scheduled_at,duration_hours,address,status,price,notes,job_completed_at,completed_at")
      .eq("id", bookingId)
      .maybeSingle();
    if (bookingError || !booking?.id) return fail("booking not found", origin, 404);

    const admin = await isAdminUser(supa, user.id);
    if (booking.user_id !== user.id && !admin) return fail("invoice access denied", origin, 403);
    if (!invoiceReadyStatuses.has(String(booking.status))) return fail("invoice can only be issued after booking completion", origin, 409);

    const existingInvoice = await getExistingInvoice(supa, booking.id);
    if (existingInvoice?.pdf_path) {
      return ok({ invoice: existingInvoice, idempotent: true }, origin);
    }

    const { data: payment, error: paymentError } = await supa
      .from("payment_records")
      .select("id,user_id,booking_id,amount,currency,status,provider,provider_reference,meta,created_at,updated_at")
      .eq("booking_id", booking.id)
      .eq("payment_kind", "booking")
      .in("status", Array.from(paidStatuses))
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (paymentError) return fail("payment lookup failed", origin, 500);
    if (!payment?.id) return fail("confirmed booking payment not found", origin, 409);

    const now = new Date();
    const snapshot = buildBookingInvoiceSnapshot({
      booking,
      payment,
      issuedAt: now,
      legalEntityName: config.legalEntityName,
      legalEntityRegistration: config.legalEntityRegistration,
      vatNumber: config.vatNumber,
      vatRate: config.vatRate,
    });

    const invoiceDraft = existingInvoice ?? (await (async () => {
      const { data, error } = await supa
        .from("booking_invoices")
        .insert({
          booking_id: booking.id,
          user_id: booking.user_id,
          payment_record_id: payment.id,
          invoice_number: snapshot.invoiceNumber,
          status: "queued",
          currency: snapshot.currency,
          subtotal_amount: snapshot.subtotalAmount,
          vat_amount: snapshot.vatAmount,
          total_amount: snapshot.totalAmount,
          vat_rate: snapshot.vatRate,
          legal_entity_name: snapshot.legalEntityName,
          legal_entity_registration: snapshot.legalEntityRegistration,
          vat_number: snapshot.vatNumber,
          line_items: snapshot.lineItems,
          snapshot: snapshot.snapshot,
        })
        .select("*")
        .single();
      if (error) {
        const concurrentInvoice = await getExistingInvoice(supa, booking.id);
        if (concurrentInvoice?.id) return concurrentInvoice;
        throw new Error(`invoice insert failed: ${error.message}`);
      }
      return data;
    })());

    if (!invoiceDraft?.id) return fail("invoice could not be created", origin, 500);

    const generatedAt = now.toISOString();
    const pdfPath = `${booking.user_id}/${invoiceDraft.id}.pdf`;
    const pdfBytes = renderBookingInvoicePdf({
      ...invoiceDraft,
      generated_at: generatedAt,
    });

    const { error: uploadError } = await supa.storage
      .from(BOOKING_INVOICE_BUCKET)
      .upload(pdfPath, new Blob([pdfBytes], { type: "application/pdf" }), {
        contentType: "application/pdf",
        cacheControl: "3600",
        upsert: true,
      });
    if (uploadError) {
      await supa
        .from("booking_invoices")
        .update({ status: "failed", failure_mode: uploadError.message })
        .eq("id", invoiceDraft.id);
      return fail("invoice PDF upload failed", origin, 500);
    }

    const { data: invoice, error: updateError } = await supa
      .from("booking_invoices")
      .update({
        status: "generated",
        pdf_path: pdfPath,
        generated_at: generatedAt,
        failure_mode: null,
      })
      .eq("id", invoiceDraft.id)
      .select("*")
      .single();
    if (updateError || !invoice?.id) return fail("invoice update failed", origin, 500);

    await insertOutbox(supa, {
      source_table: "booking_invoices",
      source_id: invoice.id,
      event_type: "booking_invoice_created",
      channel: "brevo_email",
      owner: "Finance Ops",
      stack_tool: "Supabase Edge invoice worker",
      payload: {
        template: "booking_invoice",
        booking_id: booking.id,
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        user_id: booking.user_id,
        pdf_bucket: BOOKING_INVOICE_BUCKET,
        pdf_path: pdfPath,
        total_amount: invoice.total_amount,
        currency: invoice.currency,
      },
      status: "queued",
      approval_required: false,
      created_by: user.id,
    });

    await insertNotification(supa, {
      userId: booking.user_id,
      kind: "booking_invoice_ready",
      title: "Your Xoot invoice is ready",
      body: "Your completed-booking invoice is available in the Xoot app.",
      link: `/app/bookings/${booking.id}`,
    });

    return ok({ invoice, idempotent: false }, origin, 201);
  } catch (error) {
    console.error("generate-booking-invoice failed", error);
    return fail("invoice generation failed", origin, 500);
  }
});
