#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";

const STAGING_PROJECT_REF = "fxmxyabdjqviqbcxmvlp";
const SMOKE_TAG = "ZOOT_PHASE1_ROLE_SMOKE";
const CHAT_SMOKE_FLAG = "zoot_phase2_booking_chat_smoke";
const POLL_INTERVAL_MS = 5_000;
const NOTIFICATION_TIMEOUT_MS = 90_000;

const args = new Set(process.argv.slice(2));
const mode = args.has("--all") ? "all" : args.has("--seed") ? "seed" : args.has("--test") ? "test" : "";

const fail = (message) => {
  console.error(`Zoot staging smoke error: ${message}`);
  process.exit(1);
};

const info = (message) => {
  console.log(`[zoot-smoke] ${message}`);
};

if (!mode) {
  fail("Pass one mode: --seed, --test, or --all.");
}

const env = (name) => String(process.env[name] ?? "").trim();
const requiredEnv = [
  "ZOOT_STAGING_SUPABASE_URL",
  "ZOOT_STAGING_SUPABASE_PUBLISHABLE_KEY",
  "ZOOT_STAGING_SERVICE_ROLE_KEY",
  "ZOOT_SMOKE_CLIENT_EMAIL",
  "ZOOT_SMOKE_CLIENT_PASSWORD",
  "ZOOT_SMOKE_ADMIN_EMAIL",
  "ZOOT_SMOKE_ADMIN_PASSWORD",
  "ZOOT_SMOKE_ZOOTER_EMAIL",
  "ZOOT_SMOKE_ZOOTER_PASSWORD",
];

for (const name of requiredEnv) {
  if (!env(name)) fail(`Missing ${name}. Do not paste secrets into chat; set it in your local shell.`);
}

if (env("ZOOT_ALLOW_STAGING_SMOKE") !== "true") {
  fail("Set ZOOT_ALLOW_STAGING_SMOKE=true to confirm this should modify staging test data.");
}

const stagingUrl = env("ZOOT_STAGING_SUPABASE_URL");
const stagingHost = new URL(stagingUrl).hostname;
if (stagingHost !== `${STAGING_PROJECT_REF}.supabase.co`) {
  fail(`Refusing to run outside staging project ${STAGING_PROJECT_REF}. Got host ${stagingHost}.`);
}

const emails = [
  env("ZOOT_SMOKE_CLIENT_EMAIL").toLowerCase(),
  env("ZOOT_SMOKE_ADMIN_EMAIL").toLowerCase(),
  env("ZOOT_SMOKE_ZOOTER_EMAIL").toLowerCase(),
];
if (new Set(emails).size !== emails.length) {
  fail("Smoke client/admin/Zooter emails must be three distinct staging-only accounts.");
}

const authOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
};

