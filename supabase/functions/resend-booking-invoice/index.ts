import {
  cleanId,
  fail,
  handlePreflight,
  insertOutbox,
  isAdminUser,
  ok,
  readJson,
  requireAuth,
} from "../_shared/action-utils.ts";
import { BOOKING_INVOICE_BUCKET } from "../_shared/invoice.ts";

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const preflight = handlePreflight(req, origin);
  if (preflight) return preflight;

  const auth = await requireAuth(req, origin);
  if (auth.response) return auth.response;
  const { user, supa } = auth as { user: { id: string }; supa: any };

  try {
    const body = await readJson(req);
    const invoiceId = cleanId(body.invoiceId ?? body.invoice_id);
    const bookingId = cleanId(body.bookingId ?? body.booking_id);
    if (!invoiceId && !bookingId) return fail("invoice_id or booking_id required", origin, 400);

    let query = supa
      .from("booking_invoices")
      .select("id,booking_id,user_id,invoice_number,status,currency,total_amount,pdf_bucket,pdf_path,created_at,generated_at,sent_at");
    query = invoiceId ? query.eq("id", invoiceId) : query.eq("booking_id", bookingId);

    const { data: invoice, error } = await query.maybeSingle();
    if (error || !invoice?.id) return fail("invoice not found", origin, 404);

    const admin = await isAdminUser(supa, user.id);
    if (invoice.user_id !== user.id && !admin) return fail("invoice access denied", origin, 403);
    if (!invoice.pdf_path) return fail("invoice PDF has not been generated", origin, 409);
    if (invoice.status === "void") return fail("invoice has been voided", origin, 409);

    await insertOutbox(supa, {
      source_table: "booking_invoices",
      source_id: invoice.id,
      event_type: "booking_invoice_resend",
      channel: "brevo_email",
      owner: "Finance Ops",
      stack_tool: "Supabase Edge invoice worker",
      payload: {
        template: "booking_invoice_resend",
        booking_id: invoice.booking_id,
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        user_id: invoice.user_id,
        pdf_bucket: invoice.pdf_bucket ?? BOOKING_INVOICE_BUCKET,
        pdf_path: invoice.pdf_path,
        total_amount: invoice.total_amount,
        currency: invoice.currency,
      },
      status: "queued",
      approval_required: false,
      created_by: user.id,
    });

    return ok({ invoice_id: invoice.id, queued: true }, origin);
  } catch (error) {
    console.error("resend-booking-invoice failed", error);
    return fail("invoice resend failed", origin, 500);
  }
});
