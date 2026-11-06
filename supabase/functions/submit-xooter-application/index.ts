import {
  cleanArray,
  cleanId,
  cleanText,
  fail,
  getServiceClient,
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
import {
  normalisePhoneForComparison,
  validateReferenceShape,
  validateXooterIdentity,
} from "../_shared/xooter-identity.ts";
import { consumeRateLimit } from "../_shared/governance-utils.ts";

const docTypes = new Set(["id", "proof_of_residence", "bank_statement", "selfie"]);
const allowedRelationships = new Set(["former_employer", "institution", "friend", "colleague"]);

const referenceRelationship = (value: unknown) => {
  const relationship = cleanText(value, 40).toLowerCase().replace(/\s+/g, "_");
  return allowedRelationships.has(relationship) ? relationship : "";
};

/**
 * Stable client-facing messages for the machine codes `_shared/xooter-identity.ts` returns.
 * The codes are the contract across the wire; the words live here so the client and the audit
 * log agree on what each code means.
 */
const identityRejectionMessages: Record<string, string> = {
  date_of_birth_invalid: "Enter a valid date of birth.",
  under_18: "Xooters must be 18 or older to apply.",
  age_implausible: "Please check the date of birth entered.",
  id_number_required: "ID or passport number is required.",
  sa_id_length: "A South African ID number has 13 digits.",
  sa_id_characters: "A South African ID number contains digits only.",
  sa_id_checksum: "That ID number is not valid — check the digits carefully.",
  sa_id_date: "The date of birth inside that ID number is not a real date.",
  sa_id_citizenship: "That ID number is not valid — check the digits carefully.",
  id_dob_mismatch: "The date of birth in your ID number does not match the date of birth you entered.",
  passport_invalid: "Enter a valid passport number (5–20 letters and digits, no spaces).",
};

const referenceRejectionMessages: Record<string, string> = {
  reference_1_is_applicant_phone: "Reference 1 cannot be you.",
  reference_2_is_applicant_phone: "Reference 2 cannot be you.",
  reference_1_is_applicant_name: "Reference 1 cannot be you.",
  reference_2_is_applicant_name: "Reference 2 cannot be you.",
  references_duplicate: "List two different references — the same person cannot be both.",
};

const buildApplicationPayload = (application: any, user: any, status: "draft" | "submitted") => {
  const behaviouralScreening = application.behavioural_screening ?? {
    luxury_home: application.luxury_home_answer,
    fragile_items: application.fragile_items_answer,
    punctuality: application.punctuality_answer,
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
    references_payload: {
      reference_1: {
        name: cleanText(application.reference_1_name, 160) || null,
        phone: cleanText(application.reference_1_phone, 40) || null,
        relationship: referenceRelationship(application.reference_1_relationship) || null,
      },
      reference_2: {
        name: cleanText(application.reference_2_name, 160) || null,
        phone: cleanText(application.reference_2_phone, 40) || null,
        relationship: referenceRelationship(application.reference_2_relationship) || null,
      },
    },
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

/**
 * A reference cannot be someone who is themselves mid-application to become a Xooter.
 *
 * The collusion case this closes: two applicants listing each other as references, which
 * passed every previous check because each phone is a real person with a real name — just not
 * an INDEPENDENT one. A former employer, an institution, a friend outside the pipeline, or an
 * already-approved Xooter are all fine; a draft/submitted/rejected applicant is not.
 *
 * Matching is on the last 9 digits of the phone (so "+27 82…" and "082…" are the same person)
 * and excludes the applicant's own application, which carries their own phone by definition.
 */
const findUnverifiedApplicantReferences = async (
  supa: ReturnType<typeof getServiceClient>,
  applicantUserId: string,
  referencePhones: string[],
) => {
  const matches = new Map<string, string>(); // phone (last 9) -> applicant status
  const variants = new Set<string>();
  for (const phone of referencePhones) {
    const trimmed = String(phone ?? "").trim();
    if (!trimmed) continue;
    const last9 = normalisePhoneForComparison(trimmed);
    if (!last9) continue;
    variants.add(trimmed);
    variants.add(`0${last9}`);
    variants.add(`+27${last9}`);
    variants.add(`27${last9}`);
  }
  if (variants.size === 0) return matches;

  const { data: applications } = await supa
    .from("xooter_applications")
    .select("user_id,phone,status")
    .in("phone", [...variants]);

  for (const application of applications ?? []) {
    if (!application?.phone || application.user_id === applicantUserId) continue;
    if (String(application.status ?? "") === "approved") continue;
    const last9 = normalisePhoneForComparison(application.phone);
    if (last9 && !matches.has(last9)) matches.set(last9, String(application.status ?? "unknown"));
  }
  return matches;
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

    /*
     * Rate limit on SUBMIT only (security round 2): a submission mints an application row, a KYC
     * review-queue entry, an MIE screening outbox row and an email — a scripted caller could
     * flood admin review and the outbox. Draft saves (`mode: "draft"`) stay unlimited so an
     * applicant can save progress as often as they like.
     */
    if (mode !== "draft" && mode !== "document") {
      const submitLimit = await consumeRateLimit(supa, {
        bucket: "applications",
        actor: user.id,
        action: "submit_xooter_application",
        limitCount: 5,
        windowSeconds: 3600,
      });
      if (!submitLimit.allowed) return fail("too many submissions, please wait a moment", origin, 429);
    }

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

      /*
       * Identity enforcement — server-side, because the client's checks are UX rather than
       * controls. Age gate (18–100), SA ID structure (Luhn checksum, embedded date), passport
       * shape, and DOB↔ID correlation. Drafts stay lenient so progress is never blocked;
       * submission is the gate.
       */
      const identityReasons = validateXooterIdentity({
        dateOfBirth: applicationBody.date_of_birth,
        idNumber: applicationBody.id_number,
      });
      if (identityReasons.length) {
        const reason = identityReasons[0];
        await writeAuditLog(supa, {
          actorId: user.id,
          action: "xooter_application_identity_rejected",
          targetTable: "xooter_applications",
          targetId: null,
          changes: { reasons: identityReasons },
          reason: "Identity validation failed at submit",
          ipAddress: req.headers.get("x-forwarded-for"),
        });
        return fail(identityRejectionMessages[reason] ?? "Identity details could not be verified.", origin, 400, {
          code: reason,
        });
      }

      /*
       * Reference enforcement, part 1 — shape (self-reference, duplicate) is database-free.
       * Part 2 (a reference who is an unverified applicant) needs the lookup below. Both run
       * only at submit, not on drafts.
       */
      const referenceReasons = validateReferenceShape({
        applicantName: payload.full_name,
        applicantPhone: payload.phone,
        reference1Name: payload.reference_1_name,
        reference1Phone: payload.reference_1_phone,
        reference2Name: payload.reference_2_name,
        reference2Phone: payload.reference_2_phone,
      });
      if (referenceReasons.length) {
        const reason = referenceReasons[0];
        await writeAuditLog(supa, {
          actorId: user.id,
          action: "xooter_application_reference_rejected",
          targetTable: "xooter_applications",
          targetId: null,
          changes: { reasons: referenceReasons },
          reason: "Reference validation failed at submit",
          ipAddress: req.headers.get("x-forwarded-for"),
        });
        return fail(referenceRejectionMessages[reason] ?? "References could not be accepted.", origin, 400, {
          code: reason,
        });
      }

      const unverifiedReferences = await findUnverifiedApplicantReferences(supa, user.id, [
        String(payload.reference_1_phone ?? ""),
        String(payload.reference_2_phone ?? ""),
      ]);
      if (unverifiedReferences.size > 0) {
        await writeAuditLog(supa, {
          actorId: user.id,
          action: "xooter_application_reference_rejected",
          targetTable: "xooter_applications",
          targetId: null,
          changes: { reasons: ["reference_is_unverified_applicant"], matched: [...unverifiedReferences.keys()] },
          reason: "A reference is a Xoot applicant who has not passed verification",
          ipAddress: req.headers.get("x-forwarded-for"),
        });
        return fail(
          "A reference you listed is still going through Xoot's own verification. References must be people outside that process — a former employer, an institution, or a friend.",
          origin,
          400,
          { code: "reference_is_unverified_applicant" },
        );
      }
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
