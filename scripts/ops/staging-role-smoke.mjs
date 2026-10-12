#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";

const STAGING_PROJECT_REF = "fxmxyabdjqviqbcxmvlp";
const SMOKE_TAG = "XOOT_PHASE1_ROLE_SMOKE";
const CHAT_SMOKE_FLAG = "xoot_phase2_booking_chat_smoke";
const POLL_INTERVAL_MS = 5_000;
const NOTIFICATION_TIMEOUT_MS = 90_000;

const args = new Set(process.argv.slice(2));
const mode = args.has("--all") ? "all" : args.has("--seed") ? "seed" : args.has("--test") ? "test" : "";

const fail = (message) => {
  console.error(`Xoot staging smoke error: ${message}`);
  process.exit(1);
};

const info = (message) => {
  console.log(`[xoot-smoke] ${message}`);
};

if (!mode) {
  fail("Pass one mode: --seed, --test, or --all.");
}

const env = (name) => String(process.env[name] ?? "").trim();
const requiredEnv = [
  "XOOT_STAGING_SUPABASE_URL",
  "XOOT_STAGING_SUPABASE_PUBLISHABLE_KEY",
  "XOOT_STAGING_SERVICE_ROLE_KEY",
  "XOOT_SMOKE_CLIENT_EMAIL",
  "XOOT_SMOKE_CLIENT_PASSWORD",
  "XOOT_SMOKE_ADMIN_EMAIL",
  "XOOT_SMOKE_ADMIN_PASSWORD",
  "XOOT_SMOKE_XOOTER_EMAIL",
  "XOOT_SMOKE_XOOTER_PASSWORD",
];

for (const name of requiredEnv) {
  if (!env(name)) fail(`Missing ${name}. Do not paste secrets into chat; set it in your local shell.`);
}

if (env("XOOT_ALLOW_STAGING_SMOKE") !== "true") {
  fail("Set XOOT_ALLOW_STAGING_SMOKE=true to confirm this should modify staging test data.");
}

const stagingUrl = env("XOOT_STAGING_SUPABASE_URL");
const stagingHost = new URL(stagingUrl).hostname;
if (stagingHost !== `${STAGING_PROJECT_REF}.supabase.co`) {
  fail(`Refusing to run outside staging project ${STAGING_PROJECT_REF}. Got host ${stagingHost}.`);
}

const emails = [
  env("XOOT_SMOKE_CLIENT_EMAIL").toLowerCase(),
  env("XOOT_SMOKE_ADMIN_EMAIL").toLowerCase(),
  env("XOOT_SMOKE_XOOTER_EMAIL").toLowerCase(),
];
if (new Set(emails).size !== emails.length) {
  fail("Smoke client/admin/Xooter emails must be three distinct staging-only accounts.");
}

const authOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
};

const service = createClient(stagingUrl, env("XOOT_STAGING_SERVICE_ROLE_KEY"), authOptions);
const makeUserClient = () => createClient(stagingUrl, env("XOOT_STAGING_SUPABASE_PUBLISHABLE_KEY"), authOptions);

const maskEmail = (email) => {
  const [name, domain] = email.split("@");
  return `${name.slice(0, 2)}***@${domain}`;
};

const assertNoError = (label, error) => {
  if (error) fail(`${label}: ${error.message ?? String(error)}`);
};

const expect = (condition, message) => {
  if (!condition) fail(message);
};

const findUserByEmail = async (email) => {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 100 });
    assertNoError("list auth users", error);
    const users = data?.users ?? [];
    const found = users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (users.length < 100) return null;
  }
  return null;
};

const upsertProfile = async (userId, fullName, address) => {
  const { error } = await service.from("profiles").upsert(
    {
      id: userId,
      full_name: fullName,
      address,
      phone: "+27000000000",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  assertNoError(`upsert profile ${fullName}`, error);
};

const upsertRole = async (userId, role) => {
  const { error } = await service.from("user_roles").upsert(
    {
      user_id: userId,
      role,
    },
    { onConflict: "user_id,role" },
  );
  assertNoError(`upsert role ${role}`, error);
};

const ensureUser = async ({ email, password, fullName, role }) => {
  const existing = await findUserByEmail(email);
  if (existing?.id) {
    const { data, error } = await service.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, xoot_smoke: true },
      app_metadata: { xoot_smoke: true },
    });
    assertNoError(`update auth user ${maskEmail(email)}`, error);
    await upsertProfile(existing.id, fullName, "1 Smoke Test Lane, Bryanston");
    await upsertRole(existing.id, role);
    return data.user;
  }

  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, xoot_smoke: true },
    app_metadata: { xoot_smoke: true },
  });
  assertNoError(`create auth user ${maskEmail(email)}`, error);
  await upsertProfile(data.user.id, fullName, "1 Smoke Test Lane, Bryanston");
  await upsertRole(data.user.id, role);
  return data.user;
};

