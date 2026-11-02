import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createScanHandler } from "./handler.ts";
import { stagingScannerFetch } from "./store-transport.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const apiKey = Deno.env.get("CLOUDMERSIVE_API_KEY") ?? "";
// The SAME presented credential must pass the database role/ACL probe and every later RPC.
// Never probe through a pre-authorised runtime client or trust decoded role claims.
const storeForCredential = (key: string) => createClient(supabaseUrl,key,{
  global:{headers:{Authorization:`Bearer ${key}`},fetch:stagingScannerFetch()},
  auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
});
Deno.serve(createScanHandler({supabaseUrl,apiKey},storeForCredential));
