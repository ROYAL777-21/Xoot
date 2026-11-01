import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createScanHandler } from "./handler.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const apiKey = Deno.env.get("CLOUDMERSIVE_API_KEY") ?? "";
const store = createClient(supabaseUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
Deno.serve(createScanHandler({supabaseUrl,serviceKey,apiKey},store));