const ensureSingleByFilter = async ({ table, select, filters, insert, update }) => {
  let query = service.from(table).select(select).limit(1);
  for (const [column, value] of Object.entries(filters)) {
    query = query.eq(column, value);
  }

  const { data: existing, error: readError } = await query.maybeSingle();
  assertNoError(`read ${table}`, readError);

  if (existing?.id) {
    const { data, error } = await service.from(table).update(update).eq("id", existing.id).select(select).single();
    assertNoError(`update ${table}`, error);
    return data;
  }

  const { data, error } = await service.from(table).insert(insert).select(select).single();
  assertNoError(`insert ${table}`, error);
  return data;
};

const seed = async () => {
  info("Creating or updating staging-only smoke users.");
  const client = await ensureUser({
    email: env("XOOT_SMOKE_CLIENT_EMAIL"),
    password: env("XOOT_SMOKE_CLIENT_PASSWORD"),
    fullName: "Xoot Smoke Client",
    role: "user",
  });
  const admin = await ensureUser({
    email: env("XOOT_SMOKE_ADMIN_EMAIL"),
    password: env("XOOT_SMOKE_ADMIN_PASSWORD"),
    fullName: "Xoot Smoke Admin",
    role: "admin",
  });
  const xooterUser = await ensureUser({
    email: env("XOOT_SMOKE_XOOTER_EMAIL"),
    password: env("XOOT_SMOKE_XOOTER_PASSWORD"),
    fullName: "Xoot Smoke Xooter",
    role: "xooter",
  });

  const xooter = await ensureSingleByFilter({
    table: "xooters",
    select: "id,user_id",
    filters: { user_id: xooterUser.id },
    insert: {
      user_id: xooterUser.id,
      name: "Xoot Smoke Xooter",
      role: "cleaning",
      hourly_rate: 120,
      active: true,
      verified: true,
      background_checked: true,
      background_check_status: "passed",
      tags: ["smoke-test"],
      suburb_coverage: ["Bryanston"],
      supplies_owned: ["Standard kit"],
      languages_spoken: ["English"],
      reliability_flagged: false,
    },
    update: {
      name: "Xoot Smoke Xooter",
      active: true,
      verified: true,
      background_checked: true,
      background_check_status: "passed",
      reliability_flagged: false,
    },
  });

  const household = await ensureSingleByFilter({
    table: "household_profiles",
    select: "id,user_id",
    filters: { user_id: client.id, label: "Smoke test home" },
    insert: {
      user_id: client.id,
      label: "Smoke test home",
      address: "1 Smoke Test Lane, Bryanston, Johannesburg",
      gate_code: "SMOKE-GATE",
      alarm_code: "SMOKE-ALARM",
      access_instructions: "Smoke fixture access instructions",
      parking_instructions: "Smoke fixture parking bay",
      pet_notes: "No pets in smoke fixture",
      is_default: true,
    },
    update: {
      address: "1 Smoke Test Lane, Bryanston, Johannesburg",
      gate_code: "SMOKE-GATE",
      alarm_code: "SMOKE-ALARM",
      access_instructions: "Smoke fixture access instructions",
      parking_instructions: "Smoke fixture parking bay",
      pet_notes: "No pets in smoke fixture",
      is_default: true,
      updated_at: new Date().toISOString(),
    },
  });

  const scheduledAt = new Date(Date.now() + 20 * 60_000).toISOString();
  const booking = await ensureSingleByFilter({
    table: "bookings",
    select: "id,user_id,xooter_id,household_profile_id,scheduled_at,status",
    filters: { user_id: client.id, notes: `${SMOKE_TAG}: accepted-job destination and sensitive-access fixture` },
    insert: {
      user_id: client.id,
      xooter_id: xooter.id,
      household_profile_id: household.id,
      service: "cleaning",
      service_type: "residential",
      scheduled_at: scheduledAt,
      duration_hours: 2,
      address: "1 Smoke Test Lane, Bryanston, Johannesburg",
      status: "assigned",
      price: 450,
      notes: `${SMOKE_TAG}: accepted-job destination and sensitive-access fixture`,
      assigned_at: new Date().toISOString(),
      sensitive_data_revoked_at: null,
      sensitive_access_available_notified_at: null,
      cancelled_at: null,
      completed_at: null,
      job_completed_at: null,
    },
    update: {
      xooter_id: xooter.id,
      household_profile_id: household.id,
      scheduled_at: scheduledAt,
      address: "1 Smoke Test Lane, Bryanston, Johannesburg",
      status: "assigned",
      assigned_at: new Date().toISOString(),
      sensitive_data_revoked_at: null,
      sensitive_access_available_notified_at: null,
      cancelled_at: null,
      completed_at: null,
      job_completed_at: null,
      updated_at: new Date().toISOString(),
    },
  });

  await ensureSingleByFilter({
    table: "xooter_jobs",
    select: "id,booking_id,xooter_id,state",
    filters: { booking_id: booking.id, xooter_id: xooter.id },
    insert: {
      booking_id: booking.id,
      xooter_id: xooter.id,
      state: "accepted",
      offered_at: new Date().toISOString(),
      responded_at: new Date().toISOString(),
    },
    update: {
      state: "accepted",
      responded_at: new Date().toISOString(),
      decline_reason: null,
    },
  });

  info(`Seed complete for ${maskEmail(env("XOOT_SMOKE_CLIENT_EMAIL"))}, ${maskEmail(env("XOOT_SMOKE_ADMIN_EMAIL"))}, and ${maskEmail(env("XOOT_SMOKE_XOOTER_EMAIL"))}.`);
  info("Cron may take up to one minute to create the sensitive-access notification.");
};

