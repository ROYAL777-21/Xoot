type EmailPlaybookEntry = {
  template_key: string;
  subject: string;
  preheader: string;
  audience: "client" | "zooter" | "admin";
};

const entries: Record<string, EmailPlaybookEntry> = {
  signup_verification: {
    template_key: "signup_verification",
    subject: "Confirm your Zoot account",
    preheader: "Use the secure Zoot link to finish account verification. Never share OTPs or passwords.",
    audience: "client",
  },
  otp_login: {
    template_key: "otp_login",
    subject: "Your Zoot sign-in code",
    preheader: "Use this only in Zoot. Zoot support will never ask you to send it back in chat.",
    audience: "client",
  },
  booking_confirmed: {
    template_key: "booking_request_received",
    subject: "Your Zoot booking request is in motion",
    preheader: "We received your booking request and will keep payment, assignment and updates inside Zoot.",
    audience: "client",
  },
  payment_pending: {
    template_key: "payment_pending",
    subject: "Complete your Zoot payment",
    preheader: "Your booking or membership activates only after backend payment confirmation.",
    audience: "client",
  },
  payment_confirmed: {
    template_key: "payment_confirmed",
    subject: "Payment received by Zoot",
    preheader: "Open Zoot for the live booking or membership status.",
    audience: "client",
  },
  payment_failed: {
    template_key: "payment_failed",
    subject: "Your Zoot payment needs attention",
    preheader: "No booking or membership benefit activates until payment is confirmed.",
    audience: "client",
  },
  booking_assigned: {
    template_key: "booking_assigned",
    subject: "Your Zooter has been assigned",
    preheader: "Open Zoot for the secure booking details and status.",
    audience: "client",
  },
  zooter_en_route: {
    template_key: "zooter_en_route",
    subject: "Your Zooter is on the way",
    preheader: "Open Zoot for live status. Sensitive access details stay inside the app.",
    audience: "client",
  },
  job_completed: {
    template_key: "job_completed",
    subject: "Your Zoot clean is complete",
    preheader: "Open Zoot to review, manage Care+ or book again.",
    audience: "client",
  },
  care_plus_membership_requested: {
    template_key: "care_plus_membership_requested",
    subject: "Your Care+ membership setup has started",
    preheader: "Care+ activates after payment confirmation, with Home Memory and member benefits ready in the app.",
    audience: "client",
  },
  care_plus_membership_cancelled: {
    template_key: "care_plus_membership_cancelled",
    subject: "Your Care+ membership has ended",
    preheader: "Your Zoot profile remains available if you want to rejoin later.",
    audience: "client",
  },
  care_plus_past_due: {
    template_key: "care_plus_past_due",
    subject: "Care+ payment update needed",
    preheader: "Update payment in Zoot to restore member benefits after confirmation.",
    audience: "client",
  },
  zooter_onboarding_status: {
    template_key: "zooter_onboarding_status",
    subject: "Your Zooter onboarding status changed",
    preheader: "Open Zoot for document, training and verification next steps.",
    audience: "zooter",
  },
  support_escalation: {
    template_key: "support_escalation",
    subject: "Zoot Support is reviewing your case",
    preheader: "A human reviewer will handle sensitive payment, safety, booking or account details in the app.",
    audience: "client",
  },
};

export const buildEmailPayload = (eventType: string, payload: Record<string, unknown>) => {
  const playbook = entries[eventType];

  return {
    ...payload,
    email_template_key: playbook?.template_key ?? eventType,
    email_subject: playbook?.subject ?? "Zoot update",
    email_preheader: playbook?.preheader ?? "Open Zoot for the full secure update.",
    email_audience: playbook?.audience ?? "client",
    email_safety:
      "Email must never include OTPs, passwords, card details, gate codes, alarm codes, lockbox codes, full access instructions, or private household notes.",
    source_of_truth: "Open the authenticated Zoot app for live booking, payment, address, support and sensitive access details.",
  };
};