const service = createClient(stagingUrl, env("ZOOT_STAGING_SERVICE_ROLE_KEY"), authOptions);
const makeUserClient = () => createClient(stagingUrl, env("ZOOT_STAGING_SUPABASE_PUBLISHABLE_KEY"), authOptions);

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
      user_metadata: { full_name: fullName, zoot_smoke: true },
      app_metadata: { zoot_smoke: true },
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
    user_metadata: { full_name: fullName, zoot_smoke: true },
    app_metadata: { zoot_smoke: true },
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
    email: env("ZOOT_SMOKE_CLIENT_EMAIL"),
    password: env("ZOOT_SMOKE_CLIENT_PASSWORD"),
    fullName: "Zoot Smoke Client",
    role: "user",
  });
  const admin = await ensureUser({
    email: env("ZOOT_SMOKE_ADMIN_EMAIL"),
    password: env("ZOOT_SMOKE_ADMIN_PASSWORD"),
    fullName: "Zoot Smoke Admin",
    role: "admin",
  });
  const zooterUser = await ensureUser({
    email: env("ZOOT_SMOKE_ZOOTER_EMAIL"),
    password: env("ZOOT_SMOKE_ZOOTER_PASSWORD"),
    fullName: "Zoot Smoke Zooter",
    role: "zooter",
  });

  const zooter = await ensureSingleByFilter({
    table: "zooters",
    select: "id,user_id",
    filters: { user_id: zooterUser.id },
    insert: {
      user_id: zooterUser.id,
      name: "Zoot Smoke Zooter",
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
      name: "Zoot Smoke Zooter",
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
    select: "id,user_id,zooter_id,household_profile_id,scheduled_at,status",
    filters: { user_id: client.id, notes: `${SMOKE_TAG}: accepted-job destination and sensitive-access fixture` },
    insert: {
      user_id: client.id,
      zooter_id: zooter.id,
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
      zooter_id: zooter.id,
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
    table: "zooter_jobs",
    select: "id,booking_id,zooter_id,state",
    filters: { booking_id: booking.id, zooter_id: zooter.id },
    insert: {
      booking_id: booking.id,
      zooter_id: zooter.id,
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

  info(`Seed complete for ${maskEmail(env("ZOOT_SMOKE_CLIENT_EMAIL"))}, ${maskEmail(env("ZOOT_SMOKE_ADMIN_EMAIL"))}, and ${maskEmail(env("ZOOT_SMOKE_ZOOTER_EMAIL"))}.`);
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
    .select("id,user_id,zooter_id,status")
    .eq("notes", `${SMOKE_TAG}: accepted-job destination and sensitive-access fixture`)
    .maybeSingle();
  assertNoError("read smoke booking", error);
  expect(booking?.id, "Smoke booking fixture is missing. Run --seed first.");

  const { data: zooter, error: zooterError } = await service
    .from("zooters")
    .select("id,user_id")
    .eq("id", booking.zooter_id)
    .maybeSingle();
  assertNoError("read smoke zooter", zooterError);
  expect(zooter?.user_id, "Smoke zooter fixture is missing a user_id.");

  return { booking, zooter };
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

  return `zoot:e2ee:v1:${payload}`;
};

const testBookingChatActionLayer = async ({ booking, client, zooter, admin }) => {
  const encryptedBody = makeSmokeEnvelope();
  const sendResult = await invoke(client, "send-booking-message", {
    booking_id: booking.id,
    encrypted_body: encryptedBody,
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

  const zooterRead = await zooter
    .from("messages")
    .select("id,booking_id,body,sender_type,moderation_state")
    .eq("id", message.id)
    .maybeSingle();
  assertNoError("zooter reads booking chat message", zooterRead.error);
  expect(zooterRead.data?.body === encryptedBody, "Assigned Zooter could not read the encrypted booking chat envelope.");

  const receiptResult = await invoke(zooter, "mark-booking-message-read", {
    booking_id: booking.id,
    message_ids: [message.id],
  });
  assertNoError("mark-booking-message-read", receiptResult.error);
  expect(receiptResult.data?.data?.marked === 1, "mark-booking-message-read did not mark the smoke message.");

  const reportResult = await invoke(zooter, "report-booking-message", {
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

const waitForNotification = async (zooterClient) => {
  const started = Date.now();
  while (Date.now() - started <= NOTIFICATION_TIMEOUT_MS) {
    const { data, error } = await zooterClient
      .from("notifications")
      .select("id,kind,title,link")
      .eq("kind", "sensitive_access_available")
      .limit(10);
    assertNoError("read zooter notifications", error);
    if ((data ?? []).some((item) => item.kind === "sensitive_access_available" && item.link === "/zooter/jobs")) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  return false;
};

const test = async () => {
  const { booking } = await getFixture();
  const client = await signIn(env("ZOOT_SMOKE_CLIENT_EMAIL"), env("ZOOT_SMOKE_CLIENT_PASSWORD"));
  const admin = await signIn(env("ZOOT_SMOKE_ADMIN_EMAIL"), env("ZOOT_SMOKE_ADMIN_PASSWORD"));
  const zooter = await signIn(env("ZOOT_SMOKE_ZOOTER_EMAIL"), env("ZOOT_SMOKE_ZOOTER_PASSWORD"));

  const clientControls = await client.from("operational_controls").select("control_key").limit(1);
  expect(clientControls.error || (clientControls.data ?? []).length === 0, "Client user can read admin-only operational controls.");

  const adminControls = await admin.from("operational_controls").select("control_key").limit(1);
  assertNoError("admin operational controls read", adminControls.error);
  expect((adminControls.data ?? []).length > 0, "Admin user could not read operational controls.");

  const clientJobs = await invoke(client, "get-zooter-job-cards");
  expect(clientJobs.error || (clientJobs.data?.data?.jobs ?? []).length === 0, "Client user received Zooter job cards.");

  const zooterJobs = await invoke(zooter, "get-zooter-job-cards");
  assertNoError("zooter job cards function", zooterJobs.error);
  const jobs = zooterJobs.data?.data?.jobs ?? [];
  const smokeJob = jobs.find((job) => job.booking_id === booking.id);
  expect(smokeJob, "Zooter did not receive the accepted smoke job card.");
  expect(smokeJob.state === "accepted", "Smoke job card is not accepted.");
  expect(Boolean(smokeJob.destination_address), "Accepted smoke job did not expose destination_address to the assigned Zooter.");

  const clientSensitive = await invoke(client, "get-sensitive-access", { booking_id: booking.id, field: "gate_code" });
  expect(clientSensitive.error || clientSensitive.data?.success === false, "Client user could reveal Zooter-only sensitive access.");

  const zooterSensitive = await invoke(zooter, "get-sensitive-access", { booking_id: booking.id, field: "gate_code" });
  assertNoError("zooter sensitive access function", zooterSensitive.error);
  expect(zooterSensitive.data?.data?.expires_in_seconds === 30, "Zooter sensitive reveal did not return the 30-second reveal contract.");
  expect(typeof zooterSensitive.data?.data?.value === "string" && zooterSensitive.data.data.value.length > 0, "Zooter sensitive reveal returned an empty value.");

  const hasNotification = await waitForNotification(zooter);
  expect(hasNotification, "Zooter did not receive a sensitive_access_available notification within the polling window.");

  await testBookingChatActionLayer({ booking, client, zooter, admin });

  info("Role smoke tests passed: client/admin/Zooter auth, accepted destination, sensitive reveal, notification delivery, and booking chat action layer.");
};

if (mode === "seed" || mode === "all") {
  await seed();
}

if (mode === "test" || mode === "all") {
  await test();
}
