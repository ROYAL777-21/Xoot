import {
  cleanArray,
  cleanId,
  cleanText,
  fail,
  handlePreflight,
  insertNotification,
  insertOutbox,
  insertReviewQueue,
  isApprovedLaunchRegion,
  ok,
  readJson,
  requireAuth,
  toNumber,
  writeAuditLog,
} from "../_shared/action-utils.ts";

const docTypes = new Set(["id", "proof_of_residence", "bank_statement", "selfie"]);

const buildApplicationPayload = (application: any, user: any, status: "draft" | "submitted") => {
  const behaviouralScreening = application.behavioural_screening ?? {
    luxury_home: application.luxury_home_answer,
    fragile_items: application.fragile_items_answer,
    punctuality: application.punctuality_answer,
    off_platform: application.off_platform_answer,
  };

  const payload: Record<string, unknown> = {
    user_id: user.id,
    full_name: cleanText(application.full_name, 160),
    phone: cleanText(application.phone, 40) || null,
    email: cleanText(application.email, 255) || user.email || null,
    date_of_birth: cleanText(application.date_of_birth, 20) || null,
    id_number: cleanText(application.id_number, 80) || null,
    suburb: cleanText(application.suburb, 120) || null,
    years_experience: toNumber(application.years_experience, 0),
    transport: cleanText(application.transport, 160) || null,
    supplies_owned: cleanArray(application.supplies_owned, 20, 80),
    pet_comfort: cleanText(application.pet_comfort, 160) || null,
    availability: application.availability ?? { notes: cleanText(application.availability_notes, 500) },
    behavioural_screening: {
      luxury_home: cleanText(behaviouralScreening.luxury_home, 500),
      fragile_items: cleanText(behaviouralScreening.fragile_items, 500),
      punctuality: cleanText(behaviouralScreening.punctuality, 500),
      off_platform: cleanText(behaviouralScreening.off_platform, 500),
    },
    address: cleanText(application.address, 500) || null,
    city: cleanText(application.city, 120) || null,
    postal_code: cleanText(application.postal_code, 40) || null,
    service_category: "cleaning",
    bio: cleanText(application.bio, 1000) || null,
    bank_name: cleanText(application.bank_name, 120) || null,
    bank_account_number: cleanText(application.bank_account_number, 80) || null,
    bank_branch_code: cleanText(application.bank_branch_code, 40) || null,
    emergency_contact_name: cleanText(application.emergency_contact_name, 160) || null,
    emergency_contact_phone: cleanText(application.emergency_contact_phone, 40) || null,
    reference_1_name: cleanText(application.reference_1_name, 160) || null,
    reference_1_phone: cleanText(application.reference_1_phone, 40) || null,
    reference_2_name: cleanText(application.reference_2_name, 160) || null,
    reference_2_phone: cleanText(application.reference_2_phone, 40) || null,
    background_check_consent: application.background_check_consent === true,
    selfie_storage_path: cleanText(application.selfie_storage_path ?? application.docs?.selfie, 300) || null,
    status,
  };
  if (!payload.date_of_birth) delete payload.date_of_birth;
  return payload;
};

