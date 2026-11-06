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
import { consumeRateLimit } from "../_shared/governance-utils.ts";
import { validateXooterFieldFormats } from "../_shared/xooter-field-validation.ts";
import {
  normaliseEmailForComparison,
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
 * Stable client-facing messages for the machine codes `_shared/xooter-identity.ts` and
 * `_shared/xooter-field-validation.ts` return. The codes are the contract across the wire; the
 * words live here so the client and the audit log agree on what each code means.
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
  reference_1_is_applicant_phone: "Reference 1's phone number is yours — you cannot list yourself as a reference.",
  reference_2_is_applicant_phone: "Reference 2's phone number is yours — you cannot list yourself as a reference.",
  reference_1_is_applicant_email: "Reference 1's email address is yours — you cannot list yourself as a reference.",
  reference_2_is_applicant_email: "Reference 2's email address is yours — you cannot list yourself as a reference.",
  references_duplicate_phone: "List two different references — both share the same phone number.",
  references_duplicate_email: "List two different references — both share the same email address.",
};

const fieldFormatMessages: Record<string, string> = {
  full_name_format: "Enter your first and last name exactly as they appear on your ID.",
  email_format: "Enter a valid email address, e.g. name@example.com.",
  phone_format: "Enter a valid South African phone number, e.g. 082 555 1234.",
  emergency_contact_name_format: "Enter your emergency contact's first and last name.",
  emergency_contact_phone_format: "Enter a valid South African phone number for your emergency contact.",
  address_format: "Enter a complete street address (at least two words, e.g. 12 Oak Avenue).",
  city_format: "Enter a valid city or town name.",
  postal_code_format: "Enter a valid 4-digit South African postal code.",
  bank_name_format: "Enter the name of your bank.",
  bank_account_format: "Enter a valid bank account number (6–17 digits).",
  bank_branch_code_format: "Enter a valid 6-digit branch code.",
  years_experience_format: "Years of experience must be a whole number between 0 and 60.",
  reference_1_phone_format: "Enter a valid South African phone number for Reference 1.",
  reference_1_email_format: "Enter a valid email address for Reference 1.",
  reference_2_phone_format: "Enter a valid South African phone number for Reference 2.",
  reference_2_email_format: "Enter a valid email address for Reference 2.",
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
    reference_1_email: normaliseEmailForComparison(application.reference_1_email) || null,
    reference_2_name: cleanText(application.reference_2_name, 160) || null,
    reference_2_phone: cleanText(application.reference_2_phone, 40) || null,
    reference_2_email: normaliseEmailForComparison(application.reference_2_email) || null,
    references_payload: {
      reference_1: {
        name: cleanText(application.reference_1_name, 160) || null,
        phone: cleanText(application.reference_1_phone, 40) || null,
        email: normaliseEmailForComparison(application.reference_1_email) || null,
        relationship: referenceRelationship(application.reference_1_relationship) || null,
      },
      reference_2: {
        name: cleanText(application.reference_2_name, 160) || null,
        phone: cleanText(application.reference_2_phone, 40) || null,
        email: normaliseEmailForComparison(application.reference_2_email) || null,
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
    "reference_1_email",
    "reference_1_relationship",
    "reference_2_name",
    "reference_2_phone",
    "reference_2_email",
    "reference_2_relationship",
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
 * and on the normalised email, and excludes the applicant's own application, which carries
 * their own identifiers by definition.
 */
const findUnverifiedApplicantReferences = async (
  supa: ReturnType<typeof getServiceClient>,
  applicantUserId: string,
  referencePhones: string[],
  referenceEmails: string[],
) => {
  const matches = new Set<string>(); // normalised phone (last 9) or email
  const phoneVariants = new Set<string>();
  const emailVariants = new Set<string>();
  for (const phone of referencePhones) {
    const trimmed = String(phone ?? "").trim();
    if (!trimmed) continue;
    const last9 = normalisePhoneForComparison(trimmed);
    if (!last9) continue;
    phoneVariants.add(trimmed);
    phoneVariants.add(`0${last9}`);
    phoneVariants.add(`+27${last9}`);
    phoneVariants.add(`27${last9}`);
  }
  for (const email of referenceEmails) {
    const normalised = normaliseEmailForComparison(email);
    if (normalised) emailVariants.add(normalised);
  }

  /*
   * Two separate queries rather than one PostgREST `or=(phone.in.(…),email.in.(…))`: an empty
   * `in.` list is invalid PostgREST syntax, and a phone variant like "+2782…" needs different
   * quoting than an email. Simple, boring, and each query only runs when it has values.
   */
  if (phoneVariants.size > 0) {
    const { data: byPhone } = await supa
      .from("xooter_applications")
      .select("user_id,phone,status")
      .in("phone", [...phoneVariants]);
    for (const application of byPhone ?? []) {
      if (application.user_id === applicantUserId) continue;
      if (String(application.status ?? "") === "approved") continue;
      const last9 = normalisePhoneForComparison(application.phone);
      if (last9) matches.add(last9);
    }
  }
  if (emailVariants.size > 0) {
    const { data: byEmail } = await supa
      .from("xooter_applications")
      .select("user_id,email,status")
      .in("email", [...emailVariants]);
    for (const application of byEmail ?? []) {
      if (application.user_id === applicantUserId) continue;
      if (String(application.status ?? "") === "approved") continue;
      const email = normaliseEmailForComparison(application.email);
      if (email) matches.add(email);
    }
  }
  return matches;
};

/**
 * A storage path a client may register against an application: the applicant's own folder
 * inside kyc-docs, one safe filename segment, no traversal, no absolute path, no scheme.
 * Until this check existed the document branch accepted any 300-character string — including
 * a path inside ANOTHER applicant's folder — and the review surface would faithfully render
 * someone else's KYC documents against this application.
 */
const isOwnStoragePath = (storagePath: string, userId: string) => {
  if (!storagePath || storagePath.length > 300) return false;
  if (storagePath.includes("..")) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(storagePath)) return false;
  if (storagePath.startsWith("/")) return false;
  if (!/^[A-Za-z0-9/._-]+$/.test(storagePath)) return false;
  return storagePath.startsWith(`${userId}/`);
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
    if (!body || typeof body !== "object" || Object.keys(body).length === 0) {
      /*
       * `readJson` returns {} for a body that failed to parse or exceeded the 256 KB bound, and
       * the old code then answered "full_name required" — a confident, wrong diagnosis that sent
       * the applicant hunting for a field they had filled in. Say what actually happened.
       */
      return fail("request body is missing, not valid JSON, or larger than 256 KB", origin, 400);
    }
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
      if (!isOwnStoragePath(storagePath, user.id)) {
        await writeAuditLog(supa, {
          actorId: user.id,
          action: "xooter_document_rejected_path",
          targetTable: "xooter_documents",
          targetId: applicationId,
          changes: { doc_type: docType },
          reason: "Document storage path was outside the applicant's own folder",
          ipAddress: req.headers.get("x-forwarded-for"),
        });
        return fail("document storage path is not valid for this account", origin, 400);
      }
      const { data: application } = await supa
        .from("xooter_applications")
        .select("id,user_id,status")
        .eq("id", applicationId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!application?.id) return fail("application not found", origin, 404);
      if (application.status === "approved") return fail("this application is already approved and can no longer be edited", origin, 409);
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
    if (!applicationBody || typeof applicationBody !== "object") {
      return fail("application payload missing", origin, 400);
    }
    const docs = applicationBody.docs ?? body.docs ?? {};
    const payload = buildApplicationPayload({ ...applicationBody, docs }, user, targetStatus);
    if (!String(payload.full_name ?? "").trim()) return fail("full_name required", origin, 400);

    /*
     * State machine. The upsert keyed on user_id used to accept ANY mode against ANY existing
     * status: an approved Xooter replaying this endpoint with mode "submitted" reset every
     * verification status on their own row to "pending" and their status back to
     * "submitted" — self-service un-approval, one curl away. Approved is terminal; submitted
     * is terminal until a reviewer decides; only drafts and rejections can move.
     */
    const { data: existingApplication } = await supa
      .from("xooter_applications")
      .select("id,status")
      .eq("user_id", user.id)
      .maybeSingle();
    const existingStatus = String(existingApplication?.status ?? "");
    if (existingStatus === "approved") {
      return fail("this application is already approved and can no longer be changed", origin, 409, {
        code: "application_approved",
      });
    }
    if (existingStatus === "submitted" && targetStatus === "draft") {
      return fail("this application is already submitted and is waiting for trust review", origin, 409, {
        code: "application_submitted",
      });
    }
    if (existingStatus === "submitted" && targetStatus === "submitted") {
      return fail("this application has already been submitted. You will be notified once trust review is complete.", origin, 409, {
        code: "application_submitted",
      });
    }

    /*
     * Server-side rate limit. The client's checkRateLimit is UX: clearing storage or calling
     * the endpoint directly bypasses it entirely, and every accepted submit writes a review
     * row, two outbox rows, a notification and an audit row — a spam and log-flood vector.
     * Five submissions per hour per account, enforced in the database where the writes happen.
     */
    const rateLimit = await consumeRateLimit(supa, {
      bucket: "xooter_application",
      actor: user.id,
      action: targetStatus === "submitted" ? "submit" : "draft",
      limitCount: targetStatus === "submitted" ? 5 : 60,
      windowSeconds: 3600,
    });

    if (targetStatus === "submitted") {
      if (!rateLimit.allowed) {
        await writeAuditLog(supa, {
          actorId: user.id,
          action: "xooter_application_rate_limited",
          targetTable: "xooter_applications",
          targetId: existingApplication?.id ?? null,
          changes: { limit: "5 submissions per hour" },
          reason: "Application submission rate limit exceeded",
          ipAddress: req.headers.get("x-forwarded-for"),
        });
        return fail("Too many application submissions. Please wait before trying again.", origin, 429, {
          code: "rate_limited",
        });
      }

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
       * Field-format enforcement — the server half of `src/lib/xooter-field-validation.ts`.
       * Presence is already covered by the required-fields check above; this judges the SHAPE
       * of what was sent: email, SA phone numbers, street address, city, 4-digit postal code,
       * bank account and 6-digit branch code, whole-number years of experience. A browser-side
       * format check is a convenience, not a control — this is the control.
       */
      const fieldIssues = validateXooterFieldFormats({
        full_name: payload.full_name,
        email: payload.email,
        phone: payload.phone,
        emergency_contact_name: payload.emergency_contact_name,
        emergency_contact_phone: payload.emergency_contact_phone,
        address: payload.address,
        city: payload.city,
        postal_code: payload.postal_code,
        bank_name: payload.bank_name,
        bank_account_number: payload.bank_account_number,
        bank_branch_code: payload.bank_branch_code,
        years_experience: applicationBody.years_experience,
        reference_1_phone: payload.reference_1_phone,
        reference_1_email: payload.reference_1_email,
        reference_2_phone: payload.reference_2_phone,
        reference_2_email: payload.reference_2_email,
      });
      if (fieldIssues.length) {
        const first = fieldIssues[0];
        await writeAuditLog(supa, {
          actorId: user.id,
          action: "xooter_application_field_format_rejected",
          targetTable: "xooter_applications",
          targetId: null,
          changes: { issues: fieldIssues },
          reason: "Field format validation failed at submit",
          ipAddress: req.headers.get("x-forwarded-for"),
        });
        return fail(fieldFormatMessages[first.code] ?? "Please check the format of your application details.", origin, 400, {
          code: first.code,
          field: first.field,
          issues: fieldIssues,
        });
      }

      /*
       * Reference enforcement, part 1 — shape. Self-reference is detected by PHONE and EMAIL
       * (the applicant's contact email and the email on their Xoot account), never by name:
       * strangers share names and a self-referencing applicant can simply retype one. Both
       * references must also be different people, by phone or by email.
       */
      const referenceReasons = validateReferenceShape({
        applicantPhone: payload.phone,
        applicantEmail: payload.email,
        applicantAuthEmail: user.email ?? null,
        reference1Phone: payload.reference_1_phone,
        reference1Email: payload.reference_1_email,
        reference2Phone: payload.reference_2_phone,
        reference2Email: payload.reference_2_email,
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
      ], [
        String(payload.reference_1_email ?? ""),
        String(payload.reference_2_email ?? ""),
      ]);
      if (unverifiedReferences.size > 0) {
        await writeAuditLog(supa, {
          actorId: user.id,
          action: "xooter_application_reference_rejected",
          targetTable: "xooter_applications",
          targetId: null,
          changes: { reasons: ["reference_is_unverified_applicant"], matched: [...unverifiedReferences] },
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
    if (error || !data?.id) throw new Error(`xooter application upsert failed: ${error?.message ?? "no row returned"}`);

    if (targetStatus === "submitted") {
      /*
       * A fresh submission starts a fresh review cycle: the previous cycle's reviewer stamp
       * (notes, reviewer, timestamp) belonged to the application they rejected, not to this
       * one. Cleared here so a reviewer never mistakes last cycle's notes for this cycle's
       * decision.
       */
      await supa.from("xooter_applications").update({
        id_verification_status: "pending",
        selfie_verification_status: "pending",
        address_verification_status: "pending",
        banking_verification_status: "pending",
        reference_verification_status: "pending",
        background_check_status: "pending",
        third_party_verification_status: "pending",
        reviewer_notes: null,
        reviewed_by: null,
        reviewed_at: null,
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
    /*
     * The 500 used to be a fixed sentence, identical for every cause, with the detail only in
     * Edge Function logs nobody was reading — the exact shape of "Edge function returned a
     * non-2xx code" that could not be diagnosed from the outside. Now: a reference ID in the
     * response the applicant can quote, the same ID in the log line, and the real error
     * recorded in the audit trail with the failing action attached.
     */
    const reference = crypto.randomUUID();
    console.error(`submit-xooter-application failed [${reference}]`, error);
    try {
      await writeAuditLog(supa, {
        actorId: user?.id ?? null,
        action: "submit_xooter_application_error",
        targetTable: "xooter_applications",
        targetId: null,
        changes: { error_reference: reference, message: String((error as Error)?.message ?? error).slice(0, 400) },
        reason: "Edge Function threw while processing an application action",
        ipAddress: req.headers.get("x-forwarded-for"),
      });
    } catch {
      // Never let audit-logging failure mask the original error response.
    }
    return fail("Something went wrong while saving your application. Quote this reference when contacting support.", origin, 500, {
      code: "server_error",
      error_reference: reference,
    });
  }
});