const signIn = async (email, password) => {
  const client = makeUserClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  assertNoError(`sign in ${maskEmail(email)}`, error);
  return client;
};

const getFixture = async () => {
  const { data: booking, error } = await service
    .from("bookings")
    .select("id,user_id,xooter_id,status")
    .eq("notes", `${SMOKE_TAG}: accepted-job destination and sensitive-access fixture`)
    .maybeSingle();
  assertNoError("read smoke booking", error);
  expect(booking?.id, "Smoke booking fixture is missing. Run --seed first.");

  const { data: xooter, error: xooterError } = await service
    .from("xooters")
    .select("id,user_id")
    .eq("id", booking.xooter_id)
    .maybeSingle();
  assertNoError("read smoke xooter", xooterError);
  expect(xooter?.user_id, "Smoke xooter fixture is missing a user_id.");

  return { booking, xooter };
};

const invoke = async (client, functionName, body = {}) => {
  const { data, error } = await client.functions.invoke(functionName, { body });
  return { data, error };
};

const makeSmokeEnvelope = () => {
  const payload = Buffer.from(
    JSON.stringify({
      smoke: true,
      flag: CHAT_SMOKE_FLAG,
      created_at: new Date().toISOString(),
    }),
  ).toString("base64url");

  return `xoot:e2ee:v1:${payload}`;
};

const testBookingChatActionLayer = async ({ booking, client, xooter, admin }) => {
  const encryptedBody = makeSmokeEnvelope();
  const sendResult = await invoke(client, "send-booking-message", {
    booking_id: booking.id,
    encrypted_body: encryptedBody,
    client_message_id: crypto.randomUUID(),
    client_safety_flags: [],
  });
  assertNoError("send-booking-message", sendResult.error);

  const message = sendResult.data?.data?.message;
  expect(message?.id, "send-booking-message did not return a message id.");
  expect(message.booking_id === booking.id, "send-booking-message returned a message for the wrong booking.");
  expect(message.sender_type === "user", "send-booking-message did not record the client sender type.");
  expect(message.body === encryptedBody, "send-booking-message did not preserve the encrypted envelope.");

  const directInsert = await client.from("messages").insert({
    booking_id: booking.id,
    sender_type: "user",
    sender_user_id: message.sender_user_id,
    body: makeSmokeEnvelope(),
    envelope_version: 1,
  });
  expect(directInsert.error, "Client could still insert public.messages directly after Phase 2 hardening.");

  const xooterRead = await xooter
    .from("messages")
    .select("id,booking_id,body,sender_type,moderation_state")
    .eq("id", message.id)
    .maybeSingle();
  assertNoError("xooter reads booking chat message", xooterRead.error);
  expect(xooterRead.data?.body === encryptedBody, "Assigned Xooter could not read the encrypted booking chat envelope.");

  const receiptResult = await invoke(xooter, "mark-booking-message-read", {
    booking_id: booking.id,
    message_ids: [message.id],
  });
  assertNoError("mark-booking-message-read", receiptResult.error);
  expect(receiptResult.data?.data?.marked === 1, "mark-booking-message-read did not mark the smoke message.");

  const reportResult = await invoke(xooter, "report-booking-message", {
    message_id: message.id,
    reason: "Smoke test booking chat report",
    details: `${CHAT_SMOKE_FLAG}: verifies report queue path for staging only`,
  });
  assertNoError("report-booking-message", reportResult.error);
  const report = reportResult.data?.data?.report;
  expect(report?.id, "report-booking-message did not return a report id.");
  expect(report.message_id === message.id, "report-booking-message linked the report to the wrong message.");

  const adminQueue = await admin
    .from("admin_review_queue")
    .select("id,queue_type,subject_table,subject_id,booking_id")
    .eq("queue_type", "booking_chat_report")
    .eq("subject_id", message.id)
    .maybeSingle();
  assertNoError("admin review queue booking chat report", adminQueue.error);
  expect(adminQueue.data?.subject_table === "messages", "Booking chat report did not create a messages admin review queue item.");

  info("Booking chat action-layer smoke passed: Edge send, direct insert denial, read receipt, and report queue.");
};