const getSubmitMissing = (payload: Record<string, unknown>, docs: Record<string, string>) => {
  const required = [
    "full_name",
    "phone",
    "email",
    "date_of_birth",
    "id_number",
    "suburb",
    "years_experience",
    "transport",
    "pet_comfort",
    "address",
    "city",
    "postal_code",
    "bank_name",
    "bank_account_number",
    "bank_branch_code",
    "emergency_contact_name",
    "emergency_contact_phone",
    "reference_1_name",
    "reference_1_phone",
    "reference_2_name",
    "reference_2_phone",
  ];
  const missing = required.filter((field) => !String(payload[field] ?? "").trim());
  if (!(payload.supplies_owned as string[])?.length) missing.push("supplies_owned");
  if (payload.background_check_consent !== true) missing.push("background_check_consent");
  for (const docType of ["id", "proof_of_residence", "bank_statement", "selfie"]) {
    if (!docs[docType]) missing.push(`document_${docType}`);
  }
  const suburb = String(payload.suburb ?? "");
  if (suburb && !isApprovedLaunchRegion(suburb)) missing.push("approved_launch_suburb");
  return missing;
};

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const preflight = handlePreflight(req, origin);
  if (preflight) return preflight;

  const auth = await requireAuth(req, origin);
  if (auth.response) return auth.response;
  const { user, supa } = auth as { user: any; supa: any };

  try {
    const body = await readJson(req);
    const mode = cleanText(body.mode, 20) || "submitted";

    if (mode === "document") {
      const applicationId = cleanId(body.applicationId ?? body.application_id);
      const docType = cleanText(body.document?.doc_type, 60);
      const storagePath = cleanText(body.document?.storage_path, 300);
      if (!applicationId || !docTypes.has(docType) || !storagePath) return fail("valid document metadata required", origin, 400);
      const { data: application } = await supa
        .from("xooter_applications")
        .select("id,user_id")
        .eq("id", applicationId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!application?.id) return fail("application not found", origin, 404);
      await supa.from("xooter_documents").insert({
        user_id: user.id,
        application_id: application.id,
        doc_type: docType,
        storage_path: storagePath,
        status: "pending",
      });
      if (docType === "selfie") {
        await supa.from("xooter_applications").update({ selfie_storage_path: storagePath }).eq("id", application.id);
      }
      await writeAuditLog(supa, {
        actorId: user.id,
        action: "xooter_document_uploaded",
        targetTable: "xooter_documents",
        targetId: application.id,
        changes: { doc_type: docType },
        reason: "Applicant uploaded KYC document metadata through Edge Function",
        ipAddress: req.headers.get("x-forwarded-for"),
      });
      return ok({ application_id: application.id, doc_type: docType, status: "pending" }, origin);
    }

    const targetStatus = mode === "draft" ? "draft" : "submitted";
    const applicationBody = body.application ?? body;
    const docs = applicationBody.docs ?? body.docs ?? {};
    const payload = buildApplicationPayload({ ...applicationBody, docs }, user, targetStatus);
    if (!String(payload.full_name ?? "").trim()) return fail("full_name required", origin, 400);

    if (targetStatus === "submitted") {
      const missing = getSubmitMissing(payload, docs);
      if (missing.length) return fail("application is missing required fields", origin, 400, { missing });
    }

    const { data, error } = await supa.from("xooter_applications").upsert(payload, {
      onConflict: "user_id",
    }).select("id,status").single();
    if (error || !data?.id) throw new Error("xooter application upsert failed");

    if (targetStatus === "submitted") {
      await supa.from("xooter_applications").update({
        id_verification_status: "pending",
        selfie_verification_status: "pending",
        address_verification_status: "pending",
        banking_verification_status: "pending",
        reference_verification_status: "pending",
        background_check_status: "pending",
        third_party_verification_status: "pending",
        activation_locked_reason: "Verification, MIE screening, and required training must be complete before activation.",
      }).eq("id", data.id);

      await insertNotification(supa, {
        userId: user.id,
        kind: "xooter_application_submitted",
        title: "Application received",
        body: "Our trust team reviews ID, selfie, address, bank, references and background checks before activation.",
        link: "/xooter",
      });
      await insertReviewQueue(supa, {
        queueType: "kyc",
        subjectTable: "xooter_applications",
        subjectId: data.id,
        userId: user.id,
        priority: "normal",
        summary: `KYC review for ${String(payload.full_name ?? "Xooter applicant")}`,
      });
      await insertOutbox(supa, [
        {
          source_table: "xooter_applications",
          source_id: data.id,
          event_type: "mie_screening_requested",
          channel: "mie_screening",
          owner: "Trust & Safety Agent",
          stack_tool: "MIE screening queue",
          payload: { application_id: data.id, suburb: payload.suburb, years_experience: payload.years_experience },
          status: "needs_approval",
          approval_required: true,
          failure_mode: "Keep application pending until manual review is complete.",
          created_by: user.id,
        },
        {
          source_table: "xooter_applications",
          source_id: data.id,
          event_type: "trust_verification_update",
          channel: "brevo_email",
          owner: "Contractor Success Agent",
          stack_tool: "Brevo email queue",
          payload: { application_id: data.id, status: "submitted" },
          status: "queued",
          approval_required: false,
          created_by: user.id,
        },
      ]);
    }

    await writeAuditLog(supa, {
      actorId: user.id,
      action: targetStatus === "draft" ? "save_xooter_application_draft" : "submit_xooter_application",
      targetTable: "xooter_applications",
      targetId: data.id,
      changes: { status: targetStatus },
      reason: targetStatus === "draft" ? "Applicant saved draft through Edge Function" : "Applicant submitted KYC application through Edge Function",
      ipAddress: req.headers.get("x-forwarded-for"),
    });

    return ok({ application_id: data.id, status: targetStatus }, origin);
  } catch (error) {
    console.error("submit-xooter-application failed", error);
    return fail("xooter application action failed", origin, 500);
  }
});
