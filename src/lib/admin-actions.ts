import { supabase } from "@/integrations/supabase/client";

export async function confirmPaymentAdmin(paymentId: string, reason: string) {
  return supabase.functions.invoke("admin-confirm-payment", {
    body: { payment_id: paymentId, reason },
  });
}

export async function resolveAdminReview(reviewId: string, resolution: string, reason: string) {
  return supabase.functions.invoke("admin-resolve-review", {
    body: { review_id: reviewId, resolution, reason },
  });
}

export async function markOutboxProcessed(outboxId: string, reason: string) {
  return supabase.functions.invoke("admin-mark-outbox", {
    body: { outbox_id: outboxId, reason },
  });
}

export async function escalateSupportCase(ticketId: string, escalation_note: string) {
  return supabase.functions.invoke("admin-escalate-support", {
    body: { ticket_id: ticketId, escalation_note },
  });
}

export async function approveXooterAdmin(applicationId: string, reason: string) {
  return supabase.functions.invoke("approve-zooter", {
    body: { application_id: applicationId, reason },
  });
}

export async function rejectXooterAdmin(applicationId: string, reason: string) {
  return supabase.functions.invoke("admin-reject-zooter", {
    body: { application_id: applicationId, reason },
  });
}
