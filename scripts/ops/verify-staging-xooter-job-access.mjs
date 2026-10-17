#!/usr/bin/env node
/**
 * Read-only live JWT/role smoke for staged get-xooter-job-cards.
 * Does not seed accounts, accept jobs, read household access, or print PII.
 * Requires existing, reviewed staging-only credentials.
 */
import { createClient } from '@supabase/supabase-js';

const STAGING_REF = 'fxmxyabdjqviqbcxmvlp';
const env = name => String(process.env[name] ?? '').trim();
const required = [
  'XOOT_STAGING_SUPABASE_PUBLISHABLE_KEY',
  'XOOT_SMOKE_XOOTER_EMAIL', 'XOOT_SMOKE_XOOTER_PASSWORD',
  'XOOT_SMOKE_CLIENT_EMAIL', 'XOOT_SMOKE_CLIENT_PASSWORD',
];
const missing = required.filter(name => !env(name));
if (missing.length) {
  console.error('FAIL: Missing staging-only credential settings: ' + missing.join(', '));
  process.exit(2);
}
const url = env('XOOT_STAGING_SUPABASE_URL') || `https://${STAGING_REF}.supabase.co`;
if (new URL(url).hostname !== `${STAGING_REF}.supabase.co`) {
  console.error('FAIL: refusing to test any non-staging project');
  process.exit(2);
}
if (env('XOOT_SMOKE_XOOTER_EMAIL').toLowerCase() === env('XOOT_SMOKE_CLIENT_EMAIL').toLowerCase()) {
  console.error('FAIL: Xooter and customer smoke accounts must be different');
  process.exit(2);
}
const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const connect = () => createClient(url, env('XOOT_STAGING_SUPABASE_PUBLISHABLE_KEY'), options);
const signIn = async (emailName, passwordName, roleLabel) => {
  const client = connect();
  const { data, error } = await client.auth.signInWithPassword({
    email: env(emailName), password: env(passwordName),
  });
  if (error || !data?.user?.id) throw new Error(`${roleLabel} staging login failed; check credentials privately`);
  return { client, user: data.user };
};

try {
  const xooter = await signIn('XOOT_SMOKE_XOOTER_EMAIL', 'XOOT_SMOKE_XOOTER_PASSWORD', 'Xooter');
  const { data: profile, error: profileError } = await xooter.client.from('xooters')
    .select('id,user_id,active,background_check_status')
    .eq('user_id', xooter.user.id).maybeSingle();
  if (profileError || profile?.user_id !== xooter.user.id || !profile?.active ||
      profile.background_check_status !== 'approved') {
    throw new Error('Xooter fixture is not active and approved; reseed through the authorised staging-only smoke setup, not by relaxing live eligibility');
  }

  const { data: jobs, error: jobError } = await xooter.client.functions.invoke('get-xooter-job-cards', { body: {} });
  if (jobError || jobs?.success !== true || !Array.isArray(jobs?.data?.jobs)) {
    throw new Error('Approved Xooter did not receive a verified successful job-card envelope');
  }
  if (jobs.data.jobs.some(job => job?.xooter_id !== profile.id)) {
    throw new Error('Approved Xooter received another worker’s job card');
  }
  console.log('PASS: approved active staging Xooter JWT receives only own job-card rows');

  const customer = await signIn('XOOT_SMOKE_CLIENT_EMAIL', 'XOOT_SMOKE_CLIENT_PASSWORD', 'Customer');
  const { data: clientJobs, error: clientError } = await customer.client.functions.invoke('get-xooter-job-cards', { body: {} });
  const denied = clientError && [401, 403].includes(clientError.context?.status);
  const empty = !clientError && clientJobs?.success === true &&
    Array.isArray(clientJobs?.data?.jobs) && clientJobs.data.jobs.length === 0;
  if (!denied && !empty) throw new Error('A customer could access Xooter job cards');
  console.log('PASS: staging customer JWT is denied Xooter job-card access');
} catch (error) {
  console.error('FAIL: ' + (error instanceof Error ? error.message : 'Staging role check failed'));
  process.exitCode = 1;
}