const waitForNotification = async (xooterClient) => {
  const started = Date.now();
  while (Date.now() - started <= NOTIFICATION_TIMEOUT_MS) {
    const { data, error } = await xooterClient
      .from("notifications")
      .select("id,kind,title,link")
      .eq("kind", "sensitive_access_available")
      .limit(10);
    assertNoError("read xooter notifications", error);
    if ((data ?? []).some((item) => item.kind === "sensitive_access_available" && item.link === "/xooter/jobs")) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  return false;
};

const test = async () => {
  const { booking } = await getFixture();
  const client = await signIn(env("XOOT_SMOKE_CLIENT_EMAIL"), env("XOOT_SMOKE_CLIENT_PASSWORD"));
  const admin = await signIn(env("XOOT_SMOKE_ADMIN_EMAIL"), env("XOOT_SMOKE_ADMIN_PASSWORD"));
  const xooter = await signIn(env("XOOT_SMOKE_XOOTER_EMAIL"), env("XOOT_SMOKE_XOOTER_PASSWORD"));

  const clientControls = await client.from("operational_controls").select("control_key").limit(1);
  expect(clientControls.error || (clientControls.data ?? []).length === 0, "Client user can read admin-only operational controls.");

  const adminControls = await admin.from("operational_controls").select("control_key").limit(1);
  assertNoError("admin operational controls read", adminControls.error);
  expect((adminControls.data ?? []).length > 0, "Admin user could not read operational controls.");

  const clientJobs = await invoke(client, "get-xooter-job-cards");
  expect(clientJobs.error || (clientJobs.data?.data?.jobs ?? []).length === 0, "Client user received Xooter job cards.");

  const xooterJobs = await invoke(xooter, "get-xooter-job-cards");
  assertNoError("xooter job cards function", xooterJobs.error);
  const jobs = xooterJobs.data?.data?.jobs ?? [];
  const smokeJob = jobs.find((job) => job.booking_id === booking.id);
  expect(smokeJob, "Xooter did not receive the accepted smoke job card.");
  expect(smokeJob.state === "accepted", "Smoke job card is not accepted.");
  expect(Boolean(smokeJob.destination_address), "Accepted smoke job did not expose destination_address to the assigned Xooter.");

  const clientSensitive = await invoke(client, "get-sensitive-access", { booking_id: booking.id, field: "gate_code" });
  expect(clientSensitive.error || clientSensitive.data?.success === false, "Client user could reveal Xooter-only sensitive access.");

  const xooterSensitive = await invoke(xooter, "get-sensitive-access", { booking_id: booking.id, field: "gate_code" });
  assertNoError("xooter sensitive access function", xooterSensitive.error);
  expect(xooterSensitive.data?.data?.expires_in_seconds === 30, "Xooter sensitive reveal did not return the 30-second reveal contract.");
  expect(typeof xooterSensitive.data?.data?.value === "string" && xooterSensitive.data.data.value.length > 0, "Xooter sensitive reveal returned an empty value.");

  const hasNotification = await waitForNotification(xooter);
  expect(hasNotification, "Xooter did not receive a sensitive_access_available notification within the polling window.");

  await testBookingChatActionLayer({ booking, client, xooter, admin });

  info("Role smoke tests passed: client/admin/Xooter auth, accepted destination, sensitive reveal, notification delivery, and booking chat action layer.");
};

if (mode === "seed" || mode === "all") {
  await seed();
}

if (mode === "test" || mode === "all") {
  await test();
}
