import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.1';
import { getCustomerAllowedOrigins } from './origins.ts';
import { createCustomerCommunicationsHandler } from './handler.ts';
const url = Deno.env.get('SUPABASE_URL')!;
const key = Deno.env.get('SUPABASE_ANON_KEY')!;
const databaseFetch: typeof fetch = (input, init) => {
  const target = new URL(input instanceof Request ? input.url : String(input));
  if (target.origin !== new URL(url).origin || target.username || target.password) throw Error('Database target refused');
  const signal = init?.signal ?? (input instanceof Request ? input.signal : null);
  const deadline = AbortSignal.timeout(15_000);
  return fetch(input, { ...init, redirect: 'error', signal: signal ? AbortSignal.any([signal, deadline]) : deadline });
};
Deno.serve(createCustomerCommunicationsHandler(getCustomerAllowedOrigins(Deno.env.get('ALLOWED_ORIGINS'), url), bearer => {
  const client = createClient(url, key, { global: { headers: { Authorization: bearer }, fetch: databaseFetch },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  return (name, args) => client.rpc(name, args);
}));
