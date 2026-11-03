import { createClient } from "https://esm.sh/@supabase/supabase-js@2.108.1";
import { createEvaluationHandler } from "./handler.ts";
import { stagingEvaluationFetch } from "./store-transport.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
// The presented credential is authenticated by PostgREST; no runtime service-key fallback.
const storeForCredential = (key: string) => createClient(supabaseUrl, key, {
  global: { headers: { Authorization: `Bearer ${key}` }, fetch: stagingEvaluationFetch() },
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
Deno.serve(createEvaluationHandler({ supabaseUrl, apiKey: Deno.env.get("GEOAPIFY_API_KEY") ?? "" }, storeForCredential));
